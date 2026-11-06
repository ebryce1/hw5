import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Elf } from './Elf'

// A courier elf who physically walks across the page carrying acorns between places that are
// marked with data-walk="..." (the acorn cards, the Head Elf, each specialist's nook, the High
// Elf, and the courier's perch on the branch). Trips are queued so one courier does them in turn.

interface Pose { x: number; y: number; ms: number; face: 1 | -1; walking: boolean; carrying: boolean }

const SPEED = 0.24 // pixels per millisecond (about 240px/s)
const W = 56, H = Math.round((56 * 205) / 160)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Where the courier's feet stand for a marked element (page coordinates). */
function stand(key: string): { x: number; y: number } | null {
  const el = document.querySelector<HTMLElement>(`[data-walk="${key}"]`)
  if (!el) return null
  const r = el.getBoundingClientRect()
  const f = parseFloat(el.dataset.stand ?? '0.5')
  return { x: r.left + window.scrollX + r.width * f, y: r.bottom + window.scrollY - 4 }
}

export function useCourier(): { send: (from: string, to: string) => void; out: boolean; layer: ReactNode } {
  const [pose, setPose] = useState<Pose | null>(null)
  const queue = useRef<{ from: string; to: string }[]>([])
  const busy = useRef(false)
  const at = useRef<{ x: number; y: number } | null>(null)
  const reduce = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  const walk = useCallback(async (to: { x: number; y: number } | null, carrying: boolean) => {
    if (!to) return
    const from = at.current ?? to
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    const ms = reduce.current ? 0 : Math.min(5000, Math.max(600, dist / SPEED))
    setPose((p) => ({ x: to.x, y: to.y, ms, face: to.x < from.x ? -1 : to.x > from.x ? 1 : (p?.face ?? 1), walking: dist > 4 && ms > 0, carrying }))
    at.current = to
    await sleep(ms + 40)
    setPose((p) => (p ? { ...p, walking: false } : p))
  }, [])

  const drain = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    for (;;) {
      while (queue.current.length) {
        const t = queue.current.shift()!
        const a = stand(t.from), b = stand(t.to)
        if (!a || !b) continue
        if (!at.current) { // step out of the perch (the idle elf on the branch) where the courier lives
          const home = stand('perch') ?? a
          at.current = home
          setPose({ x: home.x, y: home.y, ms: 0, face: 1, walking: false, carrying: false })
          await sleep(60)
        }
        await walk(a, false)         // go to where the acorn is
        await sleep(220)
        await walk(b, true)          // carry it across the page
        setPose((p) => (p ? { ...p, carrying: false } : p))
        await sleep(450)             // hand it over
      }
      const home = stand('perch')
      if (home) await walk(home, false) // walk back to the branch
      if (queue.current.length === 0) break
    }
    at.current = null
    setPose(null)
    busy.current = false
  }, [walk])

  const send = useCallback((from: string, to: string) => {
    queue.current.push({ from, to })
    void drain()
  }, [drain])

  useEffect(() => () => { queue.current = [] }, [])

  const layer = pose ? (
    <div className="walk-layer" aria-hidden="true">
      <div
        className={`walker ${pose.walking ? 'walking' : ''}`}
        style={{ width: W, height: H, transform: `translate(${pose.x - W / 2}px, ${pose.y - H}px)`, transition: `transform ${pose.ms}ms linear` }}
      >
        <div className="face" style={{ transform: `scaleX(${pose.face})` }}>
          <Elf build="little" hat="#8a4a1f" tunic="#c98a3e" prop={pose.carrying ? 'acorn' : null} />
        </div>
      </div>
    </div>
  ) : null

  return { send, out: pose !== null, layer }
}
