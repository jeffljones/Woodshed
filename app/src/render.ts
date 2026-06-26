// Render a parsed song to DOM, applying transpose or Nashville on the fly.

import type { Song, Line } from './chordpro';
import { transposeChord, nashvilleChord } from './music';

export interface RenderOpts {
  transpose: number;
  nashville: boolean;
  flat: boolean;
  key: string | null;
}

function showChord(sym: string, o: RenderOpts): string {
  if (!sym) return sym;
  return o.nashville ? nashvilleChord(sym, o.key) : transposeChord(sym, o.transpose, o.flat);
}

// Parse one bar-notation line into bars + repeat marks. Handles the corpus's real syntax:
// `|: … :|` repeat barlines and a trailing `xN` / `(xN)` repeat count.
function parseBarLine(raw: string): { startRepeat: boolean; endRepeat: boolean; times: number | null; bars: string[][] } {
  let t = raw.trim();
  let times: number | null = null;
  const tm = t.match(/\(?\s*[xX]\s*(\d+)\s*\)?\s*$/);
  if (tm) { times = parseInt(tm[1], 10); t = t.slice(0, tm.index).trim(); }
  let startRepeat = false, endRepeat = false;
  if (t.startsWith('|:')) { startRepeat = true; t = t.slice(2); }
  else if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith(':|')) { endRepeat = true; t = t.slice(0, -2); }
  else if (t.endsWith('|')) t = t.slice(0, -1);
  if (times !== null) endRepeat = true; // a count implies the phrase repeats
  const bars = t.split('|').map((b) => b.trim().split(/\s+/).filter(Boolean)).filter((b) => b.length);
  return { startRepeat, endRepeat, times, bars };
}

// A bar/number chart line: chord cells between styled barlines, with repeat marks and an
// ×N badge. Transpose/Nashville apply per chord, so the Nashville toggle yields a number chart.
function renderGrid(raw: string, o: RenderOpts): HTMLElement {
  const el = document.createElement('div');
  el.className = 'ln grid';
  const { startRepeat, endRepeat, times, bars } = parseBarLine(raw);
  if (!bars.length) { el.textContent = raw; return el; } // graceful fallback
  const mark = (cls: string, txt: string) => {
    const s = document.createElement('span'); s.className = cls; s.textContent = txt; el.appendChild(s);
  };
  if (startRepeat) mark('barline rep', '‖:');
  bars.forEach((bar, i) => {
    if (i > 0) mark('barline', '|');
    const cell = document.createElement('span'); cell.className = 'bar';
    for (const tok of bar) {
      const c = document.createElement('span'); c.className = 'bar-chord';
      c.textContent = showChord(tok, o);
      cell.appendChild(c);
    }
    el.appendChild(cell);
  });
  if (endRepeat) mark('barline rep', ':‖');
  if (times) mark('rep-times', '×' + times);
  return el;
}

export function renderSong(song: Song, o: RenderOpts): HTMLElement {
  const body = document.createElement('div');
  body.className = 'song-body';
  for (const ln of song.lines) body.appendChild(renderLine(ln, o));
  return body;
}

function renderLine(ln: Line, o: RenderOpts): HTMLElement {
  const el = document.createElement('div');
  if (ln.kind === 'blank') { el.className = 'ln blank'; return el; }
  if (ln.kind === 'comment') { el.className = 'ln comment'; el.textContent = ln.text; return el; }
  if (ln.kind === 'section') { el.className = 'ln section'; el.textContent = ln.text; return el; }
  if (ln.kind === 'grid') return renderGrid(ln.text, o);
  el.className = 'ln lyric';
  for (const seg of ln.segments) {
    const wrap = document.createElement('span');
    wrap.className = 'seg';
    const chord = document.createElement('span');
    chord.className = 'seg-chord';
    chord.textContent = seg.chord ? showChord(seg.chord, o) : '';
    const text = document.createElement('span');
    text.className = 'seg-text';
    text.textContent = seg.text.length ? seg.text : ' ';
    wrap.append(chord, text);
    el.appendChild(wrap);
  }
  return el;
}
