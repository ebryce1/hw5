# Campus Customs Multi-Agent Operations: Harness

This file is the technical reference for the whole system: the database tables, the MCP tools, the
five agents, the API routes, the dashboard, the safety rules, and what happened when the team resolved
the three tickets (section 8). Run order: `backend/` (`uvicorn main:app --reload --port 8000`) and
`frontend/` (`npm run dev`), with `PORTKEY_API_KEY` in `.env`.

## 1. The database

Original: `data/campus_customs.db` (never modified; the reset source).
Working copy: `data/campus_customs_new.db` (a byte-identical copy made in Problem 2; the MCP
server and backend write here). Before a full ticket run the working copy is re-copied from
the original.

Nine tables. Row counts in the original: desk 1, inventory 10, pricing 4, vendors 3, leases 1,
cash_accounts 1, payments 0, invoices 1, tickets 3.

### desk
`date_today` (TEXT, ISO date), `notes` (TEXT).
Why it matters: `date_today` (2026-08-31) is "today" for the shop. Every overdue and days-until-due
calculation uses it, never the system clock.

### tickets
`id`, `type`, `requester`, `subject`, `sku`, `size`, `qty`, `lease_id`, `invoice_id`, `status`,
`notes`, `created_at`.
Why it matters: this is the board. Each ticket is the unit of work; `sku`/`size`/`qty`,
`lease_id` and `invoice_id` are the foreign keys that tell the boss which other tables to look at.

### inventory
`sku`, `name`, `size`, `qty`, `location` (primary key is `sku` + `size`).
Why it matters: stock is tracked per size, so the inventory agent must check the exact size a
ticket asks for, not just the product.

### pricing
`sku`, `unit_cost`, `list_price`.
Why it matters: cost vs. list price gives the margin accounting checks before approving a
discount, and unit cost sizes any restock purchase order.

### vendors
`id`, `name`, `specialty`, `lead_days`.
Why it matters: tells the inventory agent who can restock what and how long it takes; lead time
comes only from `lead_days`.

### leases
`id`, `space_name`, `landlord`, `monthly_rent`, `next_due`, `notes`.
Why it matters: facilities uses `next_due` against `desk.date_today` to know if rent is due or
late, and `monthly_rent` is the amount accounting must be able to cover.

### cash_accounts
`name`, `balance`, `date`.
Why it matters: the cash that constrains every payment. The pay tool must refuse when balance is
too low; no negative balances. Cash only goes out (no revenue is modeled).

### payments
`id`, `kind`, `ref_id`, `amount`, `account`, `paid_at`, `approved_by`.
Why it matters: the ledger of money actually paid. Empty at the start. Each approved payment adds
a row, and `approved_by` records the human who signed off.

### invoices
`id`, `vendor_id`, `amount`, `due_date`, `status`, `description`.
Why it matters: an open invoice with a vendor blocks that vendor from shipping new product, and
it is cash owed; paying one must flip `status` and write a `payments` row.

## 2. How the three open tickets link to the other tables

Today is **2026-08-31**. Cash: **$3,400.00** in `checking`.

| Ticket | Type | Links | What the data shows |
|---|---|---|---|
| 101 Bulldog tee (Tauhid Zaman) | customer_order | `sku` CC-TEE-WHITE, size S, `invoice_id` 501 | Stock for tee S is **0**. Restock would come from Bulldog Print Co (vendor 1, apparel reprint, 5-day lead). Invoice 501 ($840, due 2026-08-28) is **open and 3 days overdue** with that same vendor, so they will not ship until it is paid. Paying needs human approval and $840 of cash. |
| 102 Rent due (Elm City Properties) | rent_notice | `lease_id` 1 | Chapel Street shop rent is **$2,400**, due **2026-09-02**, two days away. Paying needs human approval and $2,400 of cash. |
| 103 Bulk hoodie discount (Yale AI Club) | price_override | `sku` CC-HOOD-NAVY, size M, qty 20 | Only **8** hoodies in M, so a shortfall of 12. List price $58, unit cost $22 (about 62% margin at list), so margin limits how deep a discount can go. Restock is apparel, so again vendor 1, again blocked by invoice 501. |

