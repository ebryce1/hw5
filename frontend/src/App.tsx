import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, type AgentEvent, type Approval, type BossDecision, type Cash, type Ticket } from './api'
import { buildAgents, handoffs, latestSession, sinceReset } from './derive'
import { STATUS_LABEL, TICKET_TYPE } from './agents'
import { useInterval } from './hooks'
import { Header } from './components/Header'
import { TicketTray } from './components/TicketTray'
import { TeamRoom } from './components/TeamRoom'
import { Summary } from './components/Summary'
import { InTray } from './components/InTray'
import { Tape } from './components/Tape'
import { useCourier } from './components/Courier'

const eventKey = (e: AgentEvent) => `${e.timestamp}|${e.run_id}|${e.kind}|${e.iteration ?? ''}`
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e))

export default function App() {
  const [today, setToday] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [serverRunning, setServerRunning] = useState<number | null>(null)
  const [localRunning, setLocalRunning] = useState<number | null>(null)
  const [cash, setCash] = useState<Cash | null>(null)
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [decisions, setDecisions] = useState<Record<number, BossDecision>>({})
  const [error, setError] = useState<string | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [busyApproval, setBusyApproval] = useState<number | null>(null)
  const [slipErrors, setSlipErrors] = useState<Record<number, string>>({})
  const [name, setName] = useState(() => localStorage.getItem('cc-signer') ?? '')
  const lastTs = useRef<string | undefined>(undefined)
  const seenApprovals = useRef<Set<number> | null>(null)
  const courier = useCourier()

  const runningId = localRunning ?? serverRunning
  const running = runningId !== null

  useEffect(() => { localStorage.setItem('cc-signer', name) }, [name])

  const refreshCore = useCallback(async () => {
    try {
      const [t, c, a] = await Promise.all([api.tickets(), api.cash(), api.approvals()])
      setToday(t.today); setTickets(t.tickets); setServerRunning(t.running_ticket)
      setCash(c); setApprovals(a)
      setSelected((cur) => cur ?? t.tickets[0]?.id ?? null)
      setError((cur) => (cur && cur.startsWith("Can't reach") ? null : cur))
    } catch (e) { setError(msg(e)) }
  }, [])

  const refreshEvents = useCallback(async () => {
    try {
      const fresh = await api.events(lastTs.current)
      if (fresh.length === 0) return
      lastTs.current = fresh[fresh.length - 1].timestamp
      setEvents((prev) => {
        const seen = new Set(prev.map(eventKey))
        return [...prev, ...fresh.filter((e) => !seen.has(eventKey(e)))]
      })
    } catch (e) { setError(msg(e)) }
  }, [])

  useEffect(() => { refreshCore(); refreshEvents() }, [refreshCore, refreshEvents])
  // fast while the team is working, slow otherwise
  useInterval(() => { refreshCore(); refreshEvents() }, running ? 1000 : 6000)

  // When an agent prepares a new payment request, a courier brings that acorn to the High Elf.
  useEffect(() => {
    const pendingIds = new Set(approvals.filter((a) => a.status === 'pending').map((a) => a.id))
    if (seenApprovals.current === null) { seenApprovals.current = pendingIds; return }
    approvals.filter((a) => a.status === 'pending' && !seenApprovals.current!.has(a.id)).forEach((a) => {
      courier.send(document.querySelector(`[data-walk="nook-${a.requested_by}"]`) ? `nook-${a.requested_by}` : 'head-elf', 'high-elf')
    })
    seenApprovals.current = pendingIds
  }, [approvals, courier.send]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleEvents = useMemo(() => sinceReset(events), [events])
  const session = useMemo(() => (selected ? latestSession(visibleEvents, selected) : []), [visibleEvents, selected])
  const live = running && runningId === selected
  const views = useMemo(() => buildAgents(session, live), [session, live])
  const routes = useMemo(() => handoffs(session), [session])
  const ticket = tickets.find((t) => t.id === selected) ?? null
  const hasSession = session.length > 0

  // The boss's final call: from this page's own run if we have it, else from the audit trail.
  const decision = useMemo<BossDecision | null>(() => {
    if (!ticket || !hasSession) return null
    if (decisions[ticket.id]) return decisions[ticket.id]
    const fin = [...session].reverse().find((e) => e.agent === 'boss' && e.kind === 'finished' && e.depth === 0)
    return fin ? { ticket_id: ticket.id, decision: fin.said ?? '', final_status: ticket.status, reasoning: '', approval_ids: [], draft_ids: [], follow_ups: [] } : null
  }, [ticket, hasSession, decisions, session])

  const myOpenRequests = approvals.filter((a) => a.ticket_id === selected && (a.status === 'pending' || a.status === 'approved'))
  const canClose = !!ticket && ticket.state === 'open' && hasSession && !live && myOpenRequests.length === 0

  async function onRun() {
    if (!ticket || running) return
    setError(null); setLocalRunning(ticket.id)
    courier.send(`card-${ticket.id}`, 'head-elf') // a courier walks the acorn to the Head Elf
    try {
      const r = await api.run(ticket.id)
      setDecisions((d) => ({ ...d, [ticket.id]: r.decision }))
    } catch (e) { setError(msg(e)) }
    finally {
      setLocalRunning(null)
      await Promise.all([refreshCore(), refreshEvents()])
      courier.send('head-elf', `card-${ticket.id}`) // and carries it back to the branch when the run is over
    }
  }

  async function onApprove(id: number) {
    const a = approvals.find((x) => x.id === id)
    setBusyApproval(id); setSlipErrors((s) => ({ ...s, [id]: '' }))
    try {
      const r = await api.approve(id, name.trim())
      if (a) setDelta(-r.paid)
      setTimeout(() => setDelta(null), 3500)
    } catch (e) { setSlipErrors((s) => ({ ...s, [id]: msg(e) })) }
    finally { setBusyApproval(null); await Promise.all([refreshCore(), refreshEvents()]) }
  }

  async function onReject(id: number) {
    setBusyApproval(id)
    try { await api.reject(id, name.trim() || 'Desk'); }
    catch (e) { setSlipErrors((s) => ({ ...s, [id]: msg(e) })) }
    finally { setBusyApproval(null); await Promise.all([refreshCore(), refreshEvents()]) }
  }

  async function onClose() {
    if (!ticket) return
    try { await api.resolve(ticket.id, name.trim() || 'Desk') } catch (e) { setError(msg(e)) }
    await Promise.all([refreshCore(), refreshEvents()])
  }

  async function onReset() {
    if (!window.confirm('Reset the desk? Tickets, cash, approvals and drafts go back to the original database. The audit trail is kept.')) return
    try {
      await api.reset()
      setDecisions({}); setSlipErrors({})
      await Promise.all([refreshCore(), refreshEvents()])
    } catch (e) { setError(msg(e)) }
  }

  return (
    <div className="desktop">
      {courier.layer}
      <Header today={today} cash={cash} delta={delta} busy={running} onReset={onReset} />
      {error && (
        <div className="banner" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">×</button>
        </div>
      )}
      <main className="grid">
        <TicketTray tickets={tickets} selected={selected} runningId={runningId} courierOut={courier.out} onSelect={setSelected} />

        <div className="center">
          {ticket ? (
            <section className={`sheet sheet-${ticket.status}`} aria-label={`Ticket ${ticket.id}`}>
              <div className="sheet-main">
                <p className="eyebrow">Ticket № {ticket.id} · {TICKET_TYPE[ticket.type] ?? ticket.type}</p>
                <h2>{ticket.subject}</h2>
                <p className="sheet-meta">
                  From <b>{ticket.requester}</b>
                  {ticket.sku && <> · <b>{ticket.qty} × {ticket.sku}</b>, size {ticket.size}</>}
                  {' · '}
                  <span className={`status-text s-${ticket.status}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
                </p>
                {ticket.notes && <pre className="notes">{ticket.notes}</pre>}
              </div>
              <div className="sheet-actions">
                {ticket.state === 'resolved' ? (
                  <div className="resolved-seal" aria-label="Resolved"><span>RESOLVED</span></div>
                ) : (
                  <button className="run" onClick={onRun} disabled={running}>
                    {live ? <>Team is working<span className="dots"><i /><i /><i /></span></> : hasSession ? 'Run the team again' : 'Send the acorn up the tree'}
                  </button>
                )}
                {canClose && <button className="close" onClick={onClose}>Mark resolved</button>}
                {running && !live && <p className="hint">Busy with ticket {runningId}.</p>}
              </div>
            </section>
          ) : (
            <section className="sheet"><p className="muted pad">Waiting for the board…</p></section>
          )}
          <TeamRoom views={views} live={live} hasSession={hasSession} routes={routes} />
        </div>

        <div className="side">
          <InTray approvals={approvals} cash={cash} name={name} setName={setName} busyId={busyApproval} errors={slipErrors} onApprove={onApprove} onReject={onReject} />
          <Tape events={visibleEvents} />
        </div>
        <Summary views={views} decision={decision} ticketId={ticket?.id ?? null} />
      </main>
    </div>
  )
}
