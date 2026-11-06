import { useId } from 'react'

// A squirrel of the chorus: laurel wreath, agent-coloured scarf, one paw raised to speak.
export function Squirrel({ scarf, asleep = false }: { scarf: string; asleep?: boolean }) {
  const id = useId().replace(/:/g, '')
  const fur = '#a8683a'
  return (
    <svg className="squirrel" viewBox="0 0 130 140" role="img" aria-label={asleep ? 'sleeping squirrel' : 'squirrel'}>
      <defs><linearGradient id={`tail${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c98a50" /><stop offset="1" stopColor="#8a5028" /></linearGradient></defs>
      <path d="M78 118 C128 118 134 62 104 34 C98 60 86 70 70 80 Z" fill={`url(#tail${id})`} stroke="#6e4020" strokeWidth="1.5" />
      <path d="M100 44 C108 64 98 84 84 100" fill="none" stroke="#e3b784" strokeWidth="4" strokeLinecap="round" opacity=".7" />
      <ellipse cx="60" cy="100" rx="25" ry="30" fill={fur} stroke="#6e4020" strokeWidth="1.5" /><ellipse cx="58" cy="106" rx="14" ry="21" fill="#f0d9b5" />
      <path d="M44 96 Q30 90 26 70" fill="none" stroke={fur} strokeWidth="10" strokeLinecap="round" /><circle cx="26" cy="68" r="6" fill={fur} stroke="#6e4020" />
      <path d="M76 100 Q88 106 90 118" fill="none" stroke={fur} strokeWidth="10" strokeLinecap="round" />
      <circle cx="60" cy="58" r="22" fill={fur} stroke="#6e4020" strokeWidth="1.5" />
      <path d="M42 44 L38 24 L54 38 Z M78 44 L82 24 L66 38 Z" fill={fur} stroke="#6e4020" strokeWidth="1.5" /><path d="M43 40 L41 29 L50 37 Z M77 40 L79 29 L70 37 Z" fill="#f0a6a0" />
      <ellipse cx="60" cy="66" rx="12" ry="9" fill="#f0d9b5" />
      {asleep ? <path d="M46 56 q5 4 10 0 M64 56 q5 4 10 0" fill="none" stroke="#2a1a10" strokeWidth="2.2" strokeLinecap="round" /> : <>
        <circle cx="51" cy="55" r="3.6" fill="#1f130b" /><circle cx="69" cy="55" r="3.6" fill="#1f130b" /><circle cx="52" cy="54" r="1.2" fill="#fff" /><circle cx="70" cy="54" r="1.2" fill="#fff" />
      </>}
      <ellipse cx="60" cy="62" rx="3.2" ry="2.4" fill="#2a1a10" /><path d="M56 68 h8 v5 h-8 Z" fill="#fff" stroke="#c9b48a" strokeWidth=".8" />
      <path d="M38 76 Q60 90 82 76 L84 85 Q60 100 36 85 Z" fill={scarf} stroke="rgba(0,0,0,.25)" />
      {/* laurel wreath */}
      {[-52, -34, -16, 16, 34, 52].map((a) => (
        <ellipse key={a} cx={60 + 24 * Math.sin((a * Math.PI) / 180)} cy={50 - 24 * Math.cos((a * Math.PI) / 180)} rx="6" ry="3" fill="#4f9a4f" stroke="#2f6b3a" strokeWidth=".8" transform={`rotate(${a} ${60 + 24 * Math.sin((a * Math.PI) / 180)} ${50 - 24 * Math.cos((a * Math.PI) / 180)})`} />
      ))}
      {asleep && <text x="92" y="30" fontSize="16" fontFamily="Special Elite, serif" fill="#cfe0ff">z z</text>}
    </svg>
  )
}
