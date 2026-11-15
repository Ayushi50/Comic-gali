import type { ReactNode } from 'react';

/**
 * Original character art — all characters here were invented for Comic Gali.
 * Each character draws itself with its feet at (0,0), facing right, roughly 110 units tall.
 */
export type Mood = 'happy' | 'sad' | 'angry' | 'scared' | 'smug';

const INK = '#1b1530';

function Eyes({ x, y, gap = 9, r = 3.4, mood = 'happy' }: { x: number; y: number; gap?: number; r?: number; mood?: Mood }) {
  const big = mood === 'scared' ? r * 1.5 : r;
  return (
    <g>
      <circle cx={x - gap / 2} cy={y} r={big + 1.8} fill="#fff" stroke={INK} strokeWidth={1.2} />
      <circle cx={x + gap / 2} cy={y} r={big + 1.8} fill="#fff" stroke={INK} strokeWidth={1.2} />
      <circle cx={x - gap / 2 + 1} cy={y + 0.5} r={big * 0.7} fill={INK} />
      <circle cx={x + gap / 2 + 1} cy={y + 0.5} r={big * 0.7} fill={INK} />
      {mood === 'angry' && (
        <>
          <path d={`M${x - gap / 2 - 5} ${y - 7} L${x - gap / 2 + 4} ${y - 4}`} stroke={INK} strokeWidth={2} />
          <path d={`M${x + gap / 2 + 5} ${y - 7} L${x + gap / 2 - 4} ${y - 4}`} stroke={INK} strokeWidth={2} />
        </>
      )}
      {mood === 'sad' && (
        <>
          <path d={`M${x - gap / 2 - 5} ${y - 4} L${x - gap / 2 + 4} ${y - 8}`} stroke={INK} strokeWidth={2} />
          <path d={`M${x + gap / 2 + 5} ${y - 4} L${x + gap / 2 - 4} ${y - 8}`} stroke={INK} strokeWidth={2} />
        </>
      )}
    </g>
  );
}

function Mouth({ x, y, mood = 'happy', w = 12 }: { x: number; y: number; mood?: Mood; w?: number }) {
  const d =
    mood === 'sad' || mood === 'angry'
      ? `M${x - w / 2} ${y + 3} Q${x} ${y - 4} ${x + w / 2} ${y + 3}`
      : mood === 'scared'
        ? `M${x - 4} ${y} Q${x} ${y + 9} ${x + 4} ${y} Z`
        : mood === 'smug'
          ? `M${x - w / 2} ${y + 1} Q${x + 2} ${y + 5} ${x + w / 2} ${y - 3}`
          : `M${x - w / 2} ${y} Q${x} ${y + 7} ${x + w / 2} ${y}`;
  return <path d={d} fill={mood === 'scared' ? '#7a1020' : 'none'} stroke={INK} strokeWidth={1.8} strokeLinecap="round" />;
}

export function Monkey({ mood = 'happy' }: { mood?: Mood }) {
  return (
    <g>
      <path d="M-18 -30 C-52 -40 -46 -78 -26 -74" fill="none" stroke="#7a4a21" strokeWidth={7} strokeLinecap="round" />
      <ellipse cx={0} cy={-34} rx={22} ry={28} fill="#8b5a2b" stroke={INK} strokeWidth={2} />
      <ellipse cx={4} cy={-30} rx={13} ry={19} fill="#e8c28d" />
      <path d="M-14 -8 L-18 0 L-4 0 Z M10 -8 L8 0 L22 0 Z" fill="#7a4a21" stroke={INK} strokeWidth={1.5} />
      <path d="M12 -48 C28 -44 30 -30 26 -22" fill="none" stroke="#8b5a2b" strokeWidth={7} strokeLinecap="round" />
      <circle cx={0} cy={-76} r={21} fill="#8b5a2b" stroke={INK} strokeWidth={2} />
      <circle cx={-21} cy={-78} r={8} fill="#e8c28d" stroke={INK} strokeWidth={1.5} />
      <circle cx={21} cy={-78} r={8} fill="#e8c28d" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={3} cy={-70} rx={14} ry={12} fill="#e8c28d" />
      <Eyes x={4} y={-79} gap={11} mood={mood} />
      <ellipse cx={5} cy={-70} rx={2} ry={1.5} fill={INK} />
      <Mouth x={5} y={-64} mood={mood} w={11} />
    </g>
  );
}

