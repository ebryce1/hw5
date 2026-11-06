"""Boss: reads each ticket, decides who works on it, makes the final call.

Least privilege: the boss can read the board, cash and approvals and update ticket status, but it
cannot spend money, create purchase orders, or draft messages itself; it delegates for those.
"""
from pydantic_ai import Agent

from agents.common import build_agent
from models import BoardPlan, BossDecision

TOOLS = {"list_open_tickets", "get_ticket", "update_ticket", "get_cash_position", "list_approvals", "list_drafts", "list_purchase_orders"}


# Triage is read-only planning: no delegation, no ticket updates, no spending.
TRIAGE_TOOLS = {"list_open_tickets", "get_ticket", "get_cash_position", "list_approvals"}


def build() -> Agent:
    return build_agent("boss", "boss.md", TOOLS, BossDecision)


def build_triage() -> Agent:
    return build_agent("boss", "boss.md", TRIAGE_TOOLS, BoardPlan, can_delegate=False)
