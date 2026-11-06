"""Facilities: the shop space: leases, rent due dates, the landlord.

Read-only. Rent payments are prepared by accounting, so facilities delegates to it.
"""
from pydantic_ai import Agent

from agents.common import build_agent
from models import AgentReport

TOOLS = {"get_ticket", "get_lease_status", "get_cash_position", "list_approvals"}


def build() -> Agent:
    return build_agent("facilities", "facilities.md", TOOLS, AgentReport)
