"""Inventory: stock by sku and size, shortfalls, which vendor can restock and whether they ship.

Read-only on shop data. It cannot create orders or payments; it delegates to accounting for those.
"""
from pydantic_ai import Agent

from agents.common import build_agent
from models import AgentReport

TOOLS = {"get_ticket", "check_stock", "list_inventory", "get_pricing", "list_vendors",
         "get_invoice_status", "list_invoices", "list_purchase_orders"}


def build() -> Agent:
    return build_agent("inventory", "inventory.md", TOOLS, AgentReport)
