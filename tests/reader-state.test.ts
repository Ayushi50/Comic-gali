import { describe, expect, it } from 'vitest';
import { initReader, keyToAction, pageOf, readerReducer, fitTransform } from '../src/lib/reader-state';

describe('reader state', () => {
  const s0 = initReader(8, { mode: 'panel' });
  it('steps one panel in panel mode and clamps at the ends', () => {
    let s = readerReducer(s0, { type: 'next' });
    expect(s.index).toBe(1);
    s = readerReducer(initReader(8, { index: 7 }), { type: 'next' });
    expect(s.index).toBe(7);
    expect(readerReducer(s0, { type: 'prev' }).index).toBe(0);
  });
  it('jumps whole pages in flip mode', () => {
    const f = initReader(8, { mode: 'flip', index: 1 });
    expect(readerReducer(f, { type: 'next' }).index).toBe(4);
    expect(pageOf(readerReducer(f, { type: 'next' }).index)).toBe(1);
    expect(readerReducer({ ...f, index: 5 }, { type: 'prev' }).index).toBe(0);
  });
  it('restores a saved position and clamps bad data', () => {
    expect(initReader(8, { index: 99 }).index).toBe(7);
    expect(initReader(8, { index: -3 }).index).toBe(0);
  });
  it('resets zoom on navigation and clamps zoom range', () => {
    let s = readerReducer(s0, { type: 'zoom', zoom: 9 });
    expect(s.zoom).toBe(4);
    s = readerReducer(s, { type: 'next' });
    expect(s.zoom).toBe(1);
    expect(readerReducer(s0, { type: 'zoomBy', by: 0.1 }).zoom).toBe(1);
  });
  it('swaps arrow keys in right-to-left mode', () => {
    expect(keyToAction('ArrowRight', 'ltr')).toEqual({ type: 'next' });
    expect(keyToAction('ArrowRight', 'rtl')).toEqual({ type: 'prev' });
    expect(keyToAction('ArrowLeft', 'rtl')).toEqual({ type: 'next' });
    expect(keyToAction('x', 'ltr')).toBeNull();
  });
  it('fits a rect inside the stage and centres it', () => {
    const t = fitTransform(400, 400, { x: 0, y: 0, w: 200, h: 100 }, 1);
    expect(t.scale).toBe(2);
    expect(t.ty).toBe(100);
  });
});
