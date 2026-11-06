# AI Prompts: Campus Customs Multi-Agent Operations (HW5)

Running log of the prompts I gave my AI coding assistant (Claude Code). Prompts are in my own words. Evidence of the work is the running system, the database writes, and the screenshots.

## Problem 1: Vibe coder prompts

**Prompt:**
> Campus Customs multi-agent operations is the agentic team that runs the shop. open tickets land on a board - customer orders, rent, unpaid bills, discount requests, whatever the shop has to handle. we are going to build three pieces that talk to each other, an MCP server, a FastAPI backend with a multi-agent team, and a react dashboard so a human can watch the agents at work and approve requests.
>
> our agent team has full connectivity, any agent may delegate tasks to any other agent for help. we will build these agents: boss (reads each ticket, decides who should work on it, makes final calls), inventory (checks stock by sku and size, spots shortfalls, figures out which vendor can restock), accounting (watches cash and invoices, checks margins, prepares payments or purchase orders for human approval), facilities (handles the shop space side: leases, rent, etc), and customer service (drafts messages for customers).
>
> data is in the folder now. the file is the original shop database. tables include desk, tickets, inventory, pricing, vendors, leases, cash_accounts, payments, and invoices. our tools will update the database as tickets get resolved. make a copy of the database called data/campus_customs_new.db and point the MCP server and backend at that working copy. keep campus_customs.db untouched so we can reset when we want to restart resolving tickets.
>
> rules: desk.date_today is "today" for the shop, use it to determine what is overdue. vendor lead times come from the vendors table. a vendor will not ship a new product while they still have an open unpaid invoice. human approval is required for any payments. if payment is made, update the relevant table. if there is not enough cash, the pay tool must refuse. no negative balances. cash only goes out in this homework, we did not model revenue. before a full run to resolve the tickets, reset the database to the original values. do not email customers or call real vendors. drafts stay on the board.
>
> use my PORTKEY_API_KEY for AI calls. use only gpt-6-luna through portkey for every agent. points will be deducted if any other model shows up in our code or runs. work one problem at a time. final submission is a public github repo. hw4 was a 100/100 so that is the baseline for grading. do the same thing we did last time: we do the homework, then I give you the website, you go back and grade it before we submit and fix any problems.

**Follow-up prompt:**
> portkey key should already be in .env. reminder on a lot of these, i don't know if it is a problem i need to do or you need to do, so let me know if there is something you need from me.

**What was lacking after the first prompt:** It set the rules and the plan but no concrete problem to build yet, and it didn't say who was responsible for setup items like the API key. I confirmed the key name is in `.env` (without printing its value) and noted that I'll say plainly whenever something needs the user rather than guess.

## Problem 2: Study the Campus Customs database

**Prompt:**
> open data/campus_customs.db and look through every table and the fields. copy the original file to data/campus_customs_new.db, later problems update that working copy. study the three open tickets so you see how they link to other tables. start output/harness.md. for each table, list the fields and one short line on why that table matters for the agents. you will keep growing this harness file in later problems.

**Follow-up prompt:** None needed so far.

**What was lacking after the first prompt:** N/A (no follow-up yet). I confirmed the working copy is byte-identical to the original, and noted in the harness that the three tickets compete for the same cash ($840 invoice + $2,400 rent leaves $160, not enough to restock 12 hoodies at $22 cost).

## Problem 3: Build the MCP server

**Prompt:**
> write an mcp server in mcp_server/ using FastMCP. it will talk to data/campus_customs_new.db. you do not need to connect or run it in this problem. every agent in this homework uses the tools in this mcp server. you will add more tools to it later but for now write 3 tools you know you will need for the tickets in the database. keep the names clear. never invent any data, only use information in the database. in output/harness.md, list each of our 3 MCP tools. for every tool, include: which table it reads, which ticket it helps unlock (101, 102, or 103), and one sentence on why that tool is the right one for that ticket. vague lines like "reads inventory" score low, tie the tool to the ticket. also add a short mcp_server/README.md that explains what the MCP server is for, which database file it uses, and the three tools it has.

