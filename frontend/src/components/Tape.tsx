import { AGENT_BY_ID, agentName, toolLabel, type AgentId } from '../agents'
import type { AgentEvent } from '../api'
import { clock } from '../derive'

function line(e: AgentEvent): string {
  if (e.kind === 'started') return e.asked_by ? `got a memo from ${agentName(e.asked_by)}` : 'picked up the ticket'
  if (e.kind === 'tools') return e.tools.map((t) => toolLabel(t.name).toLowerCase()).join(', ')
  if (e.kind === 'finished') return (e.said ?? 'finished').slice(0, 110) + ((e.said?.length ?? 0) > 110 ? '…' : '')
  try {
    const a = JSON.parse(e.said ?? '{}')
    return `${a.approver ?? 'someone'} ${a.action === 'approve' ? 'approved' : a.action === 'reject' ? 'rejected' : a.action === 'resolve' ? 'closed' : a.action} ${a.approval_id ? 'request ' + a.approval_id : a.ticket_id ? 'ticket ' + a.ticket_id : 'the desk'}`
  } catch { return 'human action' }
}

export function Tape({ events }: { events: AgentEvent[] }) {
  const recent = [...events].reverse().slice(0, 40)
  return (
    <section className="tape" aria-label="Activity tape">
      <div className="panel-head"><h2>Bark scroll</h2><span className="count">newest first</span></div>
      <ol>
        {recent.map((e, i) => (
          <li key={i} className={`t-${e.kind}`}>
            <time>{clock(e.timestamp)}</time>
            <span className={`who ${e.agent && e.agent !== 'human' ? 'agent-' + e.agent : 'is-human'}`}>{e.agent === 'human' ? 'You' : (e.agent ? (AGENT_BY_ID[e.agent as AgentId]?.elf ?? agentName(e.agent)) : 'Someone')}</span>
            <span className="what">{line(e)}</span>
            {e.ticket_id && <span className="tk">#{e.ticket_id}</span>}
          </li>
        ))}
        {recent.length === 0 && <li className="empty">Quiet hollow. Nothing has happened yet.</li>}
      </ol>
    </section>
  )
}