export function Crocodile({ mood = 'happy', big = false }: { mood?: Mood; big?: boolean }) {
  const body = big ? '#2f6b3a' : '#3f8a4a';
  return (
    <g>
      <path d="M-70 -14 C-110 -10 -120 -30 -150 -22 C-120 -2 -90 6 -64 4 Z" fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={-6} cy={-18} rx={72} ry={22} fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={-6} cy={-8} rx={60} ry={10} fill="#d7e8a8" />
      {[-48, -30, -12, 6, 24].map((x) => (
        <path key={x} d={`M${x} -36 l5 -9 l5 9 Z`} fill="#2a5c34" stroke={INK} strokeWidth={1.2} />
      ))}
      <path d="M50 -26 C80 -34 110 -30 126 -22 L126 -6 C100 0 74 -2 52 -2 Z" fill={body} stroke={INK} strokeWidth={2} />
      <path d="M62 -8 L126 -8" stroke="#fff" strokeWidth={5} strokeDasharray="4 4" />
      <circle cx={62} cy={-36} r={9} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <circle cx={64} cy={-36} r={4.5} fill={INK} />
      {mood === 'angry' && <path d="M52 -48 L72 -42" stroke={INK} strokeWidth={3} />}
      <circle cx={112} cy={-26} r={2} fill={INK} />
      <path d="M-30 0 l-6 10 M20 0 l6 10" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    </g>
  );
}

export function Deer({ tint = 'gold', mood = 'happy' }: { tint?: 'gold' | 'brown'; mood?: Mood }) {
  const body = tint === 'gold' ? '#f2b21b' : '#a8703a';
  const belly = tint === 'gold' ? '#ffe49a' : '#e8c9a0';
  const horn = tint === 'gold' ? '#f4f1ea' : '#6b4a2a';
  return (
    <g>
      <path d="M-40 -58 l-8 -10 l12 4 Z" fill={body} stroke={INK} strokeWidth={1.5} />
      <ellipse cx={-4} cy={-52} rx={42} ry={22} fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={-2} cy={-42} rx={32} ry={9} fill={belly} />
      {[-26, -10, 8, 22].map((x) => (
        <rect key={x} x={x} y={-38} width={7} height={38} rx={3} fill={body} stroke={INK} strokeWidth={1.6} />
      ))}
      {[-24, 4, 18].map((x, i) => (
        <circle key={x} cx={x} cy={-58 + (i % 2) * 6} r={3} fill={belly} />
      ))}
      <path d="M26 -62 C38 -80 40 -92 44 -100 L58 -96 C52 -84 50 -72 44 -58 Z" fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={56} cy={-100} rx={16} ry={12} fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={69} cy={-96} rx={6} ry={5} fill={belly} stroke={INK} strokeWidth={1.2} />
      <circle cx={71} cy={-97} r={2.2} fill={INK} />
      <circle cx={53} cy={-103} r={3.8} fill="#fff" stroke={INK} strokeWidth={1.2} />
      <circle cx={54} cy={-103} r={2} fill={INK} />
      {mood === 'sad' && <path d="M48 -110 l10 -4" stroke={INK} strokeWidth={2} />}
      <path d="M48 -110 C40 -128 46 -134 38 -142 M44 -122 C52 -128 54 -138 50 -146 M52 -112 C58 -126 66 -130 68 -142" fill="none" stroke={horn} strokeWidth={4} strokeLinecap="round" />
      <path d="M42 -108 l-12 -8 l4 12 Z" fill={body} stroke={INK} strokeWidth={1.5} />
    </g>
  );
}