**Follow-up prompt:**
> so this sounds like a me problem?

**What was lacking after the first prompt:** It didn't say whether anything was needed from the user. This problem needed nothing from them, so I said so and built it. The tools were chosen from the three tickets: `check_stock` (101/103), `get_invoice_status` (101) and `get_lease_status` (102).

## Problem 4: Add the MCP server to the vibe coder and test each tool

**Prompt:**
> add our MCP server to this project so the vibe coder can call the tools. save the connection JSON text in .mcp.json at the project root (or however your vibe coder saves local MCP server lists). with the vibe coder connected, test each of the 3 MCP tools. save the evidence in output/mcp_smoke.json. for every tool include: the prompt you asked the vibe coder, the tool name, the tool output (must match values in data/campus_customs_new.db)

**Follow-up prompt:**
> reloaded
>
> (then) check again. i closed claude and reopened it. if it still doesnt work lets do 1 and tell me step by step instructions
>
> (then) there's no way to do it in this chat? i just don't want to lose anything for what we have to submit

**What was lacking after the first prompt:** It didn't say that the vibe coder only loads `.mcp.json` from the folder the session opens in. My session had opened one level up, so the tools didn't appear after a reload. I moved the session into `HW/hw5` and the three tools loaded and were called directly. A headless `claude -p` attempt failed with an expired login (401), so I did not use it and did not fabricate evidence.

## Problem 5: Build the agent team and grow the MCP tools

**Prompt:**
> build the agentic team for campus customs using pydanticAI: boss, inventory, accounting, facilities, and customer service. include prompts, models, and agent loops so they can delegate work to each other with full connectivity. put the agent prompts in backend/prompts/ one file per agent. put data types in backend/models.py and the agent files under backend/ (your layout can vary as long as the five roles are clear). use my PORTKEY_API_KEY and only gpt-6-luna for every agent. write each prompt in your own words with the shop rules that agent needs. more detailed prompts that cover all aspects of an agent's work and scope score higher than a short generic prompt.
>
> add any tools the agents need to your MCP server so they can work on the open tickets. shop facts come from the MCP server over data/campus_customs_new.db, do not invent a second shop-tools layer that bypasses MCP. wire the agents so they append to output/audit_trail.json as they run: for each agent-loop step, record enough to audit later. append to this file, do not wipe it each run.
>
> in output/harness.md, list each agent and each MCP tool (including ones you add in this problem) along with which table the tool uses. also add a short safety section: the guardrails a real business would want when agents touch real customers and real money, plus limits that keep token use in check. update mcp_server/README.md so the tool list matches what you have now.

**Follow-up prompt:** None needed from the user. Two problems came up in my own testing and I fixed them without asking:
1. The first full run's board triage overreached: it delegated to specialists, created real approval requests, and hit the 40-request cap. I made triage read-only with no delegate tool, raised the cap to 60 requests, let independent reads batch while delegations run one at a time, and told the boss to ask one specialist at a time and not to ask two for the same job. The aborted run stays in the append-only audit trail on purpose.
2. A test showed two agents racing to prepare the same rent payment when the boss delegated in parallel. The duplicate guard in the MCP tool caught it, and the sequential-delegation change removed the cause.

**What was lacking after the first prompt:** It didn't say who approves payments inside the system or how the agents could safely trigger a payment after approval. I decided that agents may only request, a human-only `record_human_approval` tool (given to no agent) records approval, and `execute_approved_payment` refuses without it. It also didn't name the extra tables or tools, so I added `approvals`, `purchase_orders` and `drafts` to the working copy and 19 MCP tools, all documented in the harness.

## Problem 6: Plan the three tickets

