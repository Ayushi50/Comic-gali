import { useId } from 'react';
import type { SceneSpec } from '../types';
import { CHARACTERS } from './characters';

const INK = '#1b1530';

const SKY: Record<string, [string, string]> = {
  day: ['#7fd0e8', '#ffe9a8'],
  dusk: ['#5b3a8c', '#ff9a4d'],
  night: ['#0f1240', '#3a2f79'],
};

function Tree({ x, y, s = 1, fruit = false }: { x: number; y: number; s?: number; fruit?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-12 0 C-10 -50 -16 -90 -6 -130 L10 -130 C16 -90 10 -50 14 0 Z" fill="#6b3d12" stroke={INK} strokeWidth={2.5} />
      <path d="M-4 -90 L-46 -122 M4 -100 L50 -130" stroke="#6b3d12" strokeWidth={7} strokeLinecap="round" />
      {[[-50, -150, 50], [0, -178, 58], [52, -150, 48], [-20, -134, 42], [24, -132, 40]].map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill={i % 2 ? '#2f8f3f' : '#3da34d'} stroke={INK} strokeWidth={2} />
      ))}
      {fruit && [[-40, -140], [10, -165], [46, -140], [-10, -120], [30, -120]].map(([cx, cy], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={6} ry={8} fill="#ffb300" stroke={INK} strokeWidth={1.4} />
      ))}
    </g>
  );
}

function Hills({ c1, c2 }: { c1: string; c2: string }) {
  return (
    <g>
      <path d="M-200 200 C-120 120 -40 150 40 130 C120 110 180 160 260 140 C340 120 420 150 600 170 L600 300 L-200 300 Z" fill={c1} />
      <path d="M-200 220 C-100 170 0 200 100 180 C200 160 300 210 400 190 C500 180 560 200 600 200 L600 300 L-200 300 Z" fill={c2} />
    </g>
  );
}

function Water({ x0 = -200, y0 = 196, uid }: { x0?: number; y0?: number; uid: string }) {
  return (
    <g>
      <rect x={x0} y={y0} width={800 - x0} height={140} fill={`url(#w${uid})`} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path key={i} d={`M${x0 + 20 + i * 70} ${y0 + 20 + (i % 3) * 14} q10 -8 20 0 t20 0 t20 0`} fill="none" stroke="#e8fbff" strokeWidth={2} opacity={0.8} />
      ))}
    </g>
  );
}

