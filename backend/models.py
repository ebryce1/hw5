"""Pydantic data types for the Campus Customs agent team.

* AgentReport / BossDecision / BoardPlan: what the agents must hand back (structured outputs).
* TeamDeps: the run context every agent shares (which ticket, who called whom, loop guards).
* AuditEntry / ToolCallRecord: one line of output/audit_trail.json.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from pydantic import BaseModel, Field

AgentName = Literal["boss", "inventory", "accounting", "facilities", "customer_service"]
AGENT_NAMES: tuple[str, ...] = ("boss", "inventory", "accounting", "facilities", "customer_service")
TicketStatus = Literal["open", "in_progress", "waiting_on_approval", "blocked", "resolved"]


class AgentReport(BaseModel):
    """What a specialist (inventory, accounting, facilities, customer service) returns to whoever
    asked. Short and structured so the caller can use it without re-reading a long essay."""

    agent: AgentName
    summary: str = Field(description="2-4 sentences: what you found or did, in plain words.")
    facts: list[str] = Field(
        default_factory=list,
        description="Facts you read from tools, each with the number or date, e.g. 'tee S qty 0'.",
    )
    actions_taken: list[str] = Field(
        default_factory=list,
        description="Things you changed through tools (approval requested, draft saved, etc.).",
    )
    approval_ids: list[int] = Field(
        default_factory=list, description="Ids of any approval requests you created (human must decide)."
    )
    draft_ids: list[int] = Field(default_factory=list, description="Ids of any message drafts you saved.")
    blockers: list[str] = Field(
        default_factory=list, description="Anything that stops this work, e.g. 'vendor will not ship'."
    )
    recommendation: str = Field(description="What the caller should do next.")


class BossDecision(BaseModel):
    """The boss's final call on one ticket."""

    ticket_id: int
    decision: str = Field(description="The final call, one or two sentences.")
    final_status: TicketStatus
    reasoning: str = Field(description="Why, citing the facts the specialists reported.")
    approval_ids: list[int] = Field(default_factory=list, description="Approvals now waiting on a human.")
    draft_ids: list[int] = Field(default_factory=list, description="Drafts saved on the board.")
    follow_ups: list[str] = Field(default_factory=list, description="What must happen next, and who does it.")


class BoardPlan(BaseModel):
    """The boss's triage of the whole board: which ticket to work first, and why."""

    order: list[int] = Field(description="Ticket ids, first to work on first. Every open ticket once.")
    reasoning: str = Field(description="Why this order, especially where tickets compete for cash.")


@dataclass
class DelegationState:
    """Counters shared by every agent working on one ticket, so guards hold across the whole tree."""

    delegations: int = 0
    log: list[str] = field(default_factory=list)


@dataclass
class TeamDeps:
    """Context passed to each agent run (via RunContext.deps)."""

    ticket_id: int | None
    agent_name: str
    run_id: str
    depth: int = 0
    chain: tuple[str, ...] = ()  # agents currently waiting on a delegate() call, outermost first
    state: DelegationState = field(default_factory=DelegationState)


class ToolCallRecord(BaseModel):
    tool_name: str
    args: dict = Field(default_factory=dict)
    status: str = "pending"  # ok | retry | pending
    result_summary: str | None = None


class AuditEntry(BaseModel):
    """One record in output/audit_trail.json. event is run_start, iteration, run_end, or human_action
    (a person approving, rejecting or resetting through the backend)."""

    timestamp: str
    run_id: str
    event: Literal["run_start", "iteration", "run_end", "human_action"]
    agent: str | None = None
    ticket_id: int | None = None
    parent_run_id: str | None = None
    depth: int | None = None
    iteration: int | None = None
    model: str | None = None
    inputs: dict | None = None
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    stop_reason: str | None = None
    output_summary: str | None = None
    tokens_in: int | None = None
    tokens_out: int | None = None
    error: str | None = None
