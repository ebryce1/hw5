"""Campus Customs MCP server.

Every agent in the multi-agent team reaches the shop through the tools in this file. All data
comes from the working database data/campus_customs_new.db. Nothing is invented: a missing row
returns found=False. "Today" is always desk.date_today, never the system clock.

Money rules enforced here in code (not left to the model):
  * Nothing is paid without a human approval row (record_human_approval, human-only).
  * execute_approved_payment refuses if cash is short: balances never go negative.
  * Cash only goes out. No revenue is modeled.
  * A vendor with an open unpaid invoice cannot receive a new purchase order.
  * Messages are drafts stored in the drafts table. Nothing is emailed or sent anywhere.

Run (stdio):  python server.py
"""

from __future__ import annotations

import calendar
import os
import sqlite3
from datetime import date
from pathlib import Path

from fastmcp import FastMCP

HERE = Path(__file__).resolve().parent
# CC_DB_PATH lets tests point at a scratch copy; by default the working copy is used.
DB_PATH = Path(os.environ.get("CC_DB_PATH") or HERE.parent / "data" / "campus_customs_new.db")

mcp = FastMCP("campus-customs")

TICKET_STATUSES = {"open", "in_progress", "waiting_on_approval", "blocked", "resolved"}
DRAFT_AUDIENCES = {"customer", "vendor", "landlord", "internal"}
MAX_ROWS = 25  # cap on any list result, to keep tool output (and tokens) small

