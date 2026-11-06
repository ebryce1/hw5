// Everything the dashboard knows comes from the FastAPI backend (see output/harness.md, section 6).
export const API_BASE = 'http://localhost:8000'

export type TicketState = 'open' | 'resolved'
export interface Ticket {
  id: number
  type: string
  requester: string
  subject: string
  sku: string | null
  size: string | null
  qty: number | null
  status: string
  notes: string | null
  created_at: string
  state: TicketState
}
export interface TicketsResponse { today: string; running_ticket: number | null; tickets: Ticket[] }

export interface Cash {
  balance: number
  reserved_by_open_requests: number
  available_after_requests: number
  paid_out_so_far: number
}

export interface Approval {
  id: number
  kind: 'invoice' | 'rent' | 'purchase_order'
  ref_id: number
  amount: number
  ticket_id: number | null
  requested_by: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'paid'
  decided_by: string | null
}

export interface ToolUse { name: string; args: Record<string, unknown>; status: string | null; result: string | null }
export interface AgentEvent {
  timestamp: string
  run_id: string
  agent: string | null
  ticket_id: number | null
  depth: number | null
  parent_run_id: string | null
  kind: 'started' | 'tools' | 'finished' | 'human'
  said: string | null
  asked_by?: string | null
  tools: ToolUse[]
  iteration?: number | null
  stop_reason?: string | null
  tokens_in?: number | null
}

export interface BossDecision {
  ticket_id: number
  decision: string
  final_status: string
  reasoning: string
  approval_ids: number[]
  draft_ids: number[]
  follow_ups: string[]
}

export class ApiError extends Error {}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(API_BASE + path, init)
  } catch {
    throw new ApiError(`Can't reach the backend at ${API_BASE}. Start it with: uvicorn main:app --reload --port 8000 (from backend/).`)
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch { /* keep default */ }
    throw new ApiError(detail)
  }
  return res.json() as Promise<T>
}

const post = (body?: unknown) =>
  ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) satisfies RequestInit

export const api = {
  tickets: () => call<TicketsResponse>('/api/tickets'),
  cash: () => call<Cash>('/api/cash'),
  approvals: () => call<{ approvals: Approval[] }>('/api/approvals').then((r) => r.approvals),
  events: (after?: string) =>
    call<{ events: AgentEvent[] }>(`/api/events?limit=500${after ? `&after=${encodeURIComponent(after)}` : ''}`).then((r) => r.events),
  run: (id: number) => call<{ ticket_id: number; decision: BossDecision }>(`/api/tickets/${id}/run`, post()),
  approve: (id: number, approver: string) =>
    call<{ paid: number; new_balance: number }>(`/api/approvals/${id}/approve`, post({ approver })),
  reject: (id: number, approver: string) => call<unknown>(`/api/approvals/${id}/reject`, post({ approver })),
  resolve: (id: number, approver: string) => call<unknown>(`/api/tickets/${id}/resolve`, post({ approver })),
  reset: () => call<{ reset: boolean; balance: number }>('/api/reset', post()),
}
