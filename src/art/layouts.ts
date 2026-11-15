export interface Rect { x: number; y: number; w: number; h: number }

/** Page canvas is 800 x 1120. Each layout lists panel rectangles in reading order (LTR). */
export const PAGE_W = 800;
export const PAGE_H = 1120;

export const LAYOUTS: Record<string, Rect[]> = {
  A: [
    { x: 30, y: 30, w: 740, h: 330 },
    { x: 30, y: 380, w: 360, h: 340 },
    { x: 410, y: 380, w: 360, h: 340 },
    { x: 30, y: 740, w: 740, h: 350 },
  ],
  B: [
    { x: 30, y: 30, w: 360, h: 400 },
    { x: 410, y: 30, w: 360, h: 400 },
    { x: 30, y: 450, w: 740, h: 300 },
    { x: 30, y: 770, w: 740, h: 320 },
  ],
  C: [
    { x: 30, y: 30, w: 740, h: 300 },
    { x: 30, y: 350, w: 740, h: 330 },
    { x: 30, y: 700, w: 360, h: 390 },
    { x: 410, y: 700, w: 360, h: 390 },
  ],
};

export function mirror(r: Rect): Rect {
  return { ...r, x: PAGE_W - r.x - r.w };
}

export function rectsFor(layout: string, rtl: boolean): Rect[] {
  const rs = LAYOUTS[layout] ?? LAYOUTS.A;
  return rtl ? rs.map(mirror) : rs;
}