function Background({ spec, uid }: { spec: SceneSpec; uid: string }) {
  const time = spec.time ?? (spec.bg === 'village-night' || spec.bg === 'garden' ? 'night' : 'day');
  const night = time === 'night';
  const sunMoon = night ? (
    <g>
      <circle cx={330} cy={40} r={26} fill="#fff7d6" />
      <circle cx={340} cy={34} r={22} fill={SKY.night[0]} opacity={0.0} />
      {[[-100, 10], [-20, 40], [80, -10], [170, 30], [260, 5], [420, 50], [-150, 80]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8} fill="#fff" />
      ))}
    </g>
  ) : (
    <circle cx={time === 'dusk' ? 300 : 320} cy={time === 'dusk' ? 110 : 40} r={28} fill={time === 'dusk' ? '#ffcf6b' : '#fff3a0'} />
  );
  const sky = SKY[time];
  const defs = (
    <defs>
      <linearGradient id={`s${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={sky[0]} />
        <stop offset="1" stopColor={sky[1]} />
      </linearGradient>
      <linearGradient id={`w${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={night ? '#2a3f8f' : '#2aa6c7'} />
        <stop offset="1" stopColor={night ? '#15204f' : '#13708f'} />
      </linearGradient>
    </defs>
  );
  const ground = night ? '#2e5a3a' : '#5cae4a';
  const ground2 = night ? '#25472f' : '#4a9a3c';

  switch (spec.bg) {
    case 'riverbank':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#7cc27a" c2="#5fae5b" />
          <Water x0={170} y0={186} uid={uid} />
          <path d="M-200 214 C-60 200 60 206 190 196 L190 300 L-200 300 Z" fill={ground} stroke={INK} strokeWidth={2} />
          <path d="M-200 262 C-60 250 60 256 190 246 L190 300 L-200 300 Z" fill={ground2} />
          <Tree x={70} y={238} s={1.15} fruit />
        </g>
      );
    case 'island':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#7cc27a" c2="#5fae5b" />
          <Water x0={-200} y0={186} uid={uid} />
          <ellipse cx={330} cy={214} rx={110} ry={20} fill="#e9cf8e" stroke={INK} strokeWidth={2} />
          <Tree x={340} y={212} s={0.8} fruit />
        </g>
      );
    case 'forest':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#4c9c5a" c2="#3a8548" />
          {[-130, -30, 90, 190, 300, 420].map((x, i) => (
            <Tree key={x} x={x} y={190 + (i % 2) * 14} s={0.75 + (i % 3) * 0.12} />
          ))}
          <rect x={-200} y={206} width={800} height={100} fill={ground} stroke={INK} strokeWidth={2} />
          <rect x={-200} y={262} width={800} height={60} fill={ground2} />
          {[[40, 236], [150, 252], [260, 240], [350, 256]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.5} fill={['#ffb300', '#e4432d', '#fff'][i % 3]} />
          ))}
        </g>
      );
    case 'hunt-park':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#7cc27a" c2="#5fae5b" />
          <rect x={-200} y={206} width={800} height={100} fill={ground} stroke={INK} strokeWidth={2} />
          {Array.from({ length: 17 }).map((_, i) => (
            <rect key={i} x={-190 + i * 40} y={150} width={9} height={66} fill="#8a5a2b" stroke={INK} strokeWidth={1.6} />
          ))}
          <rect x={-200} y={166} width={800} height={7} fill="#a8703a" stroke={INK} strokeWidth={1.4} />
          <rect x={-200} y={190} width={800} height={7} fill="#a8703a" stroke={INK} strokeWidth={1.4} />
          <rect x={150} y={240} width={70} height={16} rx={3} fill="#6b3d12" stroke={INK} strokeWidth={2} />
        </g>
      );
    case 'palace':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill="#f2d9a0" />
          <rect x={-200} y={-200} width={800} height={260} fill="#e4432d" opacity={0.18} />
          {[-120, 40, 200, 360].map((x) => (
            <g key={x}>
              <path d={`M${x - 52} 220 L${x - 52} 80 Q${x} 10 ${x + 52} 80 L${x + 52} 220 Z`} fill="#fff4d6" stroke={INK} strokeWidth={2.5} />
              <path d={`M${x - 38} 220 L${x - 38} 88 Q${x} 34 ${x + 38} 88 L${x + 38} 220 Z`} fill="#2b2d77" opacity={0.85} />
              {[0, 1, 2, 3].map((r) => (
                <circle key={r} cx={x} cy={80 + r * 30} r={9} fill="none" stroke="#f5a400" strokeWidth={2} />
              ))}
            </g>
          ))}
          {[-40, 120, 280].map((x) => (
            <g key={x}>
              <path d={`M${x} -200 L${x} 10`} stroke={INK} strokeWidth={1.5} />
              <circle cx={x} cy={20} r={11} fill="#ffb300" stroke={INK} strokeWidth={2} />
            </g>
          ))}
          <rect x={-200} y={214} width={800} height={90} fill="#8a1c2b" stroke={INK} strokeWidth={2} />
          {Array.from({ length: 14 }).map((_, i) => (
            <path key={i} d={`M${-190 + i * 56} 214 L${-220 + i * 56} 300`} stroke="#f5a400" strokeWidth={2} />
          ))}
        </g>
      );
    case 'market':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          {[-110, 20, 150, 290].map((x, i) => (
            <g key={x}>
              <rect x={x} y={90 - (i % 2) * 14} width={110} height={120} fill={['#ffe3a1', '#ffd0c4', '#c8ecd9', '#d6d7ff'][i % 4]} stroke={INK} strokeWidth={2} />
              <path d={`M${x - 8} 120 L${x + 118} 120 L${x + 108} 98 L${x} 98 Z`} fill={['#e4432d', '#0e8c7f', '#f5a400', '#2b2d77'][i % 4]} stroke={INK} strokeWidth={2} />
              <rect x={x + 20} y={146} width={70} height={20} fill="#6b3d12" stroke={INK} strokeWidth={1.6} />
            </g>
          ))}
          <rect x={-200} y={210} width={800} height={100} fill="#c9a26b" stroke={INK} strokeWidth={2} />
        </g>
      );
    case 'garden':
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#1f3d3a" c2="#17302d" />
          <rect x={-200} y={206} width={800} height={100} fill={ground} stroke={INK} strokeWidth={2} />
          <g transform="translate(250 210)">
            <path d="M-40 0 L-40 -40 L40 -40 L40 0 Z" fill="#9a8f80" stroke={INK} strokeWidth={2.5} />
            <ellipse cx={0} cy={-40} rx={40} ry={11} fill="#10162e" stroke={INK} strokeWidth={2.5} />
            <path d="M-36 -40 L-36 -90 M36 -40 L36 -90 M-40 -90 L40 -90" stroke="#6b3d12" strokeWidth={5} />
          </g>
          {[-120, -70, -20, 50].map((x) => (
            <g key={x}>
              <path d={`M${x} 240 q-8 -22 0 -34 q8 12 0 34`} fill="#3da34d" stroke={INK} strokeWidth={1.6} />
            </g>
          ))}
        </g>
      );
    case 'village-night':
    default:
      return (
        <g>
          {defs}
          <rect x={-200} y={-200} width={800} height={500} fill={`url(#s${uid})`} />
          {sunMoon}
          <Hills c1="#1f3d3a" c2="#17302d" />
          <g>
            <rect x={90} y={96} width={170} height={118} fill="#e6c27a" stroke={INK} strokeWidth={2.5} />
            <path d="M80 98 L175 44 L270 98 Z" fill="#a8452a" stroke={INK} strokeWidth={2.5} />
            <rect x={120} y={130} width={40} height={40} fill="#ffcf3a" stroke={INK} strokeWidth={2} />
            <path d="M140 130 V170 M120 150 H160" stroke={INK} strokeWidth={2} />
            <rect x={190} y={150} width={40} height={64} fill="#6b3d12" stroke={INK} strokeWidth={2} />
          </g>
          <rect x={-200} y={214} width={800} height={90} fill={ground} stroke={INK} strokeWidth={2} />
        </g>
      );
  }
}

