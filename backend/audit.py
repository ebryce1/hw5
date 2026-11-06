"""Append-only audit trail for every agent-loop step (output/audit_trail.json).

The file is never wiped: append_audit() reads what is there, adds one record, and writes the whole
list back with an atomic rename, so a crash cannot corrupt earlier records and a new run never
starts the file over. run_with_audit() drives an agent step by step so each loop iteration (the
tool calls the model asked for, and what came back) is written down as it happens.
"""
from __future__ import annotations

import json
import os
import threading
from datetime import datetime, timezone
from typing import Any

from pydantic_ai import Agent, UsageLimits
from pydantic_ai.messages import RetryPromptPart, ToolCallPart, ToolReturnPart
from pydantic_ai.usage import RunUsage

from config import AUDIT_PATH, SAID_CHARS, SUMMARY_CHARS
from models import AuditEntry, TeamDeps, ToolCallRecord

_write_lock = threading.Lock()


def _short(value: Any) -> str:
    if isinstance(value, str):
        text = value
    elif hasattr(value, "model_dump_json"):
        text = value.model_dump_json()
    else:
        text = json.dumps(value, default=str)
    return text if len(text) <= SUMMARY_CHARS else text[:SUMMARY_CHARS] + "..."


def _said(output: Any) -> str:
    """What the agent said, in plain words (not a JSON dump), for the dashboard's event feed."""
    parts = []
    if hasattr(output, "decision"):  # BossDecision
        parts = [output.decision, output.reasoning]
    elif hasattr(output, "recommendation"):  # AgentReport
        parts = [output.summary, "Next: " + output.recommendation]
        if getattr(output, "blockers", None):
            parts.append("Blockers: " + "; ".join(output.blockers))
    elif hasattr(output, "reasoning"):  # BoardPlan
        parts = [f"Order {output.order}.", output.reasoning]
    text = " ".join(p for p in parts if p) or _short(output)
    return text if len(text) <= SAID_CHARS else text[:SAID_CHARS] + "..."


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds")


def append_audit(entry: AuditEntry) -> None:
    """Add one record without losing what is already in the file."""
    with _write_lock:
        rows: list = []
        if AUDIT_PATH.is_file() and AUDIT_PATH.read_text().strip():
            rows = json.loads(AUDIT_PATH.read_text())
        rows.append(entry.model_dump(mode="json", exclude_none=True))
        AUDIT_PATH.parent.mkdir(parents=True, exist_ok=True)
        tmp = AUDIT_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(rows, indent=2) + "\n")
        os.replace(tmp, AUDIT_PATH)


async def run_with_audit(
    agent: Agent,
    prompt: str,
    deps: TeamDeps,
    usage: RunUsage,
    limits: UsageLimits,
    inputs: dict,
    parent_run_id: str | None = None,
):
    """Run one agent loop, recording run_start, one `iteration` per loop step, and run_end.

    `usage` is shared by every agent working the same ticket, so `limits` applies to the whole
    team, not to one agent. Re-raises whatever the run raises, after logging run_end(error).
    """
    base = dict(run_id=deps.run_id, agent=deps.agent_name, ticket_id=deps.ticket_id)
    append_audit(AuditEntry(timestamp=_now(), event="run_start", parent_run_id=parent_run_id,
                            depth=deps.depth, inputs=inputs, **base))
    start_in, start_out = usage.input_tokens, usage.output_tokens
    step = 0
    pending: AuditEntry | None = None
    pending_ids: list[str] = []

    def flush() -> None:
        nonlocal pending
        if pending is not None:
            pending.timestamp = _now()
            append_audit(pending)
            pending = None

    try:
        async with agent.iter(prompt, deps=deps, usage=usage, usage_limits=limits) as run:
            async for node in run:
                if Agent.is_call_tools_node(node):
                    flush()
                    step += 1
                    resp = node.model_response
                    calls = [p for p in resp.parts if isinstance(p, ToolCallPart)]
                    pending_ids = [c.tool_call_id for c in calls]
                    pending = AuditEntry(
                        timestamp=_now(), event="iteration", iteration=step, model=resp.model_name,
                        tool_calls=[ToolCallRecord(tool_name=c.tool_name, args=c.args_as_dict() or {}) for c in calls],
                        stop_reason=resp.finish_reason, **base,
                    )
                elif Agent.is_model_request_node(node) and pending is not None:
                    by_id: dict[str, tuple[str, str]] = {}
                    for part in node.request.parts:
                        if isinstance(part, ToolReturnPart):
                            by_id[part.tool_call_id] = ("ok", _short(part.content))
                        elif isinstance(part, RetryPromptPart) and part.tool_call_id:
                            by_id[part.tool_call_id] = ("retry", _short(part.content))
                    for rec, call_id in zip(pending.tool_calls, pending_ids):
                        if call_id in by_id:
                            rec.status, rec.result_summary = by_id[call_id]
                    flush()
            result = run.result
        if pending is not None:
            for rec in pending.tool_calls:
                rec.status, rec.result_summary = "ok", "returned as the final report"
            flush()
        append_audit(AuditEntry(
            timestamp=_now(), event="run_end", stop_reason="completed", output_summary=_said(result.output),
            tokens_in=usage.input_tokens - start_in, tokens_out=usage.output_tokens - start_out, **base))
        return result
    except Exception as exc:
        flush()
        append_audit(AuditEntry(
            timestamp=_now(), event="run_end", stop_reason="error",
            error=_short(f"{type(exc).__name__}: {exc}"), **base))
        raise
