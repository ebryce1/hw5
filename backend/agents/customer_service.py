"""Customer service: drafts messages. Drafts stay on the board; nothing is ever sent."""
from pydantic_ai import Agent

from agents.common import build_agent
from models import AgentReport

TOOLS = {"get_ticket", "check_stock", "get_pricing", "list_vendors", "list_drafts", "create_draft_message"}


def build() -> Agent:
    return build_agent("customer_service", "customer_service.md", TOOLS, AgentReport)