export function Fawn() {
  return (
    <g transform="scale(0.55)">
      <Deer tint="brown" />
    </g>
  );
}

export function Crow({ mood = 'smug' }: { mood?: Mood }) {
  return (
    <g>
      <path d="M-30 -22 L-48 -12 L-30 -14 Z" fill="#232038" stroke={INK} strokeWidth={1.5} />
      <ellipse cx={-4} cy={-24} rx={26} ry={16} fill="#2b2744" stroke={INK} strokeWidth={2} />
      <path d="M-14 -22 C0 -34 18 -26 22 -18 C6 -10 -8 -12 -14 -22 Z" fill="#3a3560" />
      <circle cx={18} cy={-38} r={11} fill="#2b2744" stroke={INK} strokeWidth={2} />
      <path d="M26 -40 L44 -36 L26 -32 Z" fill="#f5a400" stroke={INK} strokeWidth={1.5} />
      <circle cx={20} cy={-41} r={3.5} fill="#fff" />
      <circle cx={21} cy={-41} r={1.8} fill={INK} />
      {mood === 'angry' && <path d="M14 -48 l10 3" stroke="#fff" strokeWidth={2} />}
      <path d="M-8 -8 l-2 8 M4 -8 l2 8" stroke="#f5a400" strokeWidth={2.5} strokeLinecap="round" />
    </g>
  );
}


export function Lion({ mood = 'happy' }: { mood?: Mood }) {
  return (
    <g>
      <path d="M-44 -48 C-72 -60 -76 -86 -58 -92" fill="none" stroke="#c98b3c" strokeWidth={6} strokeLinecap="round" />
      <circle cx={-58} cy={-92} r={8} fill="#8a4b1f" stroke={INK} strokeWidth={1.6} />
      <ellipse cx={-4} cy={-48} rx={46} ry={26} fill="#d9a04c" stroke={INK} strokeWidth={2} />
      {[-28, -10, 14, 30].map((x) => <rect key={x} x={x} y={-34} width={10} height={34} rx={4} fill="#d9a04c" stroke={INK} strokeWidth={1.6} />)}
      <circle cx={42} cy={-78} r={34} fill="#9a4f1d" stroke={INK} strokeWidth={2} />
      <circle cx={44} cy={-76} r={22} fill="#e8b45c" stroke={INK} strokeWidth={2} />
      <circle cx={30} cy={-96} r={7} fill="#e8b45c" stroke={INK} strokeWidth={1.6} /><circle cx={58} cy={-96} r={7} fill="#e8b45c" stroke={INK} strokeWidth={1.6} />
      <Eyes x={44} y={-82} gap={14} r={2.6} mood={mood === 'happy' ? 'smug' : mood} />
      <path d="M38 -72 L50 -72 L44 -66 Z" fill={INK} />
      <Mouth x={44} y={-62} mood={mood} w={14} />
    </g>
  );
}

export function Hare({ mood = 'happy' }: { mood?: Mood }) {
  return (
    <g>
      <circle cx={-22} cy={-18} r={8} fill="#fff" stroke={INK} strokeWidth={1.6} />
      <ellipse cx={-2} cy={-26} rx={24} ry={20} fill="#f4efe6" stroke={INK} strokeWidth={2} />
      <ellipse cx={10} cy={-6} rx={14} ry={6} fill="#f4efe6" stroke={INK} strokeWidth={1.6} />
      <ellipse cx={20} cy={-52} rx={14} ry={12} fill="#f4efe6" stroke={INK} strokeWidth={2} />
      <ellipse cx={14} cy={-82} rx={5} ry={18} fill="#f4efe6" stroke={INK} strokeWidth={2} transform="rotate(-12 14 -82)" />
      <ellipse cx={28} cy={-82} rx={5} ry={18} fill="#f4efe6" stroke={INK} strokeWidth={2} transform="rotate(10 28 -82)" />
      <ellipse cx={14} cy={-82} rx={2} ry={12} fill="#f3b6bd" transform="rotate(-12 14 -82)" />
      <Eyes x={22} y={-54} gap={9} r={2.2} mood={mood} />
      <circle cx={31} cy={-48} r={2.4} fill="#e8788a" />
      <Mouth x={26} y={-44} mood={mood} w={7} />
    </g>
  );
}

