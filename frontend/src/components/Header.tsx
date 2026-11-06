import { useAnimatedNumber } from '../hooks'
import type { Cash } from '../api'
import { money } from '../derive'

function Calendar({ today }: { today: string }) {
  const d = new Date(today + 'T12:00:00')
  return (
    <div className="calendar" title="Shop date (desk.date_today)">
      <div className="cal-month">{d.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</div>
      <div className="cal-day">{d.getDate()}</div>
      <div className="cal-year">{d.getFullYear()}</div>
    </div>
  )
}

function Till({ cash, delta }: { cash: Cash | null; delta: number | null }) {
  const shown = useAnimatedNumber(cash?.balance ?? 0)
  const reserved = cash?.reserved_by_open_requests ?? 0
  const balance = cash?.balance ?? 0
  const pct = balance > 0 ? Math.min(100, (reserved / balance) * 100) : 0
  return (
    <div className="till" aria-label="Checking balance">
      <div className="till-label">Checking · acorn fund</div>
      <div className="till-digits" aria-live="polite">{cash ? money(shown) : '$ - - - - -'}</div>
      {delta !== null && <div className="till-delta" key={delta}>{delta < 0 ? '−' : '+'}{money(Math.abs(delta))}</div>}
      <div className="till-bar" title="Part of the balance already promised to requests waiting for a human">
        <span style={{ width: `${pct}%` }} />
      </div>
      <div className="till-sub">
        {cash ? <>Spoken for <b>{money(reserved)}</b> · Free <b>{money(cash.available_after_requests)}</b> · Paid out <b>{money(cash.paid_out_so_far)}</b></> : 'Waiting for the backend…'}
      </div>
    </div>
  )
}

export function Header({ today, cash, delta, busy, onReset }: {
  today: string | null; cash: Cash | null; delta: number | null; busy: boolean; onReset: () => void
}) {
  return (
    <header className="topbar">
      <div className="sign">
        <div className="sign-mark" aria-hidden="true"><svg viewBox="0 0 60 75" width="30" height="38"><path d="M8 36 Q8 66 30 72 Q52 66 52 36 Z" fill="#c98a3e"/><path d="M4 38 Q4 10 30 8 Q56 10 56 38 Q30 30 4 38 Z" fill="#5a3718"/><path d="M30 10 V1" stroke="#5a3718" strokeWidth="4"/></svg></div>
        <div>
          <h1>Campus Customs <span>Operations Desk</span></h1>
          <p>The elves of the hollow oak are on it</p>
        </div>
      </div>
      <div className="desk-things">
        {today && <Calendar today={today} />}
        <Till cash={cash} delta={delta} />
        <button className="reset" onClick={onReset} disabled={busy} title="Put the shop back to the original database">
          Reset desk
        </button>
      </div>
    </header>
  )
}
