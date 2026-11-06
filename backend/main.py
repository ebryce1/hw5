"""FastAPI backend for the Campus Customs dashboard.

Run from this folder:  uvicorn main:app --reload --port 8000   (serves http://localhost:8000)

Every shop fact the routes return comes from the MCP server (the backend is an MCP client), so the
rules enforced there (no negative cash, no payment without human approval, ...) apply to the
dashboard too. The only file operation here is the reset, which copies the untouched original
database over the working copy.

Agents only PREPARE payments and purchase orders. POST /api/approvals/{id}/approve is the one
route that records a human's approval and then makes the payment (cash changes here, not in an
agent loop).
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from pydantic import BaseModel, Field
from pydantic_ai.exceptions import ModelHTTPError, UsageLimitExceeded

import config
import team
from audit import _now, append_audit
from models import AuditEntry

mcp_client: Client | None = None
_run_lock = asyncio.Lock()  # one agent run at a time: tickets share cash, so runs must not overlap
_running_ticket: int | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open one MCP connection (stdio subprocess of mcp_server/server.py on the working database)."""
    global mcp_client
    config.load_env()
    transport = StdioTransport(
        command=sys.executable,
        args=[str(config.MCP_SERVER_PATH)],
        env={**os.environ, "CC_DB_PATH": str(config.WORKING_DB)},
    )
    mcp_client = Client(transport)
    async with mcp_client:
        yield
    mcp_client = None