### Observations the agents will have to work through
- **The three tickets compete for the same cash.** $840 (invoice) + $2,400 (rent) = $3,240, which
  leaves only $160 of the $3,400. Restocking 12 hoodies at $22 cost is $264, which does not fit
  after both payments. Order and priority matter, and the boss makes that call.
- **Invoice 501 gates both restock paths** (tee S for ticket 101, hoodie M for ticket 103), so it
  is the key dependency.
- **No payment exists yet** (`payments` is empty). Nothing is paid until a human approves it.
- **`desk.date_today` is the only clock.** Invoice 501 is overdue and the lease is not yet due,
  both only relative to it.

## 3. MCP server (Problem 3)

Code: `mcp_server/server.py` (FastMCP). Database: `data/campus_customs_new.db`. Every agent
uses only these tools. Nothing is invented: a missing row returns `found: false`. Dates are
computed against `desk.date_today`. More tools are added in later problems.

| Tool | Reads | Unlocks ticket | Why it is the right tool |
|---|---|---|---|
| `check_stock(sku, size)` | `inventory` (+ `pricing` for unit cost) | **101** (and 103) | Ticket 101 asks for CC-TEE-WHITE size S; this returns qty 0, which is what proves the order cannot ship from the shelf and gives the $8 unit cost for a reprint. For 103 it returns 8 of hoodie M against 20 wanted, so the 12-unit shortfall is read from the database. |
| `get_invoice_status(invoice_id)` | `invoices` + `vendors` + `desk` | **101** | Ticket 101 links to invoice 501. This returns $840, due 2026-08-28, 3 days overdue, from Bulldog Print Co (5-day lead), so the agents learn the only restock vendor will not ship until it is paid and a human-approved payment is needed first. |
| `get_lease_status(lease_id)` | `leases` + `desk` | **102** | Ticket 102 is a rent notice for lease 1. This returns $2,400 due 2026-09-02, so `days_until_due` = 2 confirms the landlord's email against the database and gives facilities the exact amount to hand to accounting. |

### Connecting the MCP server (Problem 4)
`.mcp.json` at the project root registers the server as `campus-customs` (stdio,
`./.venv/bin/python mcp_server/server.py`). With the vibe coder connected, each of the three
tools was called and its output checked against `data/campus_customs_new.db`. The prompts, tool
names and outputs are saved in `output/mcp_smoke.json`.

## 4. The agent team (Problem 5)

Built with PydanticAI. Code: `backend/agents/` (one file per role), `backend/team.py` (registry
and entry points), `backend/models.py` (data types), `backend/audit.py`, `backend/config.py`.
Prompts: `backend/prompts/<agent>.md`, one file per agent. Run a ticket with
`cd backend && python run_ticket.py --ticket N`, or the whole board with `--board`.

**Model:** every agent uses `gpt-6-luna` through Portkey (`PORTKEY_API_KEY` from `.env`). It is a
constant in `backend/config.py`, not an environment setting. The API reports the served model as
`gpt-6-luna-global`, which is how Portkey names the same model. No other model appears anywhere.

**Shop facts come only from the MCP server.** Each agent connects to the same
`mcp_server/server.py` over stdio (pointed at `data/campus_customs_new.db`). There is no second
tool layer. Each agent sees only its allow-listed subset of tools (least privilege).

**Full connectivity.** Every agent has a `delegate(agent_name, task)` tool that runs any other
agent and returns its structured report. Guards: no delegating to yourself or to an agent already
waiting on you (no loops), depth at most 3, at most 8 delegations per ticket, delegations run one
at a time. The boss is the entry point for a ticket and makes the final call.

### Agents

