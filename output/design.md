# Dashboard design: the Hollow Oak

Run it: backend `uvicorn main:app --reload --port 8000` (from `backend/`), then `npm run dev` (from `frontend/`).
It opens http://localhost:5173 and calls the backend at http://localhost:8000.

## The idea
The shop is run by elves who live in a hollow oak. A ticket is an **acorn**. A courier elf carries it to the
**Head Elf** (the Boss), who hands it to the specialist elf it needs. Anything that costs money goes to the
**High Elf**, who stamps it. A **chorus of squirrels** sings what each agent did. I chose a story because the flow
is the point: you can see where each ticket is, who has it, and when it is waiting for you. Every character is an
original SVG drawing, so it can change with the app's state.

## Layout
- **Left, the acorn branch:** the three tickets as hanging acorns with a tag and a status stamp.
- **Centre:** the picked ticket on a ruled sheet with the "Send the acorn up the tree" button, then the hollow oak
  (Head Elf's chamber above four specialist nooks), then the **acorn route** listing hand-offs in order.
- **Right:** the High Elf's approval tray and a "bark scroll" activity log.
- **Bottom, full width:** the squirrel chorus (the per-agent summary).

## How the agents read differently
Each agent has its own colour, prop and voice, so you can tell who is talking without reading the label.
The **Head Elf** is old, grey and very jacked, and speaks in serif type like a manager's memo. The **Stock**, **Ledger**,
**Hollow-Keeper** and **Letter** elves (inventory, accounting, facilities, customer service) are less jacked, each with
a prop (clipboard, ledger, wrench, letter) and a bubble style: monospace stock counts, ledger-ruled accounting, a
squared building notice, a soft italic customer note. A working elf flexes, glows green and types its task out with a
live "what it is doing now" line; elves not called nap in a greyed-out nook, which shows the Boss did not call everyone.
A courier walks the acorns around the page between the branch, the Head Elf and the High Elf.

## Resolved tickets
A resolved acorn turns **gold** with a green stamp, a rubber-stamp seal slams onto the ticket sheet, and the branch
counts "2 open, 1 resolved". Unfinished tickets say so: amber "Waiting on you" or red "Blocked". The Boss sets
`resolved`; a person can also press **Mark resolved** once nothing is waiting for approval.

## Cash and approvals
The checking balance is a wooden "acorn fund" plate that is always on screen. After an approved payment the digits
count down and a red amount floats up; a striped bar shows how much is already promised to pending requests. Each
request is an acorn tag with kind, amount, reason and who prepared it. You type your name and press **Stamp it**: the
High Elf's arm slams a wooden stamp onto the acorn and the payment is made at the moment of impact. He also says how
much would remain, so you decide knowing the effect on cash.

## Why
Distinct characters make parallel work readable; the stamp makes the one human decision feel weighty; the always-visible
till keeps the money in view; fun keeps a person watching a run that takes a minute or two. Motion respects "reduce motion".
