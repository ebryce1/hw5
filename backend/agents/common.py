"""Pieces every agent shares: the model, the MCP connection, and the delegate tool.

Every agent is built the same way (build_agent): same model (gpt-6-luna via Portkey), the same
single MCP server for all shop facts, a per-role allow-list of MCP tools (least privilege), and a
`delegate` tool that lets it hand work to any other agent (full connectivity).
"""
from __future__ import annotations

import os
import sys
from uuid import uuid4

from fastmcp import Client
from fastmcp.client.transports import StdioTransport
from openai import AsyncOpenAI
from pydantic_ai import Agent, RunContext, Tool, UsageLimits
from pydantic_ai.exceptions import UsageLimitExceeded
from pydantic_ai.mcp import MCPToolset
from pydantic_ai.models.openai import OpenAIResponsesModel
from pydantic_ai.providers.openai import OpenAIProvider
from pydantic_ai.settings import ModelSettings

import config
from models import AGENT_NAMES, AgentName, AgentReport, TeamDeps

_toolset: MCPToolset | None = None


def build_model() -> OpenAIResponsesModel:
    """The one model every agent uses: gpt-6-luna, through the Portkey gateway."""
    config.load_env()
    client = AsyncOpenAI(
        api_key=os.environ["PORTKEY_API_KEY"],
        base_url=config.PORTKEY_BASE_URL,
        default_headers={"x-portkey-provider": "openai"},
    )
    return OpenAIResponsesModel(model_name=config.MODEL_NAME, provider=OpenAIProvider(openai_client=client))


def mcp_toolset() -> MCPToolset:
    """One MCP connection (a stdio subprocess of mcp_server/server.py) shared by all agents.
    It points at the working database; the original is never opened for writing."""
    global _toolset
    if _toolset is None:
        transport = StdioTransport(
            command=sys.executable,
            args=[str(config.MCP_SERVER_PATH)],
            env={**os.environ, "CC_DB_PATH": str(config.WORKING_DB)},
        )
        _toolset = MCPToolset(Client(transport))
    return _toolset


def team_limits() -> UsageLimits:
    """Limits for everything the team does on one ticket (usage is shared across agents)."""
    return UsageLimits(
        request_limit=config.AGENT_REQUEST_LIMIT,
        tool_calls_limit=config.AGENT_TOOL_CALL_LIMIT,
        total_tokens_limit=config.AGENT_TOTAL_TOKEN_LIMIT,
    )


async def delegate(ctx: RunContext[TeamDeps], agent_name: AgentName, task: str) -> dict:
    """Ask another agent on the team to do part of the work and wait for its report.

    agent_name is one of: boss, inventory, accounting, facilities, customer_service. `task` must be
    specific: say which ticket, give the facts you already have, and say exactly what you need back.
    Any agent may ask any other agent, but you cannot ask yourself or an agent that is already
    waiting on you further up the chain, and there are caps on depth and total delegations.
    """
    from audit import run_with_audit  # local imports avoid a cycle with team.py
    from team import get_agent

    d = ctx.deps
    if agent_name not in AGENT_NAMES:
        return {"error": f"unknown agent '{agent_name}'. Choose from {list(AGENT_NAMES)}."}
    if agent_name == d.agent_name:
        return {"error": "You cannot delegate to yourself."}
    if agent_name in d.chain:
        return {"error": f"{agent_name} is already waiting on this request further up the chain; "
                "answer from the tools you have or report a blocker."}
    if d.depth + 1 > config.MAX_DELEGATION_DEPTH:
        return {"error": f"Delegation depth limit ({config.MAX_DELEGATION_DEPTH}) reached. Finish with what you have."}
    if d.state.delegations >= config.MAX_DELEGATIONS_PER_TICKET:
        return {"error": f"Delegation cap ({config.MAX_DELEGATIONS_PER_TICKET} per ticket) reached. Finish with what you have."}

    d.state.delegations += 1
    child = TeamDeps(
        ticket_id=d.ticket_id,
        agent_name=agent_name,
        run_id=uuid4().hex[:12],
        depth=d.depth + 1,
        chain=(*d.chain, d.agent_name),
        state=d.state,
    )
    d.state.log.append(f"{d.agent_name} -> {agent_name}: {task[:120]}")
    prompt = f"Ticket {d.ticket_id}. {d.agent_name} asks you: {task}"
    try:
        result = await run_with_audit(
            get_agent(agent_name), prompt, child, ctx.usage, team_limits(),
            {"task": task, "asked_by": d.agent_name}, parent_run_id=d.run_id,
        )
    except UsageLimitExceeded:
        raise  # a team-wide budget hit stops the whole ticket; team.py reports it
    except Exception as exc:  # a failure in one specialist should not crash the caller
        return {"error": f"{agent_name} failed: {type(exc).__name__}: {exc}"}
    return result.output.model_dump() if isinstance(result.output, AgentReport) else {"report": str(result.output)}


def build_agent(name: str, prompt_file: str, allowed_tools: set[str], output_type, can_delegate: bool = True) -> Agent:
    prompt = (config.PROMPTS_DIR / prompt_file).read_text()
    agent = Agent(
        build_model(),
        deps_type=TeamDeps,
        output_type=output_type,
        instructions=prompt,
        toolsets=[mcp_toolset().filtered(lambda ctx, tool_def: tool_def.name in allowed_tools)],
        # sequential=True: delegations run one at a time, in order, so two agents never work the same
        # ticket at once; plain reads can still be batched in one model step to save requests
        tools=[Tool(delegate, sequential=True)] if can_delegate else [],
        retries=config.RETRIES,
        model_settings=ModelSettings(max_tokens=config.MAX_OUTPUT_TOKENS),
        name=name,
    )

    @agent.instructions
    def run_context(ctx: RunContext[TeamDeps]) -> str:
        """Facts the program knows about this run, added to the static prompt on every run."""
        d = ctx.deps
        asked = f" You were asked by: {d.chain[-1]}." if d.chain else ""
        waiting = f" Agents waiting on you: {', '.join(d.chain)} (do not delegate back to them)." if d.chain else ""
        return (
            f"You are the {name} agent. Working on ticket {d.ticket_id}.{asked}{waiting} "
            f"Delegation depth {d.depth} of {config.MAX_DELEGATION_DEPTH}; "
            f"{d.state.delegations} of {config.MAX_DELEGATIONS_PER_TICKET} delegations used on this ticket. "
            "Batch independent read calls into one step when you can. "
            f"Always pass \"{name}\" as requested_by / author / updated_by when a tool asks who you are."
        )

    return agent
