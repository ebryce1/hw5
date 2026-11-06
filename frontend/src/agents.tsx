import type { ReactNode } from 'react'

export type AgentId = 'boss' | 'inventory' | 'accounting' | 'facilities' | 'customer_service'

export interface AgentInfo {
  id: AgentId; name: string; title: string; blurb: string; icon: ReactNode
  elf: string; color: string; hat: string; tunic: string; prop: 'acorn' | 'clipboard' | 'ledger' | 'wrench' | 'letter'
}

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
const svg = (children: ReactNode) => (
  <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" {...stroke}>{children}</svg>
)

// Each role gets its own glyph, colour (see styles.css .agent-<id>) and way of speaking.
export const AGENTS: AgentInfo[] = [
  { id: 'boss', name: 'Boss', title: 'Reads the ticket, makes the call', blurb: 'Decides who to call',
    elf: 'Head Elf', color: '#8a5a1f', hat: '#2c5f34', tunic: '#2c5f34', prop: 'acorn',
    icon: svg(<><path d="M5 22 L7 10 L13 16 L16 8 L19 16 L25 10 L27 22 Z" /><path d="M6 26 H26" /></>) },
  { id: 'inventory', name: 'Inventory', title: 'Stock, shortfalls, vendors', blurb: 'Counts the shelves',
    elf: 'Stock Elf', color: '#2f7d5a', hat: '#2f7d5a', tunic: '#58a678', prop: 'clipboard',
    icon: svg(<><path d="M5 12 L16 6 L27 12 L16 18 Z" /><path d="M5 12 V22 L16 28 V18" /><path d="M27 12 V22 L16 28" /></>) },
  { id: 'accounting', name: 'Accounting', title: 'Cash, invoices, margins', blurb: 'Guards the till',
    elf: 'Ledger Elf', color: '#b9791a', hat: '#7a4a12', tunic: '#d99a3a', prop: 'ledger',
    icon: svg(<><circle cx="16" cy="16" r="10" /><path d="M16 9 V23 M20 12.5 C18 10.5 12 11 12.5 14.5 C13 18 19.5 15.5 19.5 19 C19.5 22 14 22.5 12 20" /></>) },
  { id: 'facilities', name: 'Facilities', title: 'Lease, rent, the building', blurb: 'Keeps the lights on',
    elf: 'Hollow-Keeper Elf', color: '#4f6f8f', hat: '#2f4a66', tunic: '#6d8fb0', prop: 'wrench',
    icon: svg(<><path d="M6 27 V8 L16 4 L26 8 V27" /><path d="M3 27 H29" /><path d="M11 12 H13 M19 12 H21 M11 17 H13 M19 17 H21" /><path d="M14 27 V21 H18 V27" /></>) },
  { id: 'customer_service', name: 'Customer Service', title: 'Drafts the messages', blurb: 'Writes it kindly',
    elf: 'Letter Elf', color: '#a8446f', hat: '#7a2a50', tunic: '#c8648f', prop: 'letter',
    icon: svg(<><path d="M5 7 H27 V20 H15 L9 26 V20 H5 Z" /><path d="M10 12 H22 M10 16 H18" /></>) },
]

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, AgentInfo>
export const agentName = (id: string | null | undefined) => (id && AGENT_BY_ID[id as AgentId]?.name) || id || 'Someone'

// What a tool name means in plain words (used on tool chips and in the activity tape).
const TOOL_LABEL: Record<string, string> = {
  list_tickets: 'Looked at the board',
  list_open_tickets: 'Looked at open tickets',
  get_ticket: 'Read the ticket',
  update_ticket: 'Recorded the decision',
  check_stock: 'Checked stock',
  list_inventory: 'Counted the shelves',
  get_pricing: 'Looked up pricing',
  check_margin: 'Checked the margin',
  list_vendors: 'Checked vendors',
  get_invoice_status: 'Read the invoice',
  list_invoices: 'Listed invoices',
  get_lease_status: 'Read the lease',
  get_cash_position: 'Checked the cash',
  list_approvals: 'Looked at requests',
  list_drafts: 'Looked at drafts',
  create_draft_message: 'Drafted a message',
  request_payment_approval: 'Asked for payment approval',
  create_purchase_order: 'Prepared a purchase order',
  delegate: 'Asked a colleague',
}
export const toolLabel = (name: string) => TOOL_LABEL[name] ?? name.replace(/_/g, ' ')

export const TICKET_TYPE: Record<string, string> = {
  customer_order: 'Customer order',
  rent_notice: 'Rent notice',
  price_override: 'Discount request',
}
export const STATUS_LABEL: Record<string, string> = {
  open: 'New',
  in_progress: 'In progress',
  waiting_on_approval: 'Waiting on you',
  blocked: 'Blocked',
  resolved: 'Resolved',
}