app = FastAPI(title="Campus Customs Operations API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # the Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)


async def mcp(tool: str, **args) -> dict:
    """Call one MCP tool and return its dict result."""
    assert mcp_client is not None, "MCP connection is not open"
    result = await mcp_client.call_tool(tool, args)
    return result.data


def _audit_human(action: str, inputs: dict) -> None:
    """People acting through the dashboard go in the same audit trail as the agents."""
    append_audit(AuditEntry(timestamp=_now(), run_id=uuid4().hex[:12], event="human_action",
                            agent="human", inputs={"action": action, **inputs}))


class Decision(BaseModel):
    approver: str = Field(min_length=1, description="Name of the person clicking the button")


# --- 1. tickets -------------------------------------------------------------------------------


@app.get("/api/tickets")
async def get_tickets() -> dict:
    """All tickets, each with status and state ('open' or 'resolved'), plus which one is running."""
    data = await mcp("list_tickets")
    return {"today": data["today"], "running_ticket": _running_ticket, "tickets": data["tickets"]}


# --- 2. run the agent team on one ticket -------------------------------------------------------


@app.post("/api/tickets/{ticket_id}/run")
async def run_ticket(ticket_id: int) -> dict:
    """Run the agent team (boss first) on one ticket and return the boss's final decision.
    Takes a while (the agents make several model calls). Only one run at a time."""
    global _running_ticket
    ticket = await mcp("get_ticket", ticket_id=ticket_id)
    if not ticket.get("found"):
        raise HTTPException(404, f"Ticket {ticket_id} not found")
    if ticket["status"] == "resolved":
        raise HTTPException(409, f"Ticket {ticket_id} is already resolved")
    if _run_lock.locked():
        raise HTTPException(409, f"The team is busy with ticket {_running_ticket}; try again when it finishes")
    async with _run_lock:
        _running_ticket = ticket_id
        try:
            decision = await team.run_ticket(ticket_id)
        except UsageLimitExceeded as exc:
            raise HTTPException(422, f"Stopped by a usage limit: {exc}")
        except RuntimeError as exc:  # e.g. PORTKEY_API_KEY missing
            raise HTTPException(503, str(exc))
        except ModelHTTPError as exc:
            raise HTTPException(502, f"The model gateway returned an error: {exc}")
        finally:
            _running_ticket = None
    return {"ticket_id": ticket_id, "decision": decision.model_dump()}


@app.post("/api/tickets/{ticket_id}/resolve")
async def resolve_ticket(ticket_id: int, body: Decision) -> dict:
    """A human closes a ticket. Refused while any approval for it is still pending or approved-unpaid."""
    ticket = await mcp("get_ticket", ticket_id=ticket_id)
    if not ticket.get("found"):
        raise HTTPException(404, f"Ticket {ticket_id} not found")
    if _running_ticket == ticket_id:
        raise HTTPException(409, "The team is still working on this ticket")
    open_requests = [a for a in (await mcp("list_approvals"))["approvals"]
                     if a["ticket_id"] == ticket_id and a["status"] in ("pending", "approved")]
    if open_requests:
        raise HTTPException(409, f"Approval {open_requests[0]['id']} for this ticket is still open")
    await mcp("update_ticket", ticket_id=ticket_id, status="resolved",
              resolution_note=f"Closed by {body.approver}.", updated_by=body.approver)
    _audit_human("resolve", {"ticket_id": ticket_id, "approver": body.approver})
    return {"ticket_id": ticket_id, "status": "resolved"}


# --- 3. recent agent events ----------------------------------------------------------------------


def _event(r: dict) -> dict | None:
    """Turn one audit record into a dashboard event: who, what they said, which tools they used."""
    kind = r["event"]
    base = {"timestamp": r["timestamp"], "run_id": r["run_id"], "agent": r.get("agent"),
            "ticket_id": r.get("ticket_id"), "depth": r.get("depth"), "parent_run_id": r.get("parent_run_id")}
    if kind == "run_start":
        inputs = r.get("inputs") or {}
        return {**base, "kind": "started", "said": inputs.get("task") or inputs.get("action"),
                "asked_by": inputs.get("asked_by"), "tools": []}
    if kind == "iteration":
        calls = [c for c in r.get("tool_calls", []) if c["tool_name"] != "final_result"]
        if not calls:
            return None
        return {**base, "kind": "tools", "said": None, "iteration": r.get("iteration"),
                "tools": [{"name": c["tool_name"], "args": c.get("args", {}), "status": c.get("status"),
                           "result": c.get("result_summary")} for c in calls]}
    if kind == "run_end":
        return {**base, "kind": "finished", "said": r.get("output_summary") or r.get("error"),
                "stop_reason": r.get("stop_reason"), "tokens_in": r.get("tokens_in"), "tools": []}
    if kind == "human_action":
        return {**base, "kind": "human", "said": json.dumps(r.get("inputs") or {}), "tools": []}
    return None


@app.get("/api/events")
async def get_events(
    limit: int = Query(50, ge=1, le=500),
    ticket_id: int | None = None,
    after: str | None = Query(None, description="only events with a timestamp after this ISO time"),
) -> dict:
    """Most recent agent events (oldest first), read from the append-only audit trail. Pass the last
    timestamp you saw as `after` to fetch only what is new when the board refreshes."""
    rows = []
    if config.AUDIT_PATH.is_file() and config.AUDIT_PATH.read_text().strip():
        rows = json.loads(config.AUDIT_PATH.read_text())
    events = [e for e in map(_event, rows) if e]
    if ticket_id is not None:
        events = [e for e in events if e["ticket_id"] == ticket_id]
    if after:
        events = [e for e in events if e["timestamp"] > after]
    return {"events": events[-limit:]}


# --- 4. human approval: this is what actually moves cash -----------------------------------------


@app.get("/api/approvals")
async def get_approvals(status: str | None = None) -> dict:
    """Payment and purchase-order requests the agents prepared (pending, approved, rejected, paid)."""
    return await mcp("list_approvals", **({"status": status} if status else {}))


@app.post("/api/approvals/{approval_id}/approve")
async def approve(approval_id: int, body: Decision) -> dict:
    """A human approved: record the approval, then make the payment. Refused (no money moves) if
    cash is short, so a balance can never go negative."""
    rec = await mcp("record_human_approval", approval_id=approval_id, decision="approved", approver=body.approver)
    if not rec.get("ok"):
        raise HTTPException(409, rec["error"])
    _audit_human("approve", {"approval_id": approval_id, "approver": body.approver})
    paid = await mcp("execute_approved_payment", approval_id=approval_id)
    if not paid.get("ok"):
        # approved but not paid (e.g. not enough cash): the approval stays on record, cash is unchanged
        raise HTTPException(409, f"Approved, but not paid: {paid['error']}")
    return {"approval_id": approval_id, "status": "paid", "paid": paid["paid"],
            "new_balance": paid["new_balance"], "approved_by": paid["approved_by"]}


@app.post("/api/approvals/{approval_id}/reject")
async def reject(approval_id: int, body: Decision) -> dict:
    """A human rejected the request. Nothing is paid; a rejected purchase order is cancelled."""
    rec = await mcp("record_human_approval", approval_id=approval_id, decision="rejected", approver=body.approver)
    if not rec.get("ok"):
        raise HTTPException(409, rec["error"])
    _audit_human("reject", {"approval_id": approval_id, "approver": body.approver})
    return {"approval_id": approval_id, "status": "rejected", "decided_by": body.approver}


# --- 5. cash ----------------------------------------------------------------------------------------


@app.get("/api/cash")
async def get_cash() -> dict:
    """Current checking balance from cash_accounts, plus how much is reserved by open requests."""
    data = await mcp("get_cash_position", account="checking")
    if not data.get("found"):
        raise HTTPException(404, "checking account not found")
    return data


# --- 6. reset ---------------------------------------------------------------------------------------


@app.post("/api/reset")
async def reset() -> dict:
    """Restore the working database from the untouched original: tickets, cash, invoices, approvals
    and drafts all go back to the starting values. The audit trail is NOT wiped."""
    if _run_lock.locked():
        raise HTTPException(409, f"The team is busy with ticket {_running_ticket}; reset after it finishes")
    team.reset_database()
    _audit_human("reset", {})
    cash = await mcp("get_cash_position", account="checking")
    return {"reset": True, "balance": cash["balance"]}
