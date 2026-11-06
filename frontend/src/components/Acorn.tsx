export function Acorn({ gold = false, size = 64, className = '' }: { gold?: boolean; size?: number; className?: string }) {
  const nut = gold ? '#f3c34a' : '#c98a3e'
  const cap = gold ? '#c9952a' : '#7b4b24'
  return (
    <svg className={`acorn ${className}`} width={size} height={size * 1.25} viewBox="0 0 60 75" aria-hidden="true">
      <path d="M30 10 V1" stroke="#5a3718" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M8 36 Q8 66 30 72 Q52 66 52 36 Z" fill={nut} stroke="rgba(0,0,0,.25)" strokeWidth="1.5" />
      <path d="M16 46 Q17 60 26 66" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="3" strokeLinecap="round" />
      <path d="M4 38 Q4 10 30 8 Q56 10 56 38 Q30 30 4 38 Z" fill={cap} stroke="rgba(0,0,0,.3)" strokeWidth="1.5" />
      <path d="M12 30 l8 -12 M22 32 l8 -16 M34 32 l6 -16 M44 30 l5 -10" stroke="rgba(0,0,0,.3)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