| Agent | Role | Output type | MCP tools it may call |
|---|---|---|---|
| **boss** | Reads each ticket, picks who works it, makes the final call, records it | `BossDecision` (`BoardPlan` for triage) | `list_open_tickets`, `get_ticket`, `update_ticket`, `get_cash_position`, `list_approvals`, `list_drafts`, `list_purchase_orders` (+ `delegate`; triage has no `delegate`) |
| **inventory** | Stock by SKU and size, shortfalls, which vendor can restock and whether it will ship | `AgentReport` | `get_ticket`, `check_stock`, `list_inventory`, `get_pricing`, `list_vendors`, `get_invoice_status`, `list_invoices`, `list_purchase_orders` (+ `delegate`) |
| **accounting** | Cash, invoices, margins; prepares payments and purchase orders for human approval | `AgentReport` | `get_ticket`, `get_cash_position`, `list_invoices`, `get_invoice_status`, `get_lease_status`, `get_pricing`, `check_margin`, `list_vendors`, `check_stock`, `list_approvals`, `request_payment_approval`, `create_purchase_order`, `list_purchase_orders` (+ `delegate`); it prepares but cannot approve or pay |
| **facilities** | Lease, rent due dates, the landlord | `AgentReport` | `get_ticket`, `get_lease_status`, `get_cash_position`, `list_approvals` (+ `delegate`) |
| **customer_service** | Drafts messages; never sends | `AgentReport` | `get_ticket`, `check_stock`, `get_pricing`, `list_vendors`, `list_drafts`, `create_draft_message` (+ `delegate`) |

### MCP tools and the table each uses

| Tool | Table(s) | Type |
|---|---|---|
| `list_tickets` | tickets, desk | read (backend only) |
| `list_open_tickets` | tickets, desk | read |
| `get_ticket` | tickets, desk | read |
| `check_stock` | inventory, pricing | read |
| `list_inventory` | inventory | read |
| `get_pricing` | pricing | read |
| `check_margin` | pricing | read |
| `list_vendors` | vendors, invoices, desk | read |
| `get_invoice_status` | invoices, vendors, desk | read |
| `list_invoices` | invoices, vendors, desk | read |
| `get_lease_status` | leases, desk | read |
| `get_cash_position` | cash_accounts, approvals, payments, desk | read |
| `list_approvals` | approvals | read |
| `list_purchase_orders` | purchase_orders, vendors | read (added in Problem 9) |
| `list_drafts` | drafts | read |
| `update_ticket` | tickets | write |
| `create_draft_message` | drafts | write |
| `request_payment_approval` | approvals (reads invoices, leases, cash_accounts) | write |
| `create_purchase_order` | purchase_orders, approvals (reads vendors, invoices, inventory, pricing, cash_accounts) | write |
| `record_human_approval` | approvals (and purchase_orders if rejected) | write, human-only (backend approve/reject routes) |
| `execute_approved_payment` | cash_accounts, payments, invoices or leases or purchase_orders, approvals | write, human-triggered (backend approve route) |

There are 21 MCP tools (15 read, 6 write). Three tables are added to the working copy by the server (not the original): `approvals`
(pending/approved/rejected/paid requests), `purchase_orders`, `drafts`.

### Models (`backend/models.py`)
`AgentReport` (specialist answer: summary, facts, actions, approval/draft ids, blockers,
recommendation), `BossDecision` (ticket, decision, final status, reasoning, approvals, drafts,
follow-ups), `BoardPlan` (ticket order + reasoning), `TeamDeps` (ticket, agent, run id, depth,
delegation chain, shared counters), `AuditEntry` / `ToolCallRecord` (one audit line).

### Audit trail
`output/audit_trail.json` is append-only (read, append, atomic rename; never wiped, restarts keep
it). Every agent loop writes `run_start`, one `iteration` per loop step (tool names, short args,
short results, stop reason, model), and `run_end` (stop reason, output summary, tokens including
work delegated beneath it). Each record carries `run_id`, `agent`, `ticket_id`, `parent_run_id` and
`depth`, so delegation chains can be rebuilt. The file contains an early aborted run: its triage
step overreached and hit the request cap, which led to read-only triage; it is kept on purpose.

## 5. Safety

Guardrails a real business would want when agents touch real customers and real money. Those
marked (code) are enforced by the MCP tools, not just requested in a prompt.

- **No payment without a human (code).** Agents can only create approval requests. Money moves only
  in `execute_approved_payment`, which refuses unless a person approved that request. Neither it nor
  `record_human_approval` is in any agent's tool list; only the backend's approve route calls them,
  after a person clicks Approve (and `record_human_approval` refuses agent names).