export function Goose({ mood = 'happy' }: { mood?: Mood }) {
  return (
    <g>
      <path d="M-34 -30 L-52 -40 L-30 -20 Z" fill="#ffd34d" stroke={INK} strokeWidth={1.6} />
      <ellipse cx={-4} cy={-30} rx={32} ry={22} fill="#ffe27a" stroke={INK} strokeWidth={2} />
      <path d="M-24 -34 C-8 -50 14 -40 16 -26 C0 -18 -16 -22 -24 -34 Z" fill="#ffc21a" />
      <path d="M20 -42 C30 -62 26 -76 30 -88" fill="none" stroke="#ffe27a" strokeWidth={11} strokeLinecap="round" />
      <path d="M20 -42 C30 -62 26 -76 30 -88" fill="none" stroke={INK} strokeWidth={1.4} strokeLinecap="round" opacity={0.0} />
      <circle cx={32} cy={-92} r={11} fill="#ffe27a" stroke={INK} strokeWidth={2} />
      <path d="M41 -94 L56 -90 L41 -86 Z" fill="#e4432d" stroke={INK} strokeWidth={1.4} />
      <circle cx={34} cy={-96} r={3.2} fill="#fff" stroke={INK} strokeWidth={1} /><circle cx={35} cy={-96} r={1.6} fill={INK} />
      {mood === 'sad' && <path d="M28 -104 l10 -3" stroke={INK} strokeWidth={2} />}
      <path d="M-8 -9 l-2 9 M8 -9 l2 9" stroke="#e4432d" strokeWidth={3} strokeLinecap="round" />
    </g>
  );
}

export function Jackal({ blue = false, mood = 'happy' }: { blue?: boolean; mood?: Mood }) {
  const body = blue ? '#2f6fe0' : '#b98a55';
  const belly = blue ? '#8fb8ff' : '#e6cfa6';
  return (
    <g>
      <path d="M-44 -40 C-76 -44 -80 -70 -62 -80" fill="none" stroke={body} strokeWidth={9} strokeLinecap="round" />
      <ellipse cx={-6} cy={-42} rx={42} ry={20} fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={-2} cy={-34} rx={30} ry={8} fill={belly} />
      {[-26, -10, 12, 26].map((x) => <rect key={x} x={x} y={-32} width={7} height={32} rx={3} fill={body} stroke={INK} strokeWidth={1.6} />)}
      <path d="M30 -52 C42 -70 44 -78 48 -84 L62 -80 C58 -70 56 -60 48 -48 Z" fill={body} stroke={INK} strokeWidth={2} />
      <ellipse cx={58} cy={-86} rx={16} ry={12} fill={body} stroke={INK} strokeWidth={2} />
      <path d="M66 -90 L92 -84 L68 -78 Z" fill={belly} stroke={INK} strokeWidth={1.8} />
      <circle cx={92} cy={-84} r={3} fill={INK} />
      <path d="M46 -94 L40 -116 L56 -98 Z M60 -96 L66 -118 L72 -96 Z" fill={body} stroke={INK} strokeWidth={1.8} />
      <circle cx={58} cy={-90} r={3.6} fill="#fff" stroke={INK} strokeWidth={1.2} /><circle cx={59} cy={-90} r={1.8} fill={INK} />
      {mood === 'angry' && <path d="M52 -98 l12 3" stroke={INK} strokeWidth={2.4} />}
      {mood === 'happy' && <path d="M70 -76 q8 8 18 -2" fill="none" stroke={INK} strokeWidth={1.6} />}
    </g>
  );
}

