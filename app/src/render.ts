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
  if (ln.kind === 'grid') {
    el.className = 'ln grid';
    el.textContent = ln.text.replace(/[A-G][#b]?[^\s|]*/g, (s) => showChord(s, o));
    return el;
  }
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
