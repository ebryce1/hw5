import { useState } from 'react'
import type { Approval, Cash } from '../api'
import { money } from '../derive'
import { Acorn } from './Acorn'
import { Elf } from './Elf'

const KIND: Record<string, string> = { invoice: 'Vendor invoice', rent: 'Rent', purchase_order: 'Purchase order' }

function Slip({ a, name, cash, onStamp, onReject, busy, stamping, error }: {
  a: Approval; name: string; cash: Cash | null; busy: boolean; stamping: boolean; error: string | null
  onStamp: (id: number) => void; onReject: (id: number) => void
}) {
  const pending = a.status === 'pending'
  const after = cash ? cash.balance - a.amount : null
  return (
    <li className={`slip slip-${a.status}`}>
      <div className="slip-acorn"><Acorn gold={a.status === 'paid'} size={46} /></div>
      <div className="slip-body">
        <div className="slip-top"><span className="slip-kind">{KIND[a.kind] ?? a.kind}</span><span className="slip-no">№ {a.id}{a.ticket_id ? ` · acorn ${a.ticket_id}` : ''}</span></div>
        <div className="slip-amount">{money(a.amount)}</div>
        <p className="slip-reason">{a.reason}</p>
        {pending && after !== null && (
          <p className={`slip-after ${after < 0 ? 'bad' : ''}`}>{after < 0 ? 'The fund cannot cover this.' : `After my stamp: ${money(after)} remains.`}</p>
        )}
        <p className="slip-by">Prepared by {a.requested_by}.</p>
        {pending ? (
          <div className="slip-actions">
            <button className="approve" disabled={busy || stamping || !name.trim()} onClick={() => onStamp(a.id)} title={name.trim() ? '' : 'Type your name first'}>Stamp it</button>
            <button className="reject" disabled={busy || stamping} onClick={() => onReject(a.id)}>Nay</button>
          </div>
        ) : (
          <span className={`stamp stamp-slip-${a.status}`}>{a.status === 'paid' ? 'STAMPED · PAID' : a.status === 'rejected' ? 'NAY' : 'APPROVED'}</span>
        )}
        {a.decided_by && <p className="slip-by">Stamped by {a.decided_by}.</p>}
        {error && <p className="slip-error" role="alert">{error}</p>}
      </div>
    </li>
  )
}

export function InTray({ approvals, cash, name, setName, busyId, errors, onApprove, onReject }: {
  approvals: Approval[]; cash: Cash | null; name: string; setName: (s: string) => void; busyId: number | null
  errors: Record<number, string>; onApprove: (id: number) => void; onReject: (id: number) => void
}) {
  const [showDone, setShowDone] = useState(true)
  const [stamping, setStamping] = useState(false)
  const [stampKey, setStampKey] = useState(0)
  // The High Elf winds up and slams the stamp; the payment is made at the moment of impact.
  function onStamp(id: number) {
    setStampKey((k) => k + 1)
    setStamping(true)
    setTimeout(() => onApprove(id), 700)
    setTimeout(() => setStamping(false), 1500)
  }
  const pending = approvals.filter((a) => a.status === 'pending')
  const done = approvals.filter((a) => a.status !== 'pending')
  const says = stamping ? 'So it is written.' : pending.length > 0
    ? `I foresaw this. ${pending.length} acorn${pending.length > 1 ? 's' : ''} await my stamp. The fund holds ${cash ? money(cash.balance) : 'more than you know'}.`
    : 'All is in order. I see every acorn in the hollow, even the ones not yet fallen.'
  return (
    <section className="intray" aria-label="Approvals waiting for you">
      <div className="panel-head"><h2>The High Elf</h2><span className="count">{pending.length} awaiting a stamp</span></div>
      <div className={`oracle ${stamping ? 'is-stamping' : ''}`}>
        <div className="oracle-figure" data-walk="high-elf" data-stand="0.8"><Elf build="high" prop={pending.length > 0 ? 'stamp' : null} stump={pending.length > 0} stamping={stamping} stampKey={stampKey} className="oracle-elf" /></div>
        <div className="oracle-bubble"><b>All-knowing</b><p>{says}</p></div>
      </div>
      <label className="signer">
        <span>Stamp as</span>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={40} />
      </label>
      <ul>
        {pending.map((a) => <Slip key={a.id} a={a} name={name} cash={cash} busy={busyId === a.id} stamping={stamping} error={errors[a.id] ?? null} onStamp={onStamp} onReject={onReject} />)}
        {pending.length === 0 && <li className="empty">Nothing to stamp. When an elf asks to spend acorns, the request lands here.</li>}
        {showDone && done.map((a) => <Slip key={a.id} a={a} name={name} cash={cash} busy={false} stamping={false} error={errors[a.id] ?? null} onStamp={onStamp} onReject={onReject} />)}
      </ul>
      {done.length > 0 && <button className="linklike" onClick={() => setShowDone(!showDone)}>{showDone ? 'Hide' : 'Show'} stamped acorns ({done.length})</button>}
    </section>
  )
}
