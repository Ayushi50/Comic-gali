import type { Direction, ReadMode } from '../types';

export const PANELS_PER_PAGE = 4;

export interface ReaderState {
  index: number; // global panel index (the single source of truth for position)
  total: number; // total panel count
  mode: ReadMode;
  dir: Direction;
  zoom: number; // user zoom multiplier (flip mode)
}

export type ReaderAction =
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number }
  | { type: 'gotoPage'; page: number }
  | { type: 'mode'; mode: ReadMode }
  | { type: 'dir'; dir: Direction }
  | { type: 'zoom'; zoom: number }
  | { type: 'zoomBy'; by: number };

export const pageOf = (index: number) => Math.floor(index / PANELS_PER_PAGE);
export const pageCount = (total: number) => Math.ceil(total / PANELS_PER_PAGE);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export function initReader(total: number, saved?: Partial<ReaderState>): ReaderState {
  return {
    total,
    index: clamp(saved?.index ?? 0, 0, Math.max(0, total - 1)),
    mode: saved?.mode ?? 'panel',
    dir: saved?.dir ?? 'ltr',
    zoom: 1,
  };
}

export function readerReducer(s: ReaderState, a: ReaderAction): ReaderState {
  const last = s.total - 1;
  switch (a.type) {
    case 'next': {
      // Page mode jumps to the first panel of the next page; the others step one panel.
      const idx = s.mode === 'flip' ? (pageOf(s.index) + 1) * PANELS_PER_PAGE : s.index + 1;
      return { ...s, index: clamp(idx, 0, last), zoom: 1 };
    }
    case 'prev': {
      const idx = s.mode === 'flip' ? (pageOf(s.index) - 1) * PANELS_PER_PAGE : s.index - 1;
      return { ...s, index: clamp(idx, 0, last), zoom: 1 };
    }
    case 'goto':
      return { ...s, index: clamp(a.index, 0, last) };
    case 'gotoPage':
      return { ...s, index: clamp(a.page * PANELS_PER_PAGE, 0, last), zoom: 1 };
    case 'mode':
      return { ...s, mode: a.mode, zoom: 1 };
    case 'dir':
      return { ...s, dir: a.dir };
    case 'zoom':
      return { ...s, zoom: clamp(a.zoom, 1, 4) };
    case 'zoomBy':
      return { ...s, zoom: clamp(s.zoom * a.by, 1, 4) };
  }
}

/** Maps a keyboard key to an action; arrow keys flip meaning in right-to-left mode. */
export function keyToAction(key: string, dir: Direction): ReaderAction | null {
  const fwd: ReaderAction = { type: 'next' };
  const back: ReaderAction = { type: 'prev' };
  switch (key) {
    case 'ArrowRight': return dir === 'rtl' ? back : fwd;
    case 'ArrowLeft': return dir === 'rtl' ? fwd : back;
    case 'ArrowDown': case 'PageDown': case ' ': return fwd;
    case 'ArrowUp': case 'PageUp': return back;
    case 'Home': return { type: 'goto', index: 0 };
    case '+': case '=': return { type: 'zoomBy', by: 1.25 };
    case '-': case '_': return { type: 'zoomBy', by: 0.8 };
    case '0': return { type: 'zoom', zoom: 1 };
    default: return null;
  }
}

/** Camera transform that fits a rect (page units) into a stage of the given size. */
export function fitTransform(stageW: number, stageH: number, r: { x: number; y: number; w: number; h: number }, margin = 0.94) {
  const scale = Math.min(stageW / r.w, stageH / r.h) * margin;
  return { scale, tx: (stageW - r.w * scale) / 2 - r.x * scale, ty: (stageH - r.h * scale) / 2 - r.y * scale };
}
