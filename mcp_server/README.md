# Campus Customs MCP server

The MCP server is the one place the whole agent team (boss, inventory, accounting, facilities,
customer service) reads and changes shop data. Agents never touch the database directly; they call
these tools. It is built with FastMCP in [`server.py`](server.py).

## Database

It uses the **working copy** `data/campus_customs_new.db` (relative to the repo root). The original
`data/campus_customs.db` is never touched and is only used to reset the working copy. "Today" is
always `desk.date_today`. On first use the server adds three tables to the working copy only
(`approvals`, `purchase_orders`, `drafts`); a reset removes them again.

## Tools (15 read, 6 write)

Read tools
| Tool | Reads |
|---|---|
| `list_tickets()` | `tickets`, `desk` (used by the backend board) |
| `list_open_tickets()` | `tickets`, `desk` |
| `get_ticket(ticket_id)` | `tickets`, `desk` |
| `check_stock(sku, size)` | `inventory`, `pricing` |
| `list_inventory(sku?)` | `inventory` |
| `get_pricing(sku)` | `pricing` |
| `check_margin(sku, proposed_unit_price, qty)` | `pricing` |
| `list_vendors()` | `vendors`, `invoices`, `desk` |
| `get_invoice_status(invoice_id)` | `invoices`, `vendors`, `desk` |
| `list_invoices(status?)` | `invoices`, `vendors`, `desk` |
| `get_lease_status(lease_id)` | `leases`, `desk` |
| `get_cash_position(account?)` | `cash_accounts`, `approvals`, `payments`, `desk` |
| `list_approvals(status?)` | `approvals` |
| `list_purchase_orders(status?)` | `purchase_orders`, `vendors` |
| `list_drafts(ticket_id?)` | `drafts` |

Write tools
| Tool | Writes | Guardrail enforced in code |
|---|---|---|
| `update_ticket(ticket_id, status, resolution_note, updated_by)` | `tickets` | status must be a known value; note is appended, never overwritten |
| `create_draft_message(ticket_id, audience, recipient, subject, body, author)` | `drafts` | stored only; nothing is ever sent |
| `request_payment_approval(kind, ref_id, ticket_id, requested_by, reason)` | `approvals` | amount read from the database; refuses duplicates, paid invoices and unaffordable requests |
| `create_purchase_order(vendor_id, sku, size, qty, ticket_id, requested_by)` | `purchase_orders`, `approvals` | refuses if the vendor has an open unpaid invoice or cash cannot cover it |
| `record_human_approval(approval_id, decision, approver)` | `approvals` | **human-only**: not given to any agent; called by the backend's approve/reject routes; refuses agent names |
| `execute_approved_payment(approval_id)` | `cash_accounts`, `payments`, `invoices` / `leases` / `purchase_orders`, `approvals` | **not given to any agent**: called by the backend's approve route; refuses unless a human approved it and cash covers it (no negative balance) |

Every tool returns `found: false` or `ok: false` with a reason instead of guessing.

## Run

```bash
# from the project root, with the .venv from the main README active
python mcp_server/server.py
```
