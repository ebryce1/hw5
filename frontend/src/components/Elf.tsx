import { useId, type ReactNode } from 'react'

// Original cartoon elves drawn as SVG. Four builds, from little courier to the all-knowing High Elf.
export type Build = 'little' | 'team' | 'head' | 'high'
export type Prop = 'acorn' | 'clipboard' | 'ledger' | 'wrench' | 'letter' | 'stamp' | null

const SKIN = '#f0c39a'
const SKIN_D = '#d79f78'
const GREY = '#d9dde2'

function PropArt({ prop, x, y }: { prop: Prop; x: number; y: number }) {
  switch (prop) {
    case 'clipboard':
      return (
        <g transform={`translate(${x - 12} ${y - 30})`}>
          <rect width="24" height="32" rx="3" fill="#8a5a2b" /><rect x="3" y="5" width="18" height="24" rx="1.5" fill="#fffdf2" />
          <path d="M6 12 H18 M6 17 H18 M6 22 H14" stroke="#2f7d5a" strokeWidth="1.6" /><rect x="8" y="1" width="8" height="5" rx="1.5" fill="#b9bfc7" />
        </g>
      )
    case 'ledger':
      return (
        <g transform={`translate(${x - 14} ${y - 30})`}>
          <rect width="28" height="26" rx="2" fill="#7a3d18" /><rect x="3" y="3" width="22" height="20" fill="#f6edd2" />
          <path d="M6 9 H22 M6 14 H22 M6 19 H17" stroke="#b9791a" strokeWidth="1.4" />
          <circle cx="24" cy="4" r="6" fill="#f0c04a" stroke="#b78a1c" strokeWidth="1.5" /><text x="24" y="7" fontSize="8" textAnchor="middle" fill="#8a6310" fontWeight="700">$</text>
        </g>
      )
    case 'wrench':
      return (
        <g transform={`translate(${x} ${y}) rotate(-28)`}>
          <rect x="-3" y="-34" width="6" height="40" rx="3" fill="#9aa3ad" />
          <path d="M-9 -34 a9 9 0 1 1 18 0 l-5 0 a4 4 0 1 0 -8 0 Z" fill="#b9c1ca" />
        </g>
      )
    case 'letter':
      return (
        <g transform={`translate(${x - 15} ${y - 24})`}>
          <rect width="30" height="21" rx="2" fill="#fffdf2" stroke="#c9a46a" /><path d="M1 2 L15 13 L29 2" fill="none" stroke="#c9a46a" strokeWidth="1.6" />
          <path d="M26 -2 q10 -14 14 -26 q-14 8 -14 26" fill="#f3b8d3" stroke="#a8446f" strokeWidth="1" />
        </g>
      )
    case 'stamp':
      return (
        <g transform={`translate(${x} ${y})`}>
          <circle cx="0" cy="-30" r="8" fill="#8a5a2b" stroke="#5a3718" strokeWidth="1.5" />
          <rect x="-4" y="-24" width="8" height="40" rx="3" fill="#a87238" stroke="#5a3718" />
          <rect x="-15" y="16" width="30" height="10" rx="3" fill="#7b4b24" stroke="#5a3718" strokeWidth="1.5" />
          <rect x="-13" y="26" width="26" height="5" rx="2" fill="#4a2380" />
        </g>
      )
    case 'acorn':
      return (
        <g transform={`translate(${x - 11} ${y - 28})`}>
          <path d="M3 14 Q3 29 11 31 Q19 29 19 14 Z" fill="#e0a64a" /><path d="M1 15 Q1 3 11 2 Q21 3 21 15 Q11 12 1 15 Z" fill="#7b4b24" />
          <path d="M11 2 V-3" stroke="#5a3718" strokeWidth="2" strokeLinecap="round" />
        </g>
      )
    default:
      return null
  }
}

