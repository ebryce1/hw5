import { AGENT_BY_ID, AGENTS, agentName, toolLabel, type AgentId } from '../agents'
import type { AgentView, Handoff } from '../derive'
import { Acorn } from './Acorn'
import { Elf } from './Elf'
import { Typewriter } from './Typewriter'

function Dots() {
  return <span className="dots" aria-label="working"><i /><i /><i /></span>
}

// Long reports are clipped here; the squirrel chorus below carries the full text.
const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() + '…' : t)

function Bubble({ view, live, hasSession }: { view: AgentView; live: boolean; hasSession: boolean }) {
  const max = view.id === 'boss' ? 300 : 150
  let body: React.ReactNode
  if (view.status === 'working') {
    const task = view.id === 'boss' && view.task === 'work ticket' ? 'An acorn! Let me see who this belongs to.' : (view.task ?? '')
    body = <>
      <p className="say"><Typewriter text={clip(task, max)} live={live} /></p>
      <p className="doing"><Dots /> {view.currentTool ? toolLabel(view.currentTool) : 'Thinking it over'}</p>
    </>
  } else if (view.status === 'done' && view.said) {
    body = <p className="say"><Typewriter text={clip(view.said, max)} live={live} /></p>
  } else if (view.status === 'failed') {
    body = <p className="say muted">Dropped the acorn{view.said ? `: ${view.said}` : '.'}</p>
  } else {
    body = <p className="say muted">{hasSession ? 'Napping. Not needed on this acorn.' : 'Waiting for an acorn.'}</p>
  }
  return <div className="bubble">{body}</div>
}

function Chips({ view }: { view: AgentView }) {
  if (view.tools.length === 0) return null
  return (
    <ul className="chips">
      {view.tools.map((t) => <li key={t.name} title={t.name}>{toolLabel(t.name)}{t.count > 1 ? ` ×${t.count}` : ''}</li>)}
    </ul>
  )
}

function Nook({ view, live, hasSession, index }: { view: AgentView; live: boolean; hasSession: boolean; index: number }) {
  const info = AGENT_BY_ID[view.id]
  const got = view.consulted > 0
  return (
    <article className={`nook agent-${view.id} is-${view.status}`} aria-label={`${info.elf}: ${view.status}`} style={{ ['--c' as string]: info.color }}>
      {got && <div className="toss" key={view.id + '-toss'} style={{ ['--dx' as string]: `${(1.5 - index) * 190}px` }}><Acorn size={34} /></div>}
      <div className="elf-wrap" data-walk={`nook-${view.id}`} data-stand="0.78"><Elf build="team" hat={info.hat} tunic={info.tunic} prop={info.prop} asleep={view.status === 'idle'} className={view.status === 'working' ? 'busy' : ''} /></div>
      <div className="plate"><b>{info.elf}</b><small>{info.name}</small><span className={`light light-${view.status}`} title={view.status} /></div>
      {view.askedBy && view.status !== 'idle' && <div className="memo">Acorn from the {agentName(view.askedBy)}</div>}
      <Bubble view={view} live={live} hasSession={hasSession} />
      <Chips view={view} />
    </article>
  )
}

export function TeamRoom({ views, live, hasSession, routes }: {
  views: AgentView[]; live: boolean; hasSession: boolean; routes: Handoff[]
}) {
  const byId = Object.fromEntries(views.map((v) => [v.id, v])) as Record<AgentId, AgentView>
  const boss = AGENT_BY_ID.boss
  const staff = AGENTS.filter((a) => a.id !== 'boss')
  return (
    <section className="room" aria-label="The team">
      <div className="panel-head"><h2>The hollow oak</h2><span className="count">{live ? 'Live' : hasSession ? 'Last run' : 'Quiet'}</span></div>
      <div className="tree">
        <svg className="canopy" viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden="true">
          {[[60, 70, 70], [150, 50, 70], [250, 62, 80], [360, 40, 80], [470, 55, 85], [580, 42, 78], [680, 62, 74], [760, 76, 62], [100, 96, 54], [330, 90, 60], [560, 92, 56]].map(([x, y, r], i) => (
            <circle key={i} cx={x} cy={y} r={r} fill={i % 3 === 0 ? '#2f6b3a' : i % 3 === 1 ? '#3b8143' : '#285a32'} />
          ))}
        </svg>
        <div className="trunk">
          <div className="chamber">
            <div className="elf-wrap big" data-walk="head-elf" data-stand="0.12">
              <Elf build="head" hat={boss.hat} tunic={boss.tunic} prop={hasSession || live ? 'acorn' : null} asleep={false} className={byId.boss.status === 'working' ? 'busy' : ''} />
            </div>
            <div className="chamber-talk">
              <div className="plate"><b>{boss.elf}</b><small>Boss · old, grey, and ripped</small><span className={`light light-${byId.boss.status}`} /></div>
              <Bubble view={byId.boss} live={live} hasSession={hasSession} />
              <Chips view={byId.boss} />
            </div>
          </div>
          <div className="walkway" aria-hidden="true" />
          <div className="nooks">
            {staff.map((a, i) => <Nook key={a.id} view={byId[a.id]} live={live} hasSession={hasSession} index={i} />)}
          </div>
        </div>
        <div className="roots" aria-hidden="true" />
      </div>
      <div className="route" aria-label="Who passed the acorn to whom">
        <span className="route-label">Acorn route</span>
        {routes.length === 0 && <span className="muted">No hand-offs yet.</span>}
        {routes.map((r, i) => (
          <span key={i} className="hop" title={r.task}>
            <b className="dot" style={{ ['--c' as string]: AGENT_BY_ID[r.from as AgentId]?.color }} />{AGENT_BY_ID[r.from as AgentId]?.elf ?? r.from}<em>→</em>
            <b className="dot" style={{ ['--c' as string]: AGENT_BY_ID[r.to as AgentId]?.color }} />{AGENT_BY_ID[r.to as AgentId]?.elf ?? r.to}
          </span>
        ))}
      </div>
    </section>
  )
}
