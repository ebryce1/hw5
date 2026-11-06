"""The agent team: registry, and the entry points that run one ticket or the whole board.

run_ticket() starts the boss on a ticket; the boss delegates, and every agent can delegate to any
other. All agents share one Usage object per ticket, so the request/tool/token limits in config.py
cap the whole team, not each agent.
"""
from __future__ import annotations

import shutil
from uuid import uuid4

from pydantic_ai import Agent
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.usage import RunUsage

import config
from agents import accounting, boss, customer_service, facilities, inventory
from agents.common import mcp_toolset, team_limits
from audit import append_audit, run_with_audit, _now
from models import AuditEntry, BoardPlan, BossDecision, TeamDeps

_BUILDERS = {
    "boss": boss.build,
    "inventory": inventory.build,
    "accounting": accounting.build,
    "facilities": facilities.build,
    "customer_service": customer_service.build,
}
_agents: dict[str, Agent] = {}
_triage_agent: Agent | None = None


def get_agent(name: str) -> Agent:
    if name not in _agents:
        _agents[name] = _BUILDERS[name]()
    return _agents[name]


def reset_database() -> None:
    """Restore the working copy from the untouched original. Run before every full run."""
    shutil.copyfile(config.ORIGINAL_DB, config.WORKING_DB)


async def run_ticket(ticket_id: int) -> BossDecision:
    """Boss works one ticket (delegating as needed) and returns its final decision."""
    deps = TeamDeps(ticket_id=ticket_id, agent_name="boss", run_id=uuid4().hex[:12])
    usage = RunUsage()
    prompt = f"Work ticket {ticket_id}. Read it, get the right specialists on it, and make the final call."
    async with get_agent("boss"):  # opens the MCP connection once for the whole ticket
        try:
            result = await run_with_audit(get_agent("boss"), prompt, deps, usage, team_limits(),
                                          {"task": "work ticket"})
        except UsageLimitExceeded as exc:
            append_audit(AuditEntry(timestamp=_now(), run_id=deps.run_id, event="run_end", agent="boss",
                                    ticket_id=ticket_id, stop_reason="usage_limit", error=str(exc)))
            raise
    return result.output


async def triage_board() -> BoardPlan:
    """Boss orders the open tickets (deadlines, penalties, what unlocks what, shared cash)."""
    global _triage_agent
    if _triage_agent is None:
        _triage_agent = boss.build_triage()
    deps = TeamDeps(ticket_id=None, agent_name="boss", run_id=uuid4().hex[:12])
    async with _triage_agent:
        result = await run_with_audit(
            _triage_agent, "Triage the board: put every open ticket in the order it should be worked. This is planning only: read the tickets and cash, do not delegate and do not change anything.",
            deps, RunUsage(), team_limits(), {"task": "triage board"})
    return result.output


async def run_board(reset: bool = True) -> dict:
    """Full run: reset the database, triage, then work each ticket in the boss's order."""
    if reset:
        reset_database()
    plan = await triage_board()
    decisions = []
    for tid in plan.order:
        decisions.append(await run_ticket(tid))
    return {"plan": plan, "decisions": decisions}
