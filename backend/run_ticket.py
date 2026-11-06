"""Command line runner.  python run_ticket.py [--ticket N | --board] [--no-reset]

--board resets the working database to the original, triages, and works every open ticket.
--ticket N works one ticket on the current working database.
"""
import argparse
import asyncio

import team


async def main() -> None:
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--ticket", type=int)
    g.add_argument("--board", action="store_true")
    ap.add_argument("--no-reset", action="store_true", help="with --board, keep current database state")
    args = ap.parse_args()
    if args.board:
        out = await team.run_board(reset=not args.no_reset)
        print(out["plan"].model_dump_json(indent=2))
        for d in out["decisions"]:
            print(d.model_dump_json(indent=2))
    else:
        print((await team.run_ticket(args.ticket)).model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
