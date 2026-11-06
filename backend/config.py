"""Settings shared by every agent: the one allowed model, the gateway, paths, and the limits that
keep a multi-agent run from burning tokens.

Only ONE model is used anywhere in this project: gpt-6-luna, through Portkey. It is a constant,
not an environment variable, so nothing in .env or the shell can swap in a different model.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent
PROMPTS_DIR = BACKEND_DIR / "prompts"
OUTPUT_DIR = PROJECT_ROOT / "output"
# CC_AUDIT_PATH lets scratch test runs write elsewhere; real runs append to output/audit_trail.json.
AUDIT_PATH = Path(os.environ.get("CC_AUDIT_PATH") or OUTPUT_DIR / "audit_trail.json")
MCP_SERVER_PATH = PROJECT_ROOT / "mcp_server" / "server.py"
ORIGINAL_DB = PROJECT_ROOT / "data" / "campus_customs.db"  # never written to
WORKING_DB = PROJECT_ROOT / "data" / "campus_customs_new.db"  # what the MCP server writes to

MODEL_NAME = "gpt-6-luna"  # the only model used by any agent
PORTKEY_BASE_URL = "https://api.portkey.ai/v1"

# --- limits that keep token use in check -----------------------------------------------------
MAX_DELEGATION_DEPTH = 3  # boss -> specialist -> specialist -> specialist, no deeper
MAX_DELEGATIONS_PER_TICKET = 8  # total delegate() calls across one ticket's whole run
AGENT_REQUEST_LIMIT = 60  # model requests across ALL agents working one ticket (shared usage)
AGENT_TOOL_CALL_LIMIT = 60  # tool calls across all agents working one ticket
AGENT_TOTAL_TOKEN_LIMIT = 250_000  # input+output tokens across all agents working one ticket
MAX_OUTPUT_TOKENS = 2_000  # per model response
RETRIES = 2  # per tool call / output validation
SUMMARY_CHARS = 300  # how much of an arg/result is kept in one audit record
SAID_CHARS = 1200  # how much of an agent's final words are kept (the dashboard shows these)


def load_env() -> None:
    """Load PORTKEY_API_KEY from the first .env found: hw5/, then each parent folder."""
    for base in (PROJECT_ROOT, *PROJECT_ROOT.parents):
        env_path = base / ".env"
        if env_path.is_file():
            load_dotenv(env_path)
            break
    if not os.getenv("PORTKEY_API_KEY"):
        raise RuntimeError("PORTKEY_API_KEY is missing. Put it in hw5/.env (see .env.example).")