interface HumanOpts {
  skin?: string;
  robe: string;
  robe2?: string;
  head?: 'turban' | 'crown' | 'cap' | 'none' | 'bun';
  headColor?: string;
  stache?: boolean;
  beard?: boolean;
  mood?: Mood;
  accessory?: 'bow' | 'ladle' | 'bucket' | 'bag' | 'fan' | 'none';
  scale?: number;
  dress?: boolean; // sari-style
}

export function Human(o: HumanOpts) {
  const skin = o.skin ?? '#c98b5a';
  const mood = o.mood ?? 'happy';
  const hc = o.headColor ?? '#e4432d';
  return (
    <g transform={`scale(${o.scale ?? 1})`}>
      {o.dress ? (
        <path d="M-24 -78 C-30 -40 -34 -14 -34 0 L34 0 C34 -14 30 -40 24 -78 Z" fill={o.robe} stroke={INK} strokeWidth={2} />
      ) : (
        <>
          <path d="M-22 -80 C-26 -50 -30 -20 -28 0 L28 0 C30 -20 26 -50 22 -80 Z" fill={o.robe} stroke={INK} strokeWidth={2} />
          <rect x={-30} y={-3} width={60} height={5} fill="#f5ebd0" />
        </>
      )}
      <path d="M-22 -72 C0 -62 12 -66 22 -78 L22 -70 C10 -56 -4 -54 -22 -62 Z" fill={o.robe2 ?? '#f5a400'} opacity={0.9} />
      <circle cx={0} cy={-98} r={19} fill={skin} stroke={INK} strokeWidth={2} />
      <Eyes x={4} y={-100} gap={13} r={2.6} mood={mood} />
      <path d="M3 -96 l-2 6 l5 0" fill="none" stroke={INK} strokeWidth={1.4} />
      {o.stache && <path d="M-6 -88 C-1 -92 10 -92 14 -88 C8 -86 -1 -84 -6 -88 Z" fill={INK} />}
      <Mouth x={5} y={-83} mood={mood} w={9} />
      {o.beard && <path d="M-14 -90 C-12 -66 14 -66 17 -90 C10 -78 -8 -78 -14 -90 Z" fill="#f2f0ea" stroke={INK} strokeWidth={1.3} />}
      {o.head === 'turban' && (
        <g>
          <path d="M-20 -104 C-24 -128 24 -134 20 -104 C10 -114 -10 -114 -20 -104 Z" fill={hc} stroke={INK} strokeWidth={2} />
          <path d="M-18 -110 C-4 -120 12 -120 20 -110" fill="none" stroke="#f5ebd0" strokeWidth={2} />
          <circle cx={2} cy={-116} r={3.4} fill="#f5a400" stroke={INK} strokeWidth={1} />
        </g>
      )}
      {o.head === 'crown' && (
        <path d="M-17 -112 L-19 -134 L-9 -124 L0 -138 L9 -124 L19 -134 L17 -112 Z" fill="#f5a400" stroke={INK} strokeWidth={2} />
      )}
      {o.head === 'cap' && <path d="M-17 -106 C-12 -128 14 -128 17 -106 Z" fill={hc} stroke={INK} strokeWidth={2} />}
      {o.head === 'bun' && (
        <g>
          <path d="M-18 -104 C-18 -122 18 -122 18 -104 C8 -110 -8 -110 -18 -104 Z" fill={INK} />
          <circle cx={-10} cy={-120} r={8} fill={INK} />
        </g>
      )}
      {o.accessory === 'bow' && <path d="M30 -100 C52 -80 52 -40 30 -20" fill="none" stroke="#6b3d12" strokeWidth={4} />}
      {o.accessory === 'ladle' && <path d="M28 -30 L46 -78 M46 -78 m-7 0 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0" fill="#9aa0a6" stroke={INK} strokeWidth={2.5} />}
      {o.accessory === 'bucket' && <path d="M26 -22 L30 -4 L52 -4 L56 -22 Z M30 -22 C34 -40 52 -40 56 -22" fill="#9aa0a6" stroke={INK} strokeWidth={2} />}
      {o.accessory === 'bag' && <path d="M24 -26 C20 -8 50 -8 46 -26 C42 -34 28 -34 24 -26 Z" fill="#6b3d12" stroke={INK} strokeWidth={2} />}
      {o.accessory === 'fan' && <path d="M26 -40 l24 -14 l4 22 Z" fill="#f5a400" stroke={INK} strokeWidth={2} />}
    </g>
  );
}