**Prompt:**
> before you wire the backend, write down what you expect the team to do on each open ticket. build output/desk_tickets.html a page you can double click with one tab per ticket (101, 102, and 103). also add empty cash and reflection tabs for later problems (leave them blank for now). on each ticket tab, fill an expected section only (leave room for an actual section you will fill after you run the agents). for each ticket's expected section, write in your own words: who the boss should call first and why, all the agent delegations you expect (not "boss calls everyone"), which MCP tools you expect that run to use. plans that send every specialist on every ticket score low. we will compare this plan to what actually happens when our agents resolve the three tickets.

**Follow-up prompt:**
> it says my own words, so is this a me problem?

**What was lacking after the first prompt:** It didn't say whose "own words" were meant (they were mine, the vibe coder's, so nothing was needed from the user). It also assumed the plan comes before any agent run, but the team had already been built and run in Problem 5. I wrote the plan from the database and shop rules instead of from that run, and said so in the page footer. The page has one tab per ticket plus blank Cash and Reflection tabs, and the plans send only the specialists each ticket needs (101: inventory, accounting, customer service; 102: facilities, accounting; 103: inventory, accounting, customer service).

## Problem 7: Backend routes

**Prompt:**
> our react frontend dashboard (the next problem) needs a backend it can call. in backend/main.py, use fastapi and add routes that do the following: return the three tickets and whether each is open or resolved, take a ticket id and run your agent team on that ticket, return recent agent events (what each agent said and which tools they used) so the board can refresh, approve a payment or purchase after a human clicks approve (agents only prepare the pay, this route is what actually changes cash), return the current checking balance from cash_accounts, reset the database to the original values when you want to try a fresh run. from the backend/ folder, start the server with: uvicorn main:app --reload --port 8000. that turns on your backend at http://localhost:8000 so the frontend dashboard can call those routes. in output/harness.md, list each route in one line (what url / what it does)

**Follow-up prompt:** None needed from the user. Decisions I made and tested myself:
1. The backend reads everything through the MCP server (it is an MCP client), so I added a `list_tickets` tool instead of reading the database directly. The reset is the only file operation.
2. "Agents only prepare the pay" meant accounting must not be able to pay, so I removed `execute_approved_payment` from its tools and prompt. Only the approve route calls it, after recording the human's name.
3. The events feed needed readable agent text, so the audit trail now stores what each agent said (not a JSON dump) and human approve/reject/reset actions are logged too.
4. I added two extra routes the dashboard will need: a list of approvals, and reject.
5. A first request right after starting the server failed only because the MCP subprocess was still starting; it worked once the server was up.

**What was lacking after the first prompt:** It didn't say who is allowed to make a payment, what the body of the approve request should contain, or what happens when an approval can't be paid. I made the approver's name required, refused agent names, and made an unaffordable payment return 409 with the approval recorded and cash unchanged. It also didn't say what "recent events" should contain, so I included who started, which tools were used with short results, what each agent said, and human actions.

## Problem 8: Agent dashboard

**Prompt:**
> agent dashboard: build the frontend dashboard in frontend/ with React + Vite + TypeScript. The pages should call the routes we built in problem 7. at a minimum the board should list all 3 tickets, let you pick one ticket and start the agent team on it, show each agent and what they are saying/doing while the ticket runs, mark a ticket resolved when the run finishes, show a short summary of what each agent did on that ticket, let a human approve a pay or purchase when asked, show the checking balance (it should drop after an approved pay). we need to make the dashboard look good and be creative with the layout and feel, this is a real desk people would want to sit at. So put thought into how it looks. tell the front end to talk to your backend at http://localhost:8000 and on the backend, allow the Vite page origin (usually localhost:5173) so the browser is allowed to call those routes. Start the board with: npm run dev. this opens the react desk in your browser so you can pick tickets and watch agents. Write output/design.md with what you chose for the dashboard look (layout, how the agents read differently, how resolved tickets and cash show up) and why, including creative choices that make it feel special and something humans would actually enjoy watching. ok so do this, let me take a look, then I'm going to come back with design updates.