function Extras({ extras }: { extras?: string[] }) {
  if (!extras?.length) return null;
  return (
    <g>
      {extras.includes('sparkle') &&
        [[60, 60], [330, 80], [200, 40]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y - 10} L${x + 3} ${y - 3} L${x + 10} ${y} L${x + 3} ${y + 3} L${x} ${y + 10} L${x - 3} ${y + 3} L${x - 10} ${y} L${x - 3} ${y - 3} Z`} fill="#fff7b0" stroke={INK} strokeWidth={1} />
        ))}
      {extras.includes('splash') &&
        [[120, 212], [200, 206], [300, 214]].map(([x, y], i) => (
          <path key={i} d={`M${x - 14} ${y} q4 -18 10 0 q4 -22 10 0 q6 -16 10 0`} fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
        ))}
      {extras.includes('heart-bubble') && (
        <g transform="translate(250 90)">
          <circle r={34} fill="#fff" stroke={INK} strokeWidth={2.5} />
          <path d="M0 14 C-26 -4 -14 -24 0 -10 C14 -24 26 -4 0 14 Z" fill="#e4432d" stroke={INK} strokeWidth={2} />
          <circle cx={-34} cy={34} r={7} fill="#fff" stroke={INK} strokeWidth={2} />
          <circle cx={-46} cy={48} r={4} fill="#fff" stroke={INK} strokeWidth={2} />
        </g>
      )}
      {extras.includes('sweat') &&
        [[90, 120], [112, 108]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} q-6 10 0 14 q6 -4 0 -14`} fill="#7fd0e8" stroke={INK} strokeWidth={1.4} />
        ))}
    </g>
  );
}

export function viewBoxFor(aspect: number): string {
  // Design space is 400x300, bottom-anchored so the ground is always visible.
  // Wide panels show a wider slice of the world (not just a thin strip) so characters stay in frame.
  const h = aspect >= 1.4 ? 260 : 300;
  const w = h * aspect;
  return `${200 - w / 2} ${300 - h} ${w} ${h}`;
}

export function Scene({ spec, aspect = 4 / 3, label }: { spec: SceneSpec; aspect?: number; label?: string }) {
  const uid = useId().replace(/[^a-z0-9]/gi, '');
  const sorted = [...spec.actors];
  return (
    <svg
      viewBox={viewBoxFor(aspect)}
      preserveAspectRatio="xMidYMax slice"
      role="img"
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="scene"
      focusable="false"
    >
      <Background spec={spec} uid={uid} />
      <Extras extras={spec.extras} />
      {sorted.map((a, i) => {
        const def = CHARACTERS[a.c];
        if (!def) return null;
        const s = a.s ?? 1;
        const y = a.y ?? 250;
        return (
          <g key={i} transform={`translate(${a.x} ${y})`}>
            <ellipse cx={0} cy={2} rx={def.w * s} ry={6 * s} fill="#000" opacity={0.22} />
            <g transform={`scale(${(a.flip ? -1 : 1) * s} ${s})`}>{def.draw(a.mood)}</g>
          </g>
        );
      })}
    </svg>
  );
}
