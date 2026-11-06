# Dashboard design: the Hollow Oak

Run it: backend `uvicorn main:app --reload --port 8000` (from `backend/`), then `npm run dev` (from
`frontend/`). It opens http://localhost:5173 and calls the backend at http://localhost:8000.

## The idea
The shop is run by little elves who live in a hollow oak. A ticket is an **acorn**. Couriers carry it to the
**Head Elf**, who hands it to the right specialist elf. Anything that needs money goes up to the **High Elf**, who
you meet to stamp the acorn. A **chorus of squirrels** sings what every agent did. The flow is the point: you can
see where work is, who has it, and when it is waiting for you.

All characters are original SVG drawings (no stock images), so they animate and recolour with the app's state.

## Layout
- **Left, the acorn branch.** Each ticket is a hanging acorn with a paper tag (number, type, subject, requester, SKU)
  and an ink stamp for its status. Two courier elves sit on the branch; one of them walks off to carry acorns around the
  page, and the acorn he carries is marked "With the elves". Resolved acorns turn **gold**.
- **Centre, the ticket and the hollow oak.** The picked ticket on a ruled sheet with a "Send the acorn up the tree"
  button (its notes show what the Head Elf decided). Below it, a cutaway of the tree: canopy on top, the Head Elf's
  chamber, a wooden walkway, and four nooks for the specialists.
- **Right, the High Elf and the bark scroll.** The approvals and a receipt-style activity log.
- **Bottom, the chorus.** A full-width branch of squirrels.
It collapses to fewer columns on a smaller screen.

## The elves (and why they read differently)
- **Head Elf (Boss):** old, grey-haired and bearded, shirtless and very jacked: big flexed arms, six-pack abs, a gold
  acorn on his hat. He holds the acorn aloft while he has a ticket. He speaks in serif type (a manager's voice).
- **Stock, Ledger, Hollow-Keeper and Letter Elves (Inventory, Accounting, Facilities, Customer Service):** "somewhat
  jacked", clearly junior to the Head Elf. Each has its own tunic colour and prop (clipboard, ledger and coin, wrench,
  letter and quill) and its own bubble style: monospace stock counts, ledger-ruled accounting, a squared building notice,
  a soft italic customer note. Each lives in its own glowing nook; an elf that was not called naps in a greyed-out nook.
- **High Elf (approvals):** the most jacked of all, white-bearded, golden crown, a purple cape, glowing eyes and a halo
  in a starry chamber. He is "all-knowing": he says how many acorns await and how much the fund holds, and every slip
  tells you what would remain after your stamp ("After my stamp: $2,552.00 remains") or that the fund cannot cover it.

## While a ticket runs
A courier elf **walks across the page** (legs swinging, body bobbing, turning to face the way he goes) and carries the
acorns around, one trip at a time from a queue:
- when you start a ticket he steps off the branch, walks to that acorn, lifts it overhead and carries it to the Head Elf;
- when an agent prepares a payment request he picks up an acorn from that agent's nook and carries it to the High Elf;
- when the run ends he carries the acorn from the Head Elf back to its card on the branch;
- then he walks home to his perch on the branch. He never fades; he is always somewhere on the page.
A working elf in the tree flexes, glows with a green light, types its task out letter by letter, and shows what it is
doing now ("Checked stock") with bobbing dots. When one elf passes work to another, an acorn is tossed into the receiving
nook, a yellow note says who sent it, and the **acorn route** under the tree lists the hand-offs in order.

## Approving: the High Elf stamps the acorn
The High Elf holds a big wooden stamp in his raised arm, and a pending request sits on a tree stump beside him as a
gold-edged acorn. You type your name ("Stamp as") and press **Stamp it**. His jacked arm winds up and slams the stamp
down on the acorn: the acorn squashes, a ring of light bursts out, a purple check seal appears, the chamber shakes, and
he says "So it is written." The payment is made at the moment of impact. The slip then shows "Stamped · Paid" and the
acorn goes gold. Each request is a tag with kind, big amount, reason and who prepared it. "Nay" rejects. Backend errors
(for example not enough cash) show on the slip.

## Cash and resolved tickets
- **Cash:** a wooden-framed "acorn fund" plate with glowing digits is always on screen. After an approved payment the
  digits count down and a red amount floats up. A striped bar shows how much is already promised to pending requests.
- **Resolved:** a gold acorn on the branch, a green stamp, a rubber-stamp seal slamming onto the ticket sheet, and the
  branch count ("2 open, 1 resolved"). Tickets not yet done say so: "Waiting on you" (amber) or "Blocked" (red). Resolved
  is set by the Head Elf, or by you with the **Mark resolved** button once the run is over and nothing is waiting for approval.

## The squirrel chorus ("what each agent did")
Like the chorus in a Greek play, five squirrels in laurel wreaths and agent-coloured scarves sit on a branch. Each speaks
for one agent through a quote bubble that pops out (staggered, so they "sing" in turn); long reports are clipped with a
"the whole song" link to read everything. The Head Elf's final call sits above them as a scroll with its status stamp.
Squirrels whose agent was never called sleep ("Zzz... nobody needed Facilities this time"), which shows at a glance
that the Boss did not call everyone.

## Notes
Motion respects "reduce motion". The look is data-driven: every elf, bubble, acorn and squirrel is drawn from the
backend's tickets, approvals, cash and event feed, so a page refresh shows the last run.
Checked in a real browser against the live backend (desktop layout viewed in a scaled frame because the browser
window here could not be made wider than a phone).