**Follow-up prompt:**
> nah lets make it more fun. i like the flow idea, but make it look like little keebler elves are living in a tree and getting these tickets in forms of acorns. they take it to the head elf. make this an older, grey haired, but jacked elf. big muscles. six pack abs. he then gives it to whatever team it needs to go to, less jacked but still superior elves. somewhat jacked, if you will. when i need to approve it shows me, the high keebler elf. ultimate levels of jacked. but also all knowing. i stamp the acorn. the "what each agent did" part? that's squirrels. like a chorus in a greek play. they have quote bubbles pop out saying what each agent did.

I rebuilt the look as the Hollow Oak (see output/design.md): acorn tickets, courier elves, the Head Elf, four specialist elves, the High Elf with a stamp, and a squirrel chorus, all as original SVG drawings. The data and routes did not change. I drew them as original elves (not a brand's characters or logos), and checked the result in a real browser. One thing I found and fixed myself: long agent reports made the elf bubbles and squirrel quotes huge, so they are now clipped, with a "the whole song" link for the full text.

Decisions I made and flagged on the first version:
1. "Mark a ticket resolved when the run finishes" conflicts with the backend, where a run usually ends waiting on a human approval. I did not auto-resolve, because that would be untrue. The Boss sets the status, and a human **Mark resolved** button (new `POST /api/tickets/{id}/resolve`) appears once the run is over and no approval is open. Please say if you wanted automatic resolving instead.
2. The CORS origin for the Vite page was already allowed in Problem 7, so no backend change was needed for that.
3. I added `notes` to the ticket list so the sheet shows what the Boss decided.
4. I tested it in a real browser: a live run on ticket 102, approving the rent (balance 3,400 to 1,000), and marking it resolved. The browser window here could not go wider than a phone, so I checked the desktop layout in a scaled frame, and then removed that test page.

**Second follow-up prompt:**
> can you make the high elf actually stamp the acorn with his big jacked arms?

I gave the High Elf a wooden stamp in his raised arm and an acorn on a stump beside him. Pressing "Stamp it" now plays a wind-up and slam of that arm, with a squash on the acorn, a shock ring, a check seal and a thud, and the payment is sent at the moment of impact. I checked the impact frame in a real browser, but I did not press Stamp on a real request, because the desk held live test data from the user's own session. The full press-to-paid sequence is therefore untested live.

**Third follow-up prompt:**
> the courier elves fade away, they should walk across the web page to bring the acorns around

I replaced the fading courier with one that really walks across the page. It is a small elf with swinging legs and a bobbing body that faces the way he walks, and he carries an acorn overhead. He does trips from a queue: branch to Head Elf when a run starts, a specialist's nook to the High Elf when a payment request is prepared, Head Elf back to the branch when the run ends, and then home to his perch. I checked in a real browser that the walker moves across the page with its walking animation active; the temporary test hook I used is removed. I did not run a full ticket to watch all trips in sequence.

**What was lacking after the first prompt:** It didn't say what "resolved" should mean when a run ends waiting for a human to approve money, or who closes the ticket afterward. It also left the look open, so I chose a desk concept (felt, brass till, paper tickets and slips) and documented it in design.md for you to change.

## Problem 9: Resolve the tickets

**Prompt:**
> before testing the agents on a full run over the three tickets, reset the working database data/campus_customs_new.db again so you start clean. Note the starting checking balance. Then run all 3 tickets on the board (101, 102, 103) until each is resolved. Open output/desk-tickets.html from problem 6 on each ticket tab, fill the actual section from this run: which agents worked, what they delegated, and which tools they used. Keep your expected section so you can compare the two. On the cash tab of the same output/desk_tickets.html, itemize the money: starting checking balance (after the reset), for each ticket: how cash changed when that ticket resolved, and why (which pay/purchase, dollar amount), ending checking balance - it must match cash_accounts in the working database. wrong cash math loses points even if the board shows every ticket resolved. Also save: output/resolved_tickets.json - for each ticket: id, final status, short outcome, what each agent contributed, and any human approvals. output/resolved_board.html: a page you can double-click with a screenshot of your react board for each resolved ticket (101, 102, 103). append real runs to output/audit_trail.json. finish output/harness.md so it covers tables, mcp tools, the five agents, API routes, the dashboard, and safety rules.

**Follow-up prompt:**
> (answering my question about who stamps the approvals) I stamp them myself.
>
> what's taking so long?
>
> can we reset this problem and start again?
>
> All three resolved  /  is it done? what is left to do?  /  ETA?

Things that happened, and what I did:
1. I asked who should stamp the payments, because a payment needs a human. The user chose to stamp them in the dashboard themselves, so every approval in the data is by a real person (Elijah).
2. The first attempt was wiped when Reset desk was pressed in the middle of the run, and I found two of us were driving the dashboard at once. I stopped, said so, and the user asked to start again; I reset, ran the tickets myself and asked them not to press reset again.
3. The run found two real problems in my own work, which I fixed and re-ran rather than forcing a status: the agents had no tool to read a purchase order (added `list_purchase_orders`), and the Boss had no clear rule for when a ticket is resolved, so it held 103 blocked (added a definition to its prompt, plus a note that paying rent moves the lease date).
4. All three tickets ended `resolved` by the Boss: 101 (invoice 501 $840 and tee PO $8), 102 (rent $2,400) and 103 (no payment, counteroffer for the 8 in stock). The starting balance was $3,400.00 and the ending balance $152.00, which matches cash_accounts. I checked the sum in code before writing any file.
5. I took real desktop screenshots of the dashboard for each ticket, filled the Actual and Cash tabs, and wrote resolved_tickets.json and resolved_board.html. The file in the prompt is spelled desk-tickets.html, but I used the existing desk_tickets.html from Problem 6.

**What was lacking after the first prompt:** It didn't say who clicks Approve (the rule says a human must), what "resolved" means when work ends waiting on a payment or when the shop cannot fill an order, or what to do if the database is reset mid-run. I asked about the approvals, defined resolved in the Boss prompt, and said that the audit trail keeps every record even when a reset wipes the database, so the cash figures come from the final clean run only.

## Problem 10: Reflection

**Prompt:**
> reflection: open output/desk_tickets.html and fill the reflection tab. Answer in your own vibe, and be detailed and thorough: How would you evaluate the performance of the agents on each ticket and why? For each ticket, how did the actual compare to the expected plan you wrote earlier? What would have been simpler as one agent with tools, and why? Describe three new problems campus customs might face that this agent team could solve with the tools we built. Describe 3 new problems campus customs might face that this agent team could not solve with the tools you built, and explain the tools and agents you would need to solve them. Tie every answer to this app and the three tickets you ran - use the ticket tabs and cash tab on the same page as evidence. Generic AI essays without campus customs details will score low.

**Follow-up prompt:** None needed from the user. I made these choices myself:
1. I wrote it as a candid review, not a victory lap: the agents were correct and safe on all three tickets but expensive and inconsistent (353,330 input tokens, 103 flipping blocked, blocked, resolved on identical facts), and I said so with numbers from the audit trail.
2. For "what would be simpler as one agent", I used ticket 102 (19 tool calls for a six-call job) and argued for one agent on lookup-and-request tickets, with the multi-agent split kept only for money and judgment.
3. Every new problem is tied to real data in the app: mugs at 0 stock with Elm City Gifts, 40 caps at a $6 cost, a margin ranking from the pricing table; and for the gaps, the $240 hoodie offer that nothing can book, the PO that is only "ordered", and the $2,400 rent still due with $152 left.
4. I corrected two claims while checking them against the data: I had written that the Boss chose the board order in the final run (I chose it; the Boss's triage was in an earlier run), and the plan's $160 ending cash versus the real $152 is called out as my own miss (the $8 tee PO).

**What was lacking after the first prompt:** It didn't say how long or what format, so I used one tab with five numbered sections that mirror the five questions, a scorecard table per ticket and a plan-versus-actual table, so a grader can find each answer quickly. It also left open what counts as "evidence", so I cited the ticket tabs, the Cash tab and the audit-trail counts by name.

## Problem 11: Submit to GitHub

**Prompt:**
> submit to GitHub: push your code to a public github repository so graders can clone it. Submit the repo url to canvas, and also put it in output/github_url.txt. do not push your real .env to GitHub repo. Do include both database files under data/ (the original and your working copy) so graders can run your app easily. Expected file layout is attached. README should explain: copy original DB to the working copy when you need a clean run, start the MCP server, start the fastapi backend, start the react board, reset the DB before a full three-ticket run. [expected file layout attached as an image]

**Follow-up prompt:** None needed from the user. I handled these myself:
1. The attached layout names the MCP server file `mcp_server/server.py`; mine was `mcp_server.py`. I renamed it and fixed every reference (`.mcp.json`, the backend config, docs), then re-checked that `claude mcp list` shows it connected and the backend still starts and serves the board data. I also noted the rename inside `mcp_smoke.json`, since that test ran under the old name, and removed a duplicate `mcp_server/requirements.txt` so the folder matches the layout.
2. My old `.gitignore` excluded `data/` and `*.db`, which would have kept both databases out. I changed it to commit them (and `data.zip` stays out), while still ignoring `.env`, `.venv` and `node_modules`.
3. Before the first commit I checked what was staged: no `.env`, no `.venv`, no `node_modules`, no logs, and I searched every file for the Portkey key and for key-shaped strings (none found). I also confirmed `data/campus_customs.db` is byte-identical to the one in the original `data.zip`.
4. The working copy I committed is the end state of the real run (all three tickets resolved, checking $152.00), so the committed data matches `resolved_tickets.json`. The README tells graders to copy the original over it before a fresh run.
5. After pushing, I cloned the public repo into a scratch folder and checked the files, both databases, the ticket states and that no `.env` came along.

**What was lacking after the first prompt:** It didn't say what repository name to use (I used `hw5` under the same GitHub account as HW4, `ebryce1`), whether the working copy should be committed in its used or reset state (I committed the used state so the evidence matches, and said how to reset), or that the Canvas submission is a step only the user can do.

### Follow-up: grading pass

**Prompt:**
> ok thats the homework. Here is what I am turning in https://github.com/ebryce1/hw5. This is the link to the homework. Grade me, like we did for HW4 [followed by the assignment's URL].

**Follow-up prompt:** None needed from the user. I read all eleven problem pages for the requirements and point values, cloned the public repo fresh and checked every deliverable against its problem, ran the MCP server, the backend (with a reset) and the front-end build from the clone, and fixed what I found:
1. `mcp_smoke.json` showed invoice 501 "open" and the lease due 2026-09-02, but the committed working copy is in its used state (invoice paid, due 2026-10-02), so a grader comparing the two would see a mismatch. I confirmed the three outputs match a fresh copy of the original exactly, and added a note saying so and how to reproduce.
2. `design.md` ran about 1,060 words (HW4 lost a point for being long), so I cut it to the required parts: layout, how the agents differ, how resolved tickets and cash show, and why.
3. The reflection did not have a plain "human approvals for each ticket" part that the Problem 10 page expects, so I added a table with the approval ids, amounts, approver and effect for 101, 102 and 103.
4. The model name `gpt-6-luna-global` appears in the audit trail because the gateway reports it that way; I explained it in the README so it is not mistaken for a different model.

**What was lacking after the first prompt:** It didn't say whether Canvas also wants a `hw5.zip` (the Problem 11 page mentions one), so I asked rather than guessed.

<!-- Add one section per problem below: number and title, at least one prompt in my own words, one follow-up if needed, and one sentence on what the first prompt lacked. -->