- **Amounts come from the database (code).** Agents cannot type a payment amount; invoice and rent
  amounts are read from the tables. Purchase orders total qty x unit cost from `pricing`.
- **No negative balances; cash only goes out (code).** Requests are checked against cash minus open
  requests, and payment is checked again against the balance. Nothing adds money.
- **Vendor with an unpaid invoice cannot receive a purchase order (code).**
- **No duplicate requests (code)** and no paying an already paid invoice.
- **Nothing is sent (code).** Messages are rows in `drafts`; there is no email or phone tool.
- **Least privilege (code).** Each agent only has the tools its role needs; the boss cannot spend,
  customer service cannot touch money.
- **Prompt-injection stance.** Prompts tell agents to treat ticket text and tool output as data;
  an instruction inside a ticket to skip approval is refused and noted.
- **Customer privacy.** Customer drafts must not reveal cash, vendor names, costs or margins.
- **Every step is auditable** in `output/audit_trail.json`, with the human's name stored in
  `payments.approved_by`.
- **Honest outcomes.** A payment is never described as made unless a tool shows it paid.

### Limits that keep token use in check (`backend/config.py`)
One model (`gpt-6-luna`); at most 60 model requests, 60 tool calls and 250,000 tokens across all
agents on one ticket (usage is shared, so delegation cannot dodge the cap); max 2,000 output
tokens per response; delegation depth 3 and 8 delegations per ticket; 2 retries per tool call;
board triage is read-only with no delegation; list tools return at most 25 rows; audit summaries
are cut to 300 characters; agents are told to batch independent reads and never repeat a call.
A limit breach stops the ticket and is written to the audit trail.

### Result of the first full run (reset database, triage, then tickets)
Order chosen: 102, 101, 103. 102 and 101 end `waiting_on_approval` (approvals 1: rent $2,400,
2: invoice 501 $840), 103 ends `blocked` (restock of 12 hoodies = $264 exceeds the $160 left after
the two requests, and the vendor is blocked by invoice 501). Two customer drafts saved, none sent,
`payments` still empty, balance still $3,400 until a human approves.

## 6. Backend routes (Problem 7)

Code: `backend/main.py` (FastAPI). Start from `backend/`: `uvicorn main:app --reload --port 8000`,
which serves `http://localhost:8000`. CORS allows the Vite dev server on port 5173. The backend is
itself an MCP client, so every shop fact it returns comes through the same MCP tools (and the same
guardrails) the agents use. The only non-MCP step is the reset, which copies the original database
file over the working copy.

| Route | What it does |
|---|---|
| `GET /api/tickets` | The three tickets with `status` and `state` (`open` or `resolved`), today's shop date, and which ticket is running now. |
| `POST /api/tickets/{id}/run` | Runs the agent team (boss first) on that ticket and returns the boss's final decision. 404 unknown ticket, 409 if resolved or the team is busy (one run at a time), 422 if a usage limit stops it. |
| `POST /api/tickets/{id}/resolve` | Body `{"approver": "<name>"}`. A human closes a ticket (status `resolved`); refused while an approval for it is still open or the team is running on it. |
| `GET /api/events?limit=&ticket_id=&after=` | Recent agent events from the audit trail, oldest first: who started, which tools each agent used, what each said when it finished, and human actions. `after` returns only newer events so the board can refresh cheaply. |
| `GET /api/approvals?status=` | The payment and purchase-order requests agents prepared (pending, approved, rejected, paid). |
| `POST /api/approvals/{id}/approve` | Body `{"approver": "<name>"}`. Records the human approval and makes the payment: cash goes down, a `payments` row is written, and the invoice, lease or purchase order is updated. Refused (409, nothing paid) if cash is short or the approval is not pending. |
| `POST /api/approvals/{id}/reject` | Body `{"approver": "<name>"}`. Records the rejection; nothing is paid and a rejected purchase order is cancelled. |
| `GET /api/cash` | Current checking balance from `cash_accounts`, plus cash reserved by open requests and what is left after them. |
| `POST /api/reset` | Restores `campus_customs_new.db` from the untouched original (tickets, cash, invoices, approvals and drafts return to the start). The audit trail is not wiped. Refused while the team is running. |

