import type { Ticket } from '../api'
import { STATUS_LABEL, TICKET_TYPE } from '../agents'
import { Acorn } from './Acorn'
import { Elf } from './Elf'

export function TicketTray({ tickets, selected, runningId, courierOut, onSelect }: {
  tickets: Ticket[]; selected: number | null; runningId: number | null; courierOut: boolean; onSelect: (id: number) => void
}) {
  const open = tickets.filter((t) => t.state === 'open').length
  return (
    <aside className="tray" aria-label="Ticket board">
      <div className="panel-head">
        <h2>The acorn branch</h2>
        <span className="count">{open} open · {tickets.length - open} resolved</span>
      </div>
      <div className="couriers" aria-label="Courier elves">
        <div className="perch-elf"><Elf build="little" hat="#3a7a3a" tunic="#7aa04a" prop={null} /></div>
        <div className="perch-elf" data-walk="perch" style={{ visibility: courierOut ? 'hidden' : 'visible' }}><Elf build="little" hat="#8a4a1f" tunic="#c98a3e" prop={null} /></div>
        <p>{courierOut ? 'A courier is out walking an acorn around the tree.' : 'Couriers wait to carry your acorns.'}</p>
      </div>
      <ul>
        {tickets.map((t) => {
          const resolved = t.state === 'resolved'
          const carried = runningId === t.id
          return (
            <li key={t.id}>
              <button
                data-walk={`card-${t.id}`}
                data-stand="0.1"
                className={`acorn-card ticket-${t.status} ${selected === t.id ? 'is-selected' : ''} ${carried ? 'is-carried' : ''}`}
                onClick={() => onSelect(t.id)}
                aria-pressed={selected === t.id}
              >
                <Acorn gold={resolved} size={54} className={carried ? 'wiggle' : ''} />
                <span className="tag">
                  <span className="card-no">№ {t.id} · {TICKET_TYPE[t.type] ?? t.type}</span>
                  <strong className="card-subject">{t.subject}</strong>
                  <span className="card-who">{t.requester}</span>
                  {t.sku && <span className="card-line">{t.qty} × {t.sku} · {t.size}</span>}
                </span>
                <span className={`stamp stamp-${t.status}`}>{carried ? 'With the elves' : (STATUS_LABEL[t.status] ?? t.status)}</span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="tray-hint">Pick an acorn, then send it up the tree.</p>
    </aside>
  )
}
