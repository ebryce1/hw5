# Campus Customs: multi-agent operations (HW5)

A team of five AI agents (boss, inventory, accounting, facilities, customer service) runs the shop's
ticket board, built from three pieces that talk to each other:

1. an **MCP server** (`mcp_server/`) that is the only way agents touch shop data,
2. a **FastAPI backend** (`backend/`) that runs the PydanticAI agent team and serves the dashboard,
3. a **React dashboard** (`frontend/`), the "Hollow Oak", where a human watches the agents and stamps
   (approves) payments.

Every agent uses one model, **`gpt-6-luna`**, through Portkey. Nothing is paid without a human's approval,
cash only goes out and can never go negative, and messages are drafts only (nothing is emailed or sent).

## What you need
- Python 3.11+ and Node 20+
- A Portkey API key (`PORTKEY_API_KEY`)

## One-time setup

```bash
# 1. Python environment at the project root (the MCP config expects ./.venv)
python3 -m venv .venv
./.venv/bin/pip install -r requirements.txt
#    if a package tries to compile from source and fails, use:
#    ./.venv/bin/pip install --only-binary=:all: -r requirements.txt

# 2. Your API key (this file is git-ignored and never committed)
cp .env.example .env
#    then edit .env and set PORTKEY_API_KEY=...

# 3. Front-end packages
cd frontend && npm install && cd ..
```

## The two database files (`data/`)
- `data/campus_customs.db` is the **original** shop database. Nothing ever writes to it.
- `data/campus_customs_new.db` is the **working copy**. The MCP server and the backend read and write this
  one (payments, approvals, drafts, ticket status). The copy committed here is the end state of my run
  (all three tickets resolved, checking balance $152.00), so reset it before a fresh run (below).

**To get a clean run, copy the original over the working copy:**

```bash
cp data/campus_customs.db data/campus_customs_new.db
```

(The dashboard's **Reset desk** button and `POST /api/reset` do the same thing.)

## Run it

Open three terminals in the project root. Do step 1 before every full run.

**1. Reset the database** (restores tickets, cash $3,400.00, invoices; deletes agent-made approvals and drafts):

```bash
cp data/campus_customs.db data/campus_customs_new.db
```

**2. Start the MCP server.** It is launched automatically over stdio by the backend (and by Claude Code via
`.mcp.json`), so you normally do not run it by hand. To run or check it yourself:

```bash
./.venv/bin/python mcp_server/server.py
```

**3. Start the FastAPI backend** (serves http://localhost:8000):

```bash
cd backend
../.venv/bin/uvicorn main:app --reload --port 8000
```

**4. Start the React board** (opens http://localhost:5173):

```bash
cd frontend
npm run dev
```

## A full three-ticket run (what I did)
1. Reset the database (step 1 above) and note the starting checking balance: **$3,400.00**.
2. In the board, pick a ticket (101, 102, 103) and press **Send the acorn up the tree**. Run them one at a time.
3. When the High Elf's tray shows a payment request, type your name under "Stamp as" and press **Stamp it**.
   Only that stamp moves money (`POST /api/approvals/{id}/approve`).
4. After each payment, run the ticket again so the Boss can see it is paid and resolve it (or press
   **Mark resolved**). Expected end state: all three resolved, checking **$152.00**
   ($3,400 - $2,400 rent - $840 invoice 501 - $8 tee purchase order).

Command-line alternative (no dashboard, still needs a human to approve through the backend routes):

```bash
cd backend && ../.venv/bin/python run_ticket.py --ticket 102     # one ticket
cd backend && ../.venv/bin/python run_ticket.py --board          # reset, triage, run every open ticket
```

## Layout

```
hw5/
├── AI_prompts.md            every prompt I gave the vibe coder, by problem
├── requirements.txt         Python dependencies
├── .env.example             placeholder only; copy to .env (the real .env is never committed)
├── .gitignore
├── .mcp.json                registers the MCP server (campus-customs) for Claude Code
├── README.md
├── data/
│   ├── campus_customs.db        original shop database (never written to)
│   └── campus_customs_new.db    working copy the app reads and writes
├── mcp_server/
│   ├── server.py            FastMCP server: 21 tools over the working database
│   └── README.md
├── backend/
│   ├── main.py              FastAPI routes (tickets, run, events, approvals, cash, reset)
│   ├── models.py            Pydantic data types
│   ├── agents/              the five agents (one file each) + shared wiring
│   ├── team.py audit.py config.py run_ticket.py
│   └── prompts/             boss.md inventory.md accounting.md facilities.md customer_service.md
├── frontend/                React + Vite + TypeScript dashboard
└── output/
    ├── harness.md           full technical write-up (tables, tools, agents, routes, dashboard, safety)
    ├── design.md            the Hollow Oak dashboard design
    ├── desk_tickets.html    expected vs actual per ticket, the Cash tab, and the Reflection
    ├── resolved_tickets.json  per-ticket outcome, agent contributions, human approvals
    ├── resolved_board.html  screenshots of the board for each resolved ticket
    ├── mcp_smoke.json       evidence that each MCP tool was called through the vibe coder
    ├── audit_trail.json     append-only log of every agent loop step (never wiped)
    └── github_url.txt       the URL of this repository
```

## Notes for graders
- Start with `output/harness.md`, then open `output/desk_tickets.html` and `output/resolved_board.html`
  (double-click; they need no server).
- The audit trail is append-only, so it also contains my earlier test runs. The final clean run starts at the
  `reset` record at 2026-11-06T21:21:52Z.
- The real `.env` is not in this repository. Only `.env.example` (a placeholder) is.