export function Elf({ build, hat = '#2f6b3a', tunic = '#4a8a4a', prop = null, asleep = false, className = '', stamping = false, stampKey = 0, stump = false }: {
  build: Build; hat?: string; tunic?: string; prop?: Prop; asleep?: boolean; className?: string
  stamping?: boolean; stampKey?: number; stump?: boolean  // High Elf only: slam the stamp onto the acorn on the stump
}): ReactNode {
  const id = useId().replace(/:/g, '')
  const big = build === 'head' || build === 'high'
  const high = build === 'high'
  const hair = big ? GREY : '#8a5a2b'
  return (
    <svg className={`elf elf-${build} ${className}`} viewBox="0 0 160 205" role="img" aria-label={`${build} elf`}>
      <defs>
        <radialGradient id={`aura${id}`} cx="50%" cy="45%" r="55%">
          <stop offset="0" stopColor="#fff3b0" stopOpacity=".95" /><stop offset=".55" stopColor="#f6c850" stopOpacity=".4" /><stop offset="1" stopColor="#f6c850" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`eye${id}`}><stop offset="0" stopColor="#fff" /><stop offset=".5" stopColor="#fff2a8" /><stop offset="1" stopColor="#ffd34d" stopOpacity="0" /></radialGradient>
        <linearGradient id={`cape${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7b3fb0" /><stop offset="1" stopColor="#3b1a66" /></linearGradient>
      </defs>

      {high && <>
        <circle cx="80" cy="95" r="92" fill={`url(#aura${id})`} className="aura" />
        <path d="M38 84 Q-2 140 22 198 L138 198 Q162 140 122 84 Z" fill={`url(#cape${id})`} stroke="#f0c04a" strokeWidth="3" />
      </>}

      {/* legs and shoes */}
      {build === 'little' ? <>
        <g className="leg leg-l" style={{ transformOrigin: '70px 130px' }}>
          <rect x="66" y="128" width="9" height="20" rx="4" fill="#5a4630" /><path d="M60 150 Q64 142 76 148 L74 154 Q66 156 56 156 Z" fill="#8a5a2b" />
          <path d="M56 156 q-8 -2 -6 -9" fill="none" stroke="#8a5a2b" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g className="leg leg-r" style={{ transformOrigin: '90px 130px' }}>
          <rect x="85" y="128" width="9" height="20" rx="4" fill="#5a4630" /><path d="M84 148 Q96 142 100 150 L104 156 Q94 156 86 154 Z" fill="#8a5a2b" />
        </g>
      </> : <>
        <rect x={big ? 58 : 62} y="146" width={big ? 18 : 15} height="42" rx="7" fill={big ? SKIN : '#5a4630'} />
        <rect x={big ? 84 : 83} y="146" width={big ? 18 : 15} height="42" rx="7" fill={big ? SKIN : '#5a4630'} />
        <path d="M50 190 Q58 180 76 186 L76 196 Q60 198 44 196 Q40 190 50 190 Z" fill="#8a5a2b" /><path d="M84 186 Q102 180 110 190 Q120 190 116 196 Q100 198 84 196 Z" fill="#8a5a2b" />
        <path d="M44 195 q-10 -2 -8 -12" fill="none" stroke="#8a5a2b" strokeWidth="5" strokeLinecap="round" /><path d="M116 195 q10 -2 8 -12" fill="none" stroke="#8a5a2b" strokeWidth="5" strokeLinecap="round" />
      </>}

      {/* torso and arms by build */}
      {build === 'little' && <>
        <path d="M58 80 Q80 72 102 80 L98 132 Q80 138 62 132 Z" fill={tunic} />
        <path d="M58 132 H102" stroke="#5a4630" strokeWidth="6" />
        {prop === 'acorn' ? <>
          <path d="M60 88 L48 62 L66 36" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M100 88 L112 62 L94 36" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </> : <>
          <path d="M60 88 L50 112 L72 104" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M100 88 L110 112 L88 104" fill="none" stroke={SKIN} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </>}
      </>}

      {build === 'team' && <>
        <path d="M50 84 Q80 74 110 84 L104 138 Q80 144 56 138 Z" fill={tunic} />
        <path d="M80 80 V140" stroke="rgba(0,0,0,.18)" strokeWidth="2" /><path d="M56 138 H104" stroke="#5a4630" strokeWidth="7" />
        <circle cx="80" cy="138" r="5" fill="#f0c04a" />
        <circle cx="48" cy="92" r="13" fill={SKIN} /><circle cx="112" cy="92" r="13" fill={SKIN} />
        <path d="M44 98 Q28 108 34 128" fill="none" stroke={SKIN} strokeWidth="14" strokeLinecap="round" /><ellipse cx="34" cy="108" rx="11" ry="14" fill={SKIN} stroke={SKIN_D} />
        <path d="M116 98 Q134 100 134 78" fill="none" stroke={SKIN} strokeWidth="14" strokeLinecap="round" /><ellipse cx="127" cy="94" rx="11" ry="12" fill={SKIN} stroke={SKIN_D} />
        <circle cx="134" cy="76" r="8" fill={SKIN} />
        <path d="M48 92 q-2 10 6 14 M112 92 q2 10 -6 14" fill="none" stroke={SKIN_D} strokeWidth="2" />
      </>}

      {big && <>
        {/* shirtless powerhouse: deltoids, chest, six-pack, belt */}
        <circle cx="42" cy="92" r="17" fill={SKIN} stroke={SKIN_D} /><circle cx="118" cy="92" r="17" fill={SKIN} stroke={SKIN_D} />
        <path d="M46 84 Q80 72 114 84 L106 142 Q80 150 54 142 Z" fill={SKIN} stroke={SKIN_D} strokeWidth="1.5" />
        <path d="M54 96 Q68 112 80 98 Q92 112 106 96" fill="none" stroke={SKIN_D} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M80 98 V140" stroke={SKIN_D} strokeWidth="2" />
        {[106, 118, 130].map((y) => <g key={y}><rect x="63" y={y} width="15" height="9.5" rx="4" fill="#e6b088" stroke={SKIN_D} /><rect x="82" y={y} width="15" height="9.5" rx="4" fill="#e6b088" stroke={SKIN_D} /></g>)}
        <rect x="52" y="142" width="56" height="8" rx="3" fill="#5a3718" /><circle cx="80" cy="146" r="6" fill="#f0c04a" stroke="#b78a1c" />
        <path d="M54 150 H106 L110 168 H50 Z" fill={high ? '#3b1a66' : '#5a4630'} />
        {/* left arm: big flexed bicep */}
        <path d="M34 98 Q12 104 14 78" fill="none" stroke={SKIN} strokeWidth="20" strokeLinecap="round" />
        <ellipse cx="22" cy="98" rx="16" ry="18" fill={SKIN} stroke={SKIN_D} strokeWidth="1.5" /><path d="M14 96 q6 -8 14 0" fill="none" stroke={SKIN_D} strokeWidth="2" />
        <circle cx="14" cy="70" r="10" fill={SKIN} stroke={SKIN_D} />
        {/* right arm: raised, holds the prop (this is the arm that slams the stamp) */}
        <g key={stampKey} className={`arm-r ${stamping ? 'stamp-go' : ''}`}>
          <path d="M126 98 Q148 104 146 78" fill="none" stroke={SKIN} strokeWidth="20" strokeLinecap="round" />
          <ellipse cx="138" cy="98" rx="16" ry="18" fill={SKIN} stroke={SKIN_D} strokeWidth="1.5" /><path d="M130 96 q6 -8 14 0" fill="none" stroke={SKIN_D} strokeWidth="2" />
          <circle cx="146" cy="70" r="10" fill={SKIN} stroke={SKIN_D} />
          {prop && <PropArt prop={prop} x={prop === 'stamp' ? 146 : 146} y={prop === 'stamp' ? 66 : 62} />}
        </g>
        {high && <path d="M40 80 q4 10 0 22 M120 80 q-4 10 0 22 M64 128 q-3 6 0 12" fill="none" stroke="#d98a6a" strokeWidth="1.6" />}
      </>}

      {high && stump && (
        <g className="stump">
          <ellipse cx="146" cy="190" rx="19" ry="6" fill="#3a2412" /><rect x="128" y="170" width="36" height="20" fill="#6b4526" />
          <ellipse cx="146" cy="170" rx="18" ry="5" fill="#a87238" stroke="#5a3718" /><path d="M134 178 v10 M146 176 v12 M158 178 v10" stroke="#4a2f1b" strokeWidth="1.5" />
          <g className={`stump-acorn ${stamping ? 'squash' : ''}`} key={'a' + stampKey} style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}>
            <path d="M135 154 Q135 168 146 170 Q157 168 157 154 Z" fill="#e0a64a" stroke="#8a5a1f" /><path d="M133 156 Q133 142 146 141 Q159 142 159 156 Q146 152 133 156 Z" fill="#7b4b24" stroke="#5a3718" />
          </g>
          {stamping && <g key={'m' + stampKey}>
            <circle className="shock" cx="146" cy="156" r="16" fill="none" stroke="#ffe98a" strokeWidth="4" />
            <g className="ok-seal"><circle cx="146" cy="160" r="11" fill="rgba(255,255,255,.55)" stroke="#6b3fa0" strokeWidth="2.5" /><path d="M140 160 l4 4 l8 -9" fill="none" stroke="#6b3fa0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></g>
          </g>}
        </g>
      )}
      {/* head */}
      <path d="M60 52 L36 38 L61 68 Z" fill={SKIN} stroke={SKIN_D} /><path d="M100 52 L124 38 L99 68 Z" fill={SKIN} stroke={SKIN_D} />
      <circle cx="80" cy="56" r="22" fill={SKIN} stroke={SKIN_D} />
      {big && <><path d="M58 44 Q50 60 60 76 Q58 60 64 48 Z M102 44 Q110 60 100 76 Q102 60 96 48 Z" fill={hair} /></>}
      <circle cx="68" cy="63" r="4" fill="#f09a8a" opacity=".5" /><circle cx="92" cy="63" r="4" fill="#f09a8a" opacity=".5" />
      {asleep ? <path d="M66 56 q5 4 10 0 M84 56 q5 4 10 0" fill="none" stroke="#3a2418" strokeWidth="2.2" strokeLinecap="round" /> : high ? <>
        <circle cx="72" cy="56" r="8" fill={`url(#eye${id})`} /><circle cx="88" cy="56" r="8" fill={`url(#eye${id})`} />
        <circle cx="72" cy="56" r="2.4" fill="#7a5a10" /><circle cx="88" cy="56" r="2.4" fill="#7a5a10" />
      </> : <><circle cx="72" cy="56" r="2.8" fill="#2a1a10" /><circle cx="88" cy="56" r="2.8" fill="#2a1a10" /><circle cx="73" cy="55" r="1" fill="#fff" /><circle cx="89" cy="55" r="1" fill="#fff" /></>}
      <path d={big ? 'M63 49 Q72 42 78 50 M82 50 Q88 42 97 49' : 'M65 50 Q72 46 77 50 M83 50 Q88 46 95 50'} fill="none" stroke={big ? '#aab0b8' : '#6a4a2a'} strokeWidth={big ? 4 : 2.2} strokeLinecap="round" />
      <circle cx="80" cy="62" r="3.2" fill="#e0a07c" />
      {big ? <>
        {/* grey moustache and beard */}
        <path d="M80 66 Q70 62 62 70 Q70 72 80 68 Q90 72 98 70 Q90 62 80 66 Z" fill={GREY} stroke="#aab0b8" />
        <path d="M60 68 Q58 100 80 108 Q102 100 100 68 Q92 84 80 84 Q68 84 60 68 Z" fill={GREY} stroke="#aab0b8" strokeWidth="1.5" className={high ? 'beard-long' : ''} />
        <path d="M72 76 Q80 80 88 76" fill="none" stroke="#7a3b2a" strokeWidth="2" strokeLinecap="round" opacity=".0" />
      </> : <path d="M72 69 Q80 75 88 69" fill="none" stroke="#8a3b2a" strokeWidth="2.2" strokeLinecap="round" />}

      {/* hat or crown */}
      {high ? <g>
        <path d="M54 38 Q56 10 80 8 Q104 10 106 38 Q80 30 54 38 Z" fill="#f0c04a" stroke="#b78a1c" strokeWidth="2" />
        <path d="M60 34 Q70 18 80 30 Q90 18 100 34" fill="none" stroke="#b78a1c" strokeWidth="2" />
        <path d="M80 8 V0" stroke="#b78a1c" strokeWidth="4" strokeLinecap="round" /><circle cx="80" cy="-2" r="4" fill="#fff3b0" />
      </g> : <g>
        <path d="M56 40 C58 22 76 6 112 8 C92 14 90 30 100 42 Z" fill={hat} stroke="rgba(0,0,0,.25)" /><ellipse cx="78" cy="41" rx="26" ry="6" fill={hat} stroke="rgba(0,0,0,.25)" />
        {big && <circle cx="78" cy="41" r="4.5" fill="#f0c04a" stroke="#b78a1c" />}
      </g>}

      {build === 'little' && prop === 'acorn' && <g transform="translate(0 -26)"><PropArt prop="acorn" x={80} y={32} /></g>}
      {build === 'team' && prop && <PropArt prop={prop} x={133} y={74} />}
    </svg>
  )
}