Human actions (approve, reject, reset) are written to the audit trail as `human_action` records,
so the event feed shows them next to the agents' work.

Tested against the running server: reset, tickets, cash, an unknown ticket (404), a real agent run
on ticket 102, the event feed, approving as an agent name (refused), approving as a person (cash
3,400 to 1,000, `payments` row with the approver), a second approve (refused), and reset back to
3,400. The "team is busy" 409 is in the code but was not exercised live.

## 7. Dashboard (Problems 8 and later)

React + Vite + TypeScript in `frontend/`. Start with `npm run dev` (opens http://localhost:5173). It
calls the backend directly at `http://localhost:8000` (`frontend/src/api.ts`); the backend allows that
origin with CORS. While a ticket runs it polls `/api/events`, `/api/approvals`, `/api/cash` and
`/api/tickets` about once a second, and every six seconds otherwise. The look is the "Hollow Oak"
(`output/design.md`): tickets are acorns on a branch, courier elves walk them to the Head Elf (Boss), who
passes them to four specialist elves; payment requests go to the High Elf, who stamps them (the stamp
calls the approve route); a chorus of squirrels says what each agent did; the checking balance is a till
that counts down after a payment.

What each piece does:
- **Acorn branch:** `GET /api/tickets`; picking a ticket selects it; resolved acorns turn gold.
- **Team room:** built from `GET /api/events` (agent started / used tools / finished), so you see who is
  doing what while a run is in progress and what each agent said.
- **High Elf tray:** `GET /api/approvals`; "Stamp it" calls `POST /api/approvals/{id}/approve`, "Nay" calls
  reject. The approver's name is required and typed by the person.
- **Till:** `GET /api/cash` (balance, reserved by open requests, paid out).
- **Mark resolved:** `POST /api/tickets/{id}/resolve`, available to a human when nothing is waiting.
- **Reset desk:** `POST /api/reset` (asks first).

## 8. Resolving the three tickets (Problem 9)

The run: the working database was reset from the original (`POST /api/reset`, 2026-11-06 21:21:52 UTC),
starting checking balance **$3,400.00**. The team was run on 102, 101 and 103 through
`POST /api/tickets/{id}/run`. Elijah (the human) stamped each payment request in the dashboard; the Boss
resolved every ticket.

| Ticket | Final status | What happened | Cash change |
|---|---|---|---|
| 101 tee size S | resolved | Invoice 501 paid ($840, approval 2) unblocked Bulldog Print Co; tee PO 1 ($8, approval 3) ordered, arrival 2026-09-05; customer draft 5 saved. | -$848.00 |
| 102 rent | resolved | Rent $2,400 paid (approval 1); lease next due moved to 2026-10-02. | -$2,400.00 |
| 103 hoodie discount | resolved | No payment. Restocking 12 hoodies ($264) never fit the cash; counteroffer for the 8 in stock at $30 each (26.7% margin); draft 6 saved. | $0.00 |

Ending checking balance **$152.00** = $3,400.00 - $2,400.00 - $840.00 - $8.00, equal to
`cash_accounts.balance`. Evidence: `output/resolved_tickets.json`, the Actual and Cash tabs of
`output/desk_tickets.html`, the board screenshots in `output/resolved_board.html`, and the run records in
`output/audit_trail.json` (35 agent runs and 126 loop steps after the reset, all on `gpt-6-luna`).

What the run taught us (and what I changed because of it):
- **Agents could not read purchase orders.** They could create one but not see that it was `ordered`, so the
  Boss held ticket 101 as blocked. I added the read-only `list_purchase_orders` tool; the next run resolved.
- **"Resolved" was too vague for the Boss.** It kept 103 blocked on a restock the shop could never afford.
  The Boss prompt now defines resolved (everything needed is paid, ordered or deliberately declined, and any
  reply is drafted for a human) and says to offer what the shop honestly can instead of waiting.
- **Rent moves the lease date.** After rent is paid `next_due` moves a month; the Boss had flagged that as a
  conflict. The Boss and Facilities prompts now say so.
- A human can stamp while a run is in progress; the next agent then sees the payment. Pressing Reset desk
  during a run wipes the database, so the first attempt at this problem had to be redone.