# Tables the agents create on top of the original schema. They are created here, in the working
# copy only, so the original campus_customs.db stays byte-for-byte untouched and a reset (re-copy
# of the original) returns everything to the starting state.
EXTRA_SCHEMA = """
CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,            -- invoice | rent | purchase_order
    ref_id INTEGER NOT NULL,       -- invoice id, lease id, or purchase order id
    amount REAL NOT NULL,
    ticket_id INTEGER,
    requested_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',   -- pending | approved | rejected | paid
    decided_by TEXT,
    decided_at TEXT,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER NOT NULL,
    sku TEXT NOT NULL,
    size TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_cost REAL NOT NULL,
    total REAL NOT NULL,
    expected_arrival TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_approval',  -- pending_approval | ordered | cancelled
    ticket_id INTEGER,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    audience TEXT NOT NULL,        -- customer | vendor | landlord | internal
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    author TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',   -- always 'draft': nothing is ever sent
    created_at TEXT NOT NULL
);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(EXTRA_SCHEMA)
    return conn


def _today(conn: sqlite3.Connection) -> date:
    return date.fromisoformat(conn.execute("SELECT date_today FROM desk").fetchone()["date_today"])


def _rows(cur) -> list[dict]:
    return [dict(r) for r in cur.fetchmany(MAX_ROWS)]


def _balance(conn: sqlite3.Connection, account: str = "checking") -> float | None:
    row = conn.execute("SELECT balance FROM cash_accounts WHERE name = ?", (account,)).fetchone()
    return None if row is None else row["balance"]


def _pending_total(conn: sqlite3.Connection) -> float:
    return conn.execute(
        "SELECT COALESCE(SUM(amount), 0) AS t FROM approvals WHERE status IN ('pending','approved')"
    ).fetchone()["t"]


def _add_month(d: date) -> date:
    month = d.month % 12 + 1
    year = d.year + (1 if d.month == 12 else 0)
    return date(year, month, min(d.day, calendar.monthrange(year, month)[1]))


# ---------------------------------------------------------------------------------------------
# READ tools
# ---------------------------------------------------------------------------------------------


@mcp.tool
def list_tickets() -> dict:
    """List every ticket on the board with its status and a simple state: 'open' (any status except
    resolved) or 'resolved'. Reads the tickets table plus desk.date_today."""
    with _connect() as conn:
        rows = _rows(
            conn.execute(
                "SELECT id, type, requester, subject, sku, size, qty, status, notes, created_at FROM tickets ORDER BY id"
            )
        )
        for r in rows:
            r["state"] = "resolved" if r["status"] == "resolved" else "open"
        return {"today": _today(conn).isoformat(), "tickets": rows}


@mcp.tool
def list_open_tickets() -> dict:
    """List every ticket on the board that is not resolved (id, type, requester, subject, status).

    Reads the tickets table plus desk.date_today. Use get_ticket for the full detail of one.
    """
    with _connect() as conn:
        rows = _rows(
            conn.execute(
                "SELECT id, type, requester, subject, status, created_at FROM tickets "
                "WHERE status != 'resolved' ORDER BY id"
            )
        )
        return {"today": _today(conn).isoformat(), "tickets": rows}


@mcp.tool
def get_ticket(ticket_id: int) -> dict:
    """Get one ticket in full: type, requester, subject, sku, size, qty, lease_id, invoice_id,
    status and notes. Reads the tickets table."""
    with _connect() as conn:
        row = conn.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return {"found": False, "ticket_id": ticket_id}
        return {"found": True, **dict(row), "today": _today(conn).isoformat()}


@mcp.tool
def check_stock(sku: str, size: str) -> dict:
    """Look up how many units of one SKU in one size are on the shelf.

    Reads the inventory table (and pricing for unit cost / list price). Returns qty,
    location, and unit_cost so a caller can size a restock. If the sku/size pair is not
    in the database, returns found=False instead of guessing.
    """
    with _connect() as conn:
        row = conn.execute(
            "SELECT i.sku, i.name, i.size, i.qty, i.location, p.unit_cost, p.list_price "
            "FROM inventory i LEFT JOIN pricing p ON p.sku = i.sku "
            "WHERE i.sku = ? AND i.size = ?",
            (sku, size),
        ).fetchone()
    if row is None:
        return {"found": False, "sku": sku, "size": size}
    return {"found": True, **dict(row), "in_stock": row["qty"] > 0}


@mcp.tool
def list_inventory(sku: str | None = None) -> dict:
    """List stock by size for one SKU, or for every SKU when sku is omitted. Reads inventory."""
    with _connect() as conn:
        if sku:
            cur = conn.execute("SELECT * FROM inventory WHERE sku = ? ORDER BY size", (sku,))
        else:
            cur = conn.execute("SELECT * FROM inventory ORDER BY sku, size")
        return {"items": _rows(cur)}


@mcp.tool
def get_pricing(sku: str) -> dict:
    """Unit cost, list price and the margin at list price for one SKU. Reads the pricing table."""
    with _connect() as conn:
        row = conn.execute("SELECT * FROM pricing WHERE sku = ?", (sku,)).fetchone()
    if row is None:
        return {"found": False, "sku": sku}
    margin = (row["list_price"] - row["unit_cost"]) / row["list_price"]
    return {"found": True, **dict(row), "margin_at_list_pct": round(margin * 100, 1)}


@mcp.tool
def check_margin(sku: str, proposed_unit_price: float, qty: int = 1) -> dict:
    """Check the margin on a proposed (discounted) selling price before anyone agrees to it.

    Reads the pricing table. Returns the discount off list price, profit per unit and in total,
    and margin percent. A price at or below unit cost is a loss (is_loss=True).
    """
    with _connect() as conn:
        row = conn.execute("SELECT * FROM pricing WHERE sku = ?", (sku,)).fetchone()
    if row is None:
        return {"found": False, "sku": sku}
    profit = proposed_unit_price - row["unit_cost"]
    return {
        "found": True,
        "sku": sku,
        "unit_cost": row["unit_cost"],
        "list_price": row["list_price"],
        "proposed_unit_price": proposed_unit_price,
        "discount_pct": round((1 - proposed_unit_price / row["list_price"]) * 100, 1),
        "profit_per_unit": round(profit, 2),
        "total_profit": round(profit * qty, 2),
        "margin_pct": round(profit / proposed_unit_price * 100, 1) if proposed_unit_price else None,
        "is_loss": profit <= 0,
    }


@mcp.tool
def list_vendors() -> dict:
    """List every vendor with specialty, lead time, and whether they will ship a new order.

    Reads vendors and invoices. A vendor with any open invoice will not ship new product
    (can_ship_new_orders=False); the open invoice ids and total owed are included.
    """
    with _connect() as conn:
        today = _today(conn)
        out = []
        for v in conn.execute("SELECT * FROM vendors ORDER BY id").fetchall():
            inv = conn.execute(
                "SELECT id, amount, due_date FROM invoices WHERE vendor_id = ? AND status = 'open'",
                (v["id"],),
            ).fetchall()
            out.append(
                {
                    **dict(v),
                    "open_invoice_ids": [i["id"] for i in inv],
                    "open_invoice_total": round(sum(i["amount"] for i in inv), 2),
                    "overdue_invoice_ids": [
                        i["id"] for i in inv if date.fromisoformat(i["due_date"]) < today
                    ],
                    "can_ship_new_orders": len(inv) == 0,
                }
            )
        return {"today": today.isoformat(), "vendors": out}


@mcp.tool
def get_invoice_status(invoice_id: int) -> dict:
    """Look up one vendor invoice and whether it is overdue as of desk.date_today.

    Reads the invoices table joined to vendors. Returns amount, due_date, status, days
    overdue (0 if not overdue), and the vendor's name and lead_days. An invoice whose
    status is 'open' means that vendor will not ship a new product yet.
    """
    with _connect() as conn:
        today = _today(conn)
        row = conn.execute(
            "SELECT inv.id, inv.vendor_id, v.name AS vendor_name, v.specialty, v.lead_days, "
            "inv.amount, inv.due_date, inv.status, inv.description "
            "FROM invoices inv JOIN vendors v ON v.id = inv.vendor_id WHERE inv.id = ?",
            (invoice_id,),
        ).fetchone()
    if row is None:
        return {"found": False, "invoice_id": invoice_id}
    due = date.fromisoformat(row["due_date"])
    is_open = row["status"] == "open"
    days_overdue = max((today - due).days, 0) if is_open else 0
    return {
        "found": True,
        **dict(row),
        "today": today.isoformat(),
        "is_overdue": is_open and days_overdue > 0,
        "days_overdue": days_overdue,
        "vendor_blocks_new_orders": is_open,
    }


@mcp.tool
def list_invoices(status: str | None = None) -> dict:
    """List invoices, optionally only those with a given status ('open' or 'paid').

    Reads invoices joined to vendors, with days overdue as of desk.date_today."""
    with _connect() as conn:
        today = _today(conn)
        sql = (
            "SELECT inv.id, inv.vendor_id, v.name AS vendor_name, inv.amount, inv.due_date, "
            "inv.status, inv.description FROM invoices inv JOIN vendors v ON v.id = inv.vendor_id"
        )
        cur = conn.execute(sql + (" WHERE inv.status = ?" if status else "") + " ORDER BY inv.id",
                           (status,) if status else ())
        rows = _rows(cur)
    for r in rows:
        late = (today - date.fromisoformat(r["due_date"])).days
        r["days_overdue"] = max(late, 0) if r["status"] == "open" else 0
    return {"today": today.isoformat(), "invoices": rows}


@mcp.tool
def get_lease_status(lease_id: int) -> dict:
    """Look up one lease and how many days until its rent is due, as of desk.date_today.

    Reads the leases table. Returns space, landlord, monthly_rent, next_due, and
    days_until_due (negative means the rent is already late).
    """
    with _connect() as conn:
        today = _today(conn)
        row = conn.execute("SELECT * FROM leases WHERE id = ?", (lease_id,)).fetchone()
    if row is None:
        return {"found": False, "lease_id": lease_id}
    days = (date.fromisoformat(row["next_due"]) - today).days
    return {
        "found": True,
        **dict(row),
        "today": today.isoformat(),
        "days_until_due": days,
        "is_late": days < 0,
    }


@mcp.tool
def get_cash_position(account: str = "checking") -> dict:
    """Cash on hand and how much of it is already spoken for.

    Reads cash_accounts, approvals and payments. balance is real money in the account;
    reserved_by_open_requests is the sum of payment requests still pending or approved but not
    yet paid; available_after_requests is what is left if all of them go through.
    """
    with _connect() as conn:
        bal = _balance(conn, account)
        if bal is None:
            return {"found": False, "account": account}
        reserved = _pending_total(conn)
        paid = conn.execute("SELECT COALESCE(SUM(amount),0) AS t FROM payments").fetchone()["t"]
        return {
            "found": True,
            "account": account,
            "balance": bal,
            "reserved_by_open_requests": reserved,
            "available_after_requests": round(bal - reserved, 2),
            "paid_out_so_far": paid,
            "today": _today(conn).isoformat(),
        }


@mcp.tool
def list_approvals(status: str | None = None) -> dict:
    """List payment/purchase-order approval requests, optionally by status
    (pending, approved, rejected, paid). Reads the approvals table."""
    with _connect() as conn:
        cur = conn.execute(
            "SELECT * FROM approvals" + (" WHERE status = ?" if status else "") + " ORDER BY id",
            (status,) if status else (),
        )
        return {"approvals": _rows(cur)}


@mcp.tool
def list_purchase_orders(status: str | None = None) -> dict:
    """List restock purchase orders with their status (pending_approval, ordered, cancelled), vendor,
    sku, size, quantity, total, and expected arrival date. Reads the purchase_orders table. 'ordered'
    means a human approved it and it was paid, so the vendor has the order."""
    with _connect() as conn:
        cur = conn.execute(
            "SELECT po.*, v.name AS vendor_name FROM purchase_orders po JOIN vendors v ON v.id = po.vendor_id"
            + (" WHERE po.status = ?" if status else "") + " ORDER BY po.id",
            (status,) if status else (),
        )
        return {"purchase_orders": _rows(cur)}


@mcp.tool
def list_drafts(ticket_id: int | None = None) -> dict:
    """List drafted messages on the board (never sent), optionally for one ticket. Reads drafts."""
    with _connect() as conn:
        cur = conn.execute(
            "SELECT * FROM drafts" + (" WHERE ticket_id = ?" if ticket_id else "") + " ORDER BY id",
            (ticket_id,) if ticket_id else (),
        )
        return {"drafts": _rows(cur)}


# ---------------------------------------------------------------------------------------------
# WRITE tools
# ---------------------------------------------------------------------------------------------


@mcp.tool
def update_ticket(ticket_id: int, status: str, resolution_note: str, updated_by: str) -> dict:
    """Set a ticket's status and append a dated note saying what was decided and why.

    Writes the tickets table. status must be one of: open, in_progress, waiting_on_approval,
    blocked, resolved. The note is appended to the ticket's notes, never overwriting them.
    """
    if status not in TICKET_STATUSES:
        return {"ok": False, "error": f"status must be one of {sorted(TICKET_STATUSES)}"}
    with _connect() as conn:
        row = conn.execute("SELECT notes FROM tickets WHERE id = ?", (ticket_id,)).fetchone()
        if row is None:
            return {"ok": False, "error": f"ticket {ticket_id} not found"}
        stamp = _today(conn).isoformat()
        notes = (row["notes"] or "").rstrip()
        notes = f"{notes}\n[{stamp} {updated_by} -> {status}] {resolution_note}".strip()
        conn.execute("UPDATE tickets SET status = ?, notes = ? WHERE id = ?", (status, notes, ticket_id))
        conn.commit()
    return {"ok": True, "ticket_id": ticket_id, "status": status}


@mcp.tool
def create_draft_message(
    ticket_id: int, audience: str, recipient: str, subject: str, body: str, author: str
) -> dict:
    """Save a drafted message on the board. It is NEVER emailed or sent; a human sends it.

    Writes the drafts table. audience is one of: customer, vendor, landlord, internal.
    """
    if audience not in DRAFT_AUDIENCES:
        return {"ok": False, "error": f"audience must be one of {sorted(DRAFT_AUDIENCES)}"}
    with _connect() as conn:
        if conn.execute("SELECT 1 FROM tickets WHERE id = ?", (ticket_id,)).fetchone() is None:
            return {"ok": False, "error": f"ticket {ticket_id} not found"}
        cur = conn.execute(
            "INSERT INTO drafts (ticket_id, audience, recipient, subject, body, author, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (ticket_id, audience, recipient, subject, body, author, _today(conn).isoformat()),
        )
        conn.commit()
        return {"ok": True, "draft_id": cur.lastrowid, "status": "draft", "sent": False}


@mcp.tool
def request_payment_approval(kind: str, ref_id: int, ticket_id: int, requested_by: str, reason: str) -> dict:
    """Ask a human to approve paying an invoice or rent. Does NOT pay anything.

    kind is 'invoice' (ref_id = invoice id) or 'rent' (ref_id = lease id). The amount is read
    from the database (invoice amount or monthly rent), never supplied by the caller. Refuses
    if the invoice is already paid, a request for it is already open, or cash cannot cover it
    on top of the requests already open. Writes the approvals table.
    """
    if kind not in ("invoice", "rent"):
        return {"ok": False, "error": "kind must be 'invoice' or 'rent' (use create_purchase_order for POs)"}
    with _connect() as conn:
        if kind == "invoice":
            row = conn.execute("SELECT amount, status FROM invoices WHERE id = ?", (ref_id,)).fetchone()
            if row is None:
                return {"ok": False, "error": f"invoice {ref_id} not found"}
            if row["status"] != "open":
                return {"ok": False, "error": f"invoice {ref_id} is already {row['status']}"}
            amount = row["amount"]
        else:
            row = conn.execute("SELECT monthly_rent FROM leases WHERE id = ?", (ref_id,)).fetchone()
            if row is None:
                return {"ok": False, "error": f"lease {ref_id} not found"}
            amount = row["monthly_rent"]
        dup = conn.execute(
            "SELECT id FROM approvals WHERE kind = ? AND ref_id = ? AND status IN ('pending','approved')",
            (kind, ref_id),
        ).fetchone()
        if dup:
            return {"ok": False, "error": f"approval {dup['id']} already open for this {kind}"}
        bal = _balance(conn) or 0.0
        free = bal - _pending_total(conn)
        if amount > free:
            return {
                "ok": False,
                "error": f"not enough unreserved cash: need {amount}, have {round(free, 2)} "
                f"(balance {bal} minus open requests)",
            }
        cur = conn.execute(
            "INSERT INTO approvals (kind, ref_id, amount, ticket_id, requested_by, reason, created_at) "
            "VALUES (?,?,?,?,?,?,?)",
            (kind, ref_id, amount, ticket_id, requested_by, reason, _today(conn).isoformat()),
        )
        conn.commit()
        return {"ok": True, "approval_id": cur.lastrowid, "amount": amount, "status": "pending",
                "note": "A human must approve this before any money moves."}


@mcp.tool
def create_purchase_order(vendor_id: int, sku: str, size: str, qty: int, ticket_id: int, requested_by: str) -> dict:
    """Prepare a restock purchase order and queue it for human approval. Does NOT pay or order.

    Writes purchase_orders and approvals. Total = qty x pricing.unit_cost, expected arrival =
    desk.date_today + vendor lead_days. Refuses if the vendor has any open unpaid invoice (they
    will not ship), if the sku/size is unknown, or if cash cannot cover it on top of open requests.
    """
    if qty <= 0:
        return {"ok": False, "error": "qty must be positive"}
    with _connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if vendor is None:
            return {"ok": False, "error": f"vendor {vendor_id} not found"}
        open_inv = conn.execute(
            "SELECT id FROM invoices WHERE vendor_id = ? AND status = 'open'", (vendor_id,)
        ).fetchall()
        if open_inv:
            return {"ok": False, "error": f"{vendor['name']} has open unpaid invoice(s) "
                    f"{[i['id'] for i in open_inv]} and will not ship new product until paid"}
        if conn.execute("SELECT 1 FROM inventory WHERE sku = ? AND size = ?", (sku, size)).fetchone() is None:
            return {"ok": False, "error": f"{sku} size {size} is not in inventory"}
        price = conn.execute("SELECT unit_cost FROM pricing WHERE sku = ?", (sku,)).fetchone()
        if price is None:
            return {"ok": False, "error": f"no pricing for {sku}"}
        total = round(qty * price["unit_cost"], 2)
        free = (_balance(conn) or 0.0) - _pending_total(conn)
        if total > free:
            return {"ok": False, "error": f"not enough unreserved cash: need {total}, have {round(free, 2)}"}
        today = _today(conn)
        arrival = date.fromordinal(today.toordinal() + vendor["lead_days"]).isoformat()
        cur = conn.execute(
            "INSERT INTO purchase_orders (vendor_id, sku, size, qty, unit_cost, total, expected_arrival, "
            "ticket_id, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
            (vendor_id, sku, size, qty, price["unit_cost"], total, arrival, ticket_id, requested_by, today.isoformat()),
        )
        po_id = cur.lastrowid
        cur2 = conn.execute(
            "INSERT INTO approvals (kind, ref_id, amount, ticket_id, requested_by, reason, created_at) "
            "VALUES ('purchase_order',?,?,?,?,?,?)",
            (po_id, total, ticket_id, requested_by,
             f"Restock {qty} x {sku} {size} from {vendor['name']}", today.isoformat()),
        )
        conn.commit()
        return {"ok": True, "purchase_order_id": po_id, "approval_id": cur2.lastrowid, "total": total,
                "expected_arrival": arrival, "status": "pending_approval"}


@mcp.tool
def record_human_approval(approval_id: int, decision: str, approver: str) -> dict:
    """HUMAN-ONLY. Record a person's decision ('approved' or 'rejected') on an approval request.

    Writes the approvals table. This tool is deliberately NOT given to any agent: only the
    dashboard (a human clicking Approve/Reject) calls it. approver is that person's name.
    """
    if decision not in ("approved", "rejected"):
        return {"ok": False, "error": "decision must be 'approved' or 'rejected'"}
    if not approver.strip() or approver.strip().lower() in {
        "boss", "inventory", "accounting", "facilities", "customer_service", "agent", "system"}:
        return {"ok": False, "error": "approver must be a named human, not an agent"}
    with _connect() as conn:
        row = conn.execute("SELECT status FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if row is None:
            return {"ok": False, "error": f"approval {approval_id} not found"}
        if row["status"] != "pending":
            return {"ok": False, "error": f"approval {approval_id} is already {row['status']}"}
        conn.execute(
            "UPDATE approvals SET status = ?, decided_by = ?, decided_at = ? WHERE id = ?",
            (decision, approver.strip(), _today(conn).isoformat(), approval_id),
        )
        if decision == "rejected":
            conn.execute(
                "UPDATE purchase_orders SET status = 'cancelled' WHERE id = "
                "(SELECT ref_id FROM approvals WHERE id = ? AND kind = 'purchase_order')",
                (approval_id,),
            )
        conn.commit()
    return {"ok": True, "approval_id": approval_id, "status": decision, "decided_by": approver.strip()}


@mcp.tool
def execute_approved_payment(approval_id: int) -> dict:
    """Pay an approval that a human has approved. Refuses in every other case.

    Checks, in order: the approval exists, its status is 'approved' (so a named human signed
    off), and the account has enough cash (balances never go negative). On success it, in one
    transaction: subtracts the cash_accounts balance, inserts a payments row (approved_by is the
    human), and updates the related table: invoice -> status 'paid'; rent -> lease next_due moves
    forward one month; purchase_order -> status 'ordered'. The approval becomes 'paid'.
    """
    with _connect() as conn:
        ap = conn.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
        if ap is None:
            return {"ok": False, "error": f"approval {approval_id} not found"}
        if ap["status"] != "approved":
            return {"ok": False, "error": f"approval {approval_id} is '{ap['status']}', not approved by a human; "
                    "no payment made"}
        bal = _balance(conn)
        if bal is None or ap["amount"] > bal:
            return {"ok": False, "error": f"insufficient cash: need {ap['amount']}, balance {bal}; no payment made"}
        today = _today(conn).isoformat()
        try:
            conn.execute("BEGIN")
            conn.execute("UPDATE cash_accounts SET balance = balance - ?, date = ? WHERE name = 'checking'",
                         (ap["amount"], today))
            conn.execute(
                "INSERT INTO payments (kind, ref_id, amount, account, paid_at, approved_by) VALUES (?,?,?,?,?,?)",
                (ap["kind"], ap["ref_id"], ap["amount"], "checking", today, ap["decided_by"]),
            )
            if ap["kind"] == "invoice":
                conn.execute("UPDATE invoices SET status = 'paid' WHERE id = ?", (ap["ref_id"],))
            elif ap["kind"] == "rent":
                due = date.fromisoformat(conn.execute(
                    "SELECT next_due FROM leases WHERE id = ?", (ap["ref_id"],)).fetchone()["next_due"])
                conn.execute("UPDATE leases SET next_due = ? WHERE id = ?",
                             (_add_month(due).isoformat(), ap["ref_id"]))
            else:
                conn.execute("UPDATE purchase_orders SET status = 'ordered' WHERE id = ?", (ap["ref_id"],))
            conn.execute("UPDATE approvals SET status = 'paid' WHERE id = ?", (approval_id,))
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        return {"ok": True, "approval_id": approval_id, "paid": ap["amount"], "new_balance": _balance(conn),
                "approved_by": ap["decided_by"]}


if __name__ == "__main__":
    mcp.run(show_banner=False)