export interface CharDef {
  draw: (mood?: Mood) => ReactNode;
  w: number; // rough half-width for shadows
}

export const CHARACTERS: Record<string, CharDef> = {
  monkey: { draw: (m) => <Monkey mood={m} />, w: 26 },
  croc: { draw: (m) => <Crocodile mood={m} />, w: 90 },
  crocmom: { draw: (m) => <Crocodile mood={m} big />, w: 90 },
  deerking: { draw: (m) => <Deer tint="gold" mood={m} />, w: 50 },
  deer2: { draw: (m) => <Deer tint="brown" mood={m} />, w: 50 },
  doe: { draw: (m) => <Deer tint="brown" mood={m} />, w: 50 },
  fawn: { draw: () => <Fawn />, w: 30 },
  crow: { draw: (m) => <Crow mood={m} />, w: 30 },
  raja: { draw: (m) => <Human robe="#7a1fa2" robe2="#f5a400" head="crown" stache mood={m} accessory="bow" />, w: 30 },
  cook: { draw: (m) => <Human robe="#e8e1cf" robe2="#e4432d" head="cap" headColor="#f6ebd0" stache mood={m} accessory="ladle" skin="#b9794a" />, w: 30 },
  akbar: { draw: (m) => <Human robe="#0e8c7f" robe2="#f5a400" head="turban" headColor="#f5a400" beard stache mood={m} skin="#d39a6a" />, w: 30 },
  birbal: { draw: (m) => <Human robe="#e8e1cf" robe2="#2b2d77" head="turban" headColor="#e4432d" stache mood={m} skin="#b8774a" />, w: 30 },
  courtier: { draw: (m) => <Human robe="#2b2d77" robe2="#f5a400" head="turban" headColor="#0e8c7f" stache mood={m} accessory="fan" />, w: 30 },
  tenali: { draw: (m) => <Human robe="#f5a400" robe2="#e4432d" head="turban" headColor="#2b2d77" stache mood={m} skin="#b27346" />, w: 30 },
  wife: { draw: (m) => <Human robe="#e4432d" robe2="#f5a400" head="bun" mood={m} dress skin="#b27346" />, w: 30 },
  thief: { draw: (m) => <Human robe="#3b3a4a" robe2="#6b6a7e" head="cap" headColor="#1b1530" stache mood={m} accessory="bag" skin="#a86a40" />, w: 30 },
  lion: { draw: (m) => <Lion mood={m} />, w: 60 },
  hare: { draw: (m) => <Hare mood={m} />, w: 30 },
  goose: { draw: (m) => <Goose mood={m} />, w: 40 },
  jackal: { draw: (m) => <Jackal mood={m} />, w: 60 },
  bluejackal: { draw: (m) => <Jackal blue mood={m} />, w: 60 },
  vikram: { draw: (m) => <Human robe="#7a1fa2" robe2="#f5a400" head="crown" stache mood={m} skin="#c98b5a" />, w: 30 },
  betaal: { draw: (m) => <Human robe="#5a6a6a" robe2="#3a4646" head="none" mood={m} skin="#9bb3a8" />, w: 30 },
  poorwoman: { draw: (m) => <Human robe="#8a5a2b" robe2="#c98b3c" head="bun" mood={m} dress skin="#a86a40" />, w: 30 },
  girl: { draw: (m) => <Human robe="#f06292" robe2="#f5a400" head="bun" mood={m} dress skin="#b27346" scale={0.72} />, w: 22 },
  thief2: { draw: (m) => <Human robe="#4a2f2f" robe2="#7a5a5a" head="turban" headColor="#555" mood={m} accessory="bucket" skin="#9a6238" scale={0.95} />, w: 30 },
};
