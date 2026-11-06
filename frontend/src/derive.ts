import type { AgentEvent } from './api'
import { AGENTS, type AgentId } from './agents'

export type AgentStatus = 'idle' | 'working' | 'done' | 'failed'
export interface AgentView {
  id: AgentId
  status: AgentStatus
  askedBy: string | null
  task: string | null
  said: string | null
  tools: { name: string; count: number }[]
  currentTool: string | null
  consulted: number
}
export interface Handoff { from: string; to: string; task: string; timestamp: string }

/** Events after the most recent reset: a reset puts the shop back to the start, so older runs are history. */
export function sinceReset(events: AgentEvent[]): AgentEvent[] {
  let at = -1
  events.forEach((e, i) => { if (e.kind === 'human' && e.said?.includes('"action": "reset"')) at = i })
  return events.slice(at + 1)
}

/** The latest team run on one ticket: everything from the last time the boss was started on it. */
export function latestSession(events: AgentEvent[], ticketId: number): AgentEvent[] {
  const mine = events.filter((e) => e.ticket_id === ticketId)
  let start = -1
  mine.forEach((e, i) => { if (e.agent === 'boss' && e.kind === 'started' && e.depth === 0) start = i })
  return start < 0 ? [] : mine.slice(start)
}

export function buildAgents(session: AgentEvent[], running: boolean): AgentView[] {
  return AGENTS.map(({ id }) => {
    const mine = session.filter((e) => e.agent === id)
    const starts = mine.filter((e) => e.kind === 'started')
    const finished = mine.filter((e) => e.kind === 'finished')
    const openRuns = starts.filter((s) => !finished.some((f) => f.run_id === s.run_id))
    const counts = new Map<string, number>()
    mine.filter((e) => e.kind === 'tools').forEach((e) => e.tools.forEach((t) => counts.set(t.name, (counts.get(t.name) ?? 0) + 1)))
    const lastTools = [...mine].reverse().find((e) => e.kind === 'tools')
    const lastFinished = finished[finished.length - 1]
    const lastStart = openRuns[openRuns.length - 1] ?? starts[starts.length - 1]
    let status: AgentStatus = 'idle'
    if (openRuns.length) status = running ? 'working' : 'failed'
    else if (finished.length) status = finished.some((f) => f.stop_reason === 'error') ? 'failed' : 'done'
    return {
      id,
      status,
      askedBy: lastStart?.asked_by ?? null,
      task: lastStart?.said ?? null,
      said: lastFinished?.said ?? null,
      tools: [...counts].map(([name, count]) => ({ name, count })),
      currentTool: status === 'working' ? (lastTools?.tools[lastTools.tools.length - 1]?.name ?? null) : null,
      consulted: starts.length,
    }
  })
}

export function handoffs(session: AgentEvent[]): Handoff[] {
  return session
    .filter((e) => e.kind === 'started' && e.asked_by)
    .map((e) => ({ from: e.asked_by as string, to: e.agent as string, task: e.said ?? '', timestamp: e.timestamp }))
}

export const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
