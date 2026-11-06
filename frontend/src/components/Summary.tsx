import { useState } from 'react'
import { AGENT_BY_ID, STATUS_LABEL, toolLabel } from '../agents'
import type { BossDecision } from '../api'
import type { AgentView } from '../derive'
import { Squirrel } from './Squirrel'

// "What each agent did", sung by a chorus of squirrels. Each squirrel speaks for one agent; the
// ones whose agent was never called are asleep, so you can see the Boss did not call everyone.
const LIMIT = 210

function Quote({ text, tools }: { text: string; tools: { name: string }[] }) {
  const [open, setOpen] = useState(false)
  const long = text.length > LIMIT
  return (
    <>
      <p>{open || !long ? text : text.slice(0, LIMIT).trimEnd() + '…'}</p>
      {long && <button className="more" onClick={() => setOpen(!open)}>{open ? 'less' : 'the whole song'}</button>}
      {tools.length > 0 && <ul className="chips">{tools.map((t) => <li key={t.name}>{toolLabel(t.name)}</li>)}</ul>}
    </>
  )
}

export function Summary({ views, decision, ticketId }: { views: AgentView[]; decision: BossDecision | null; ticketId: number | null }) {
  const spoke = views.filter((v) => v.consulted > 0).length
  return (
    <section className="chorus chorus-wide" aria-label="What each agent did">
      <div className="panel-head"><h2>The chorus</h2><span className="count">{spoke} of 5 had something to sing</span></div>
      <p className="chorus-sub">What each agent did{ticketId ? ` on acorn № ${ticketId}` : ''}, as told by the squirrels.</p>
      {decision && (
        <div className="scroll">
          <span className={`stamp stamp-${decision.final_status}`}>{STATUS_LABEL[decision.final_status] ?? decision.final_status}</span>
          <h3>The Head Elf's call</h3>
          <p>{decision.decision}</p>
          {decision.follow_ups.length > 0 && <ul>{decision.follow_ups.map((f, i) => <li key={i}>{f}</li>)}</ul>}
        </div>
      )}
      <ol className="branch-row">
        {views.map((v, i) => {
          const info = AGENT_BY_ID[v.id]
          const asleep = v.consulted === 0
          return (
            <li key={v.id} className={asleep ? 'asleep' : 'sings'} style={{ ['--c' as string]: info.color, ['--i' as string]: i }}>
              <div className="quote">
                {asleep ? <p className="muted">Zzz… nobody needed {info.name} this time.</p>
                  : <Quote text={v.said ?? (v.status === 'working' ? 'Still working…' : 'Said nothing at all.')} tools={v.tools} />}
              </div>
              <Squirrel scarf={info.color} asleep={asleep} />
              <span className="for">{info.name}</span>
            </li>
          )
        })}
      </ol>
      {spoke === 0 && <p className="muted pad">Send an acorn up the tree and the chorus will sing about it.</p>}
    </section>
  )
}
