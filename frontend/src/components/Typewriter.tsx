import { useEffect, useState } from 'react'

/** Types text out like a typewriter while the team is live; shows it at once when reading history. */
export function Typewriter({ text, live }: { text: string; live: boolean }) {
  const [n, setN] = useState(live ? 0 : text.length)
  useEffect(() => {
    if (!live) { setN(text.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 2
      setN(i)
      if (i >= text.length) clearInterval(id)
    }, 14)
    return () => clearInterval(id)
  }, [text, live])
  return (
    <>
      {text.slice(0, n)}
      {live && n < text.length && <span className="caret" />}
    </>
  )
}
