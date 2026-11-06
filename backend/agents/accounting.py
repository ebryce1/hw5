"""Accounting: cash, invoices, margins; prepares payments and purchase orders for human approval.

The only role with request_payment_approval and create_purchase_order. It can prepare but never
approve or pay: record_human_approval and execute_approved_payment are not in any agent's tool
list; the backend's human approve route is what changes cash.
"""
from pydantic_ai import Agent

from agents.common import build_agent
from models import AgentReport

TOOLS = {"get_ticket", "get_cash_position", "list_invoices", "get_invoice_status", "get_lease_status",
         "get_pricing", "check_margin", "list_vendors", "check_stock", "list_approvals",
         "request_payment_approval", "create_purchase_order", "list_purchase_orders"}


def build() -> Agent:
    return build_agent("accounting", "accounting.md", TOOLS, AgentReport)
