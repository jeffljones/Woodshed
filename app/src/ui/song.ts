import { type Entry, type Chart, loadChart, primaryChart } from '../catalog';
import { parseChordPro } from '../chordpro';
import { renderSong } from '../render';
import { keyPrefersFlat, soundingKey, capoHint } from '../music';
import { overlayGet, overlaySet, overlayClear, overlayHas } from '../overlays';
import { renderEditor } from './editor';
import { openShareSheet } from './share';
import { openAddToSetlist } from './addToSet';

function btn(label: string): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label; return b;
}
function group(els: HTMLElement[]): HTMLElement {
  const g = document.createElement('div'); g.className = 'group'; g.append(...els); return g;
}
function lbl(text: string, val?: HTMLElement): HTMLElement {
  const l = document.createElement('span'); l.className = 'lbl'; l.textContent = text;
  if (val) l.appendChild(val);
  return l;
}

const TYPE_NAME: Record<Chart['type'], string> = {
  chord_lyric: 'Chords', bar_chart: 'Bars', tab: 'Tab', notation: 'Score',
};

// Per-device view prefs: font size persists globally, transpose per chart id — so a song
// you always play +2 opens at +2.
const FONT_KEY = 'woodshed:fontpx';
const tKey = (id: string) => 'woodshed:transpose:' + id;
function readInt(k: string, dflt: number): number {
  try { const v = parseInt(localStorage.getItem(k) ?? '', 10); return Number.isFinite(v) ? v : dflt; }
  catch { return dflt; }
}
function writeInt(k: string, v: number, dflt: number): void {
  try { if (v === dflt) localStorage.removeItem(k); else localStorage.setItem(k, String(v)); }
  catch { /* quota / private mode: ignore */ }
}
function arrLabel(c: Chart): string {
  return TYPE_NAME[c.type] + (c.key ? ' · ' + c.key : '');
}

// Edits layer on top of the master via a localStorage overlay; the master file is canonical.
function loadText(c: Chart): Promise<string> {
  const o = overlayGet(c.id);
  return o !== null ? Promise.resolve(o) : loadChart(c.file);
}

export async function renderSongView(entry: Entry, onBack: () => void): Promise<HTMLElement> {
  const root = document.createElement('div'); root.className = 'view song';
  let current = primaryChart(entry);
  if (!current) {
    const back = btn('← Songs'); back.className = 'back'; back.onclick = onBack;
    const msg = document.createElement('p'); msg.className = 'loading'; msg.textContent = 'No chart for this song yet.';
    root.append(back, msg);
    return root;
  }

  let raw = await loadText(current);
  let song = parseChordPro(raw);
  let transpose = readInt(tKey(current.id), 0);
  let nashville = false;
  let fontPx = Math.max(12, Math.min(34, readInt(FONT_KEY, 19)));
  let scrolling = false, scrollSpeed = 24, scrollAcc = 0, scrollLast = 0, scrollRaf = 0;

  const back = btn('← Songs'); back.className = 'back'; back.onclick = onBack;
  const title = document.createElement('h1'); title.className = 'song-title';
  const keyBadge = document.createElement('span'); keyBadge.className = 'badge key';
  const editedBadge = document.createElement('span'); editedBadge.className = 'badge edited'; editedBadge.textContent = 'edited';
  const head = document.createElement('div'); head.className = 'song-head';
  head.append(back, title, keyBadge, editedBadge);

  // Arrangement switcher (K): shown only when a Work has more than one chart.
  const arrangements = document.createElement('div'); arrangements.className = 'arrangements';
  function buildSwitcher() {
    arrangements.innerHTML = '';
    if (entry.charts.length < 2) return;
    for (const c of entry.charts) {
      const b = document.createElement('button');
      b.className = 'arr' + (c === current ? ' on' : '');
      b.textContent = arrLabel(c);
      b.onclick = () => { if (c !== current) selectChart(c); };
      arrangements.appendChild(b);
    }
  }

  const tDown = btn('−'), tUp = btn('+');
  const tVal = document.createElement('b'); tVal.className = 'tval';
  const nashBtn = btn('Nashville');
  const fDown = btn('A−'), fUp = btn('A+');
  const editBtn = btn('✎ Edit');
  const setBtn = btn('＋ Set');
  const shareBtn = btn('⤴ Share');
  const spdDown = btn('−'), spdUp = btn('+');
  const playBtn = btn('▶'); playBtn.title = 'Auto-scroll';
  const capo = document.createElement('span'); capo.className = 'capo';
  const controls = document.createElement('div'); controls.className = 'controls';
  controls.append(
    group([tDown, lbl('Transpose ', tVal), tUp]),
    nashBtn,
    group([fDown, lbl('Size'), fUp]),
    group([spdDown, playBtn, spdUp]),
    capo,
    editBtn,
    setBtn,
    shareBtn,
  );

  const wrap = document.createElement('div'); wrap.className = 'song-body-wrap';
  const editorWrap = document.createElement('div'); editorWrap.className = 'editor-wrap'; editorWrap.style.display = 'none';
  root.append(head, arrangements, controls, wrap, editorWrap);

  function syncEdited() { editedBadge.style.display = overlayHas(current!.id) ? '' : 'none'; }

  async function selectChart(c: Chart) {
    current = c;
    transpose = readInt(tKey(c.id), 0); nashville = false;
    exitEdit();
    try { raw = await loadText(c); }
    catch { wrap.innerHTML = '<p class="loading">Could not load this chart.</p>'; return; }
    song = parseChordPro(raw);
    buildSwitcher(); syncEdited(); draw();
  }

  function enterEdit() {
    stopScroll();
    controls.style.display = 'none'; wrap.style.display = 'none';
    editorWrap.innerHTML = '';
    editorWrap.appendChild(renderEditor({
      initial: raw, transpose, nashville, hasOverlay: overlayHas(current!.id),
      onSave: (text) => { overlaySet(current!.id, text); raw = text; song = parseChordPro(text); exitEdit(); syncEdited(); draw(); },
      onRevert: async () => { overlayClear(current!.id); raw = await loadChart(current!.file); song = parseChordPro(raw); exitEdit(); syncEdited(); draw(); },
      onClose: () => { exitEdit(); draw(); },
    }));
    editorWrap.style.display = '';
  }
  function exitEdit() {
    editorWrap.style.display = 'none'; editorWrap.innerHTML = '';
    controls.style.display = ''; wrap.style.display = '';
  }

  function draw() {
    const key = song.key;
    const sk = soundingKey(key, transpose);
    title.textContent = song.title;
    keyBadge.textContent = nashville ? 'Numbers' : (sk ?? '—');
    tVal.textContent = (transpose > 0 ? '+' : '') + transpose;
    capo.textContent = nashville ? '' : capoHint(sk);
    nashBtn.classList.toggle('on', nashville);
    wrap.innerHTML = '';
    const el = renderSong(song, { transpose, nashville, flat: keyPrefersFlat(key), key });
    el.style.fontSize = fontPx + 'px';
    wrap.appendChild(el);
  }

  tUp.onclick = () => { transpose++; writeInt(tKey(current!.id), transpose, 0); draw(); };
  tDown.onclick = () => { transpose--; writeInt(tKey(current!.id), transpose, 0); draw(); };
  nashBtn.onclick = () => { nashville = !nashville; draw(); };
  fUp.onclick = () => { fontPx = Math.min(34, fontPx + 2); writeInt(FONT_KEY, fontPx, 19); draw(); };
  fDown.onclick = () => { fontPx = Math.max(12, fontPx - 2); writeInt(FONT_KEY, fontPx, 19); draw(); };

  // Auto-scroll (A): rAF loop scrolls the page at an adjustable rate; sub-pixel accumulated
  // so slow speeds still move. Self-stops at the bottom or when the view is torn down.
  function stopScroll() {
    scrolling = false; cancelAnimationFrame(scrollRaf);
    playBtn.textContent = '▶'; playBtn.classList.remove('on');
  }
  function scrollFrame(ts: number) {
    if (!scrolling || !root.isConnected) { stopScroll(); return; }
    if (scrollLast) {
      scrollAcc += (scrollSpeed * (ts - scrollLast)) / 1000;
      const px = Math.floor(scrollAcc);
      if (px >= 1) { window.scrollBy(0, px); scrollAcc -= px; }
    }
    scrollLast = ts;
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 1) { stopScroll(); return; }
    scrollRaf = requestAnimationFrame(scrollFrame);
  }
  playBtn.onclick = () => {
    if (scrolling) { stopScroll(); return; }
    scrolling = true; playBtn.textContent = '⏸'; playBtn.classList.add('on');
    scrollLast = 0; scrollRaf = requestAnimationFrame(scrollFrame);
  };
  spdUp.onclick = () => { scrollSpeed = Math.min(160, scrollSpeed + 12); };
  spdDown.onclick = () => { scrollSpeed = Math.max(8, scrollSpeed - 12); };
  editBtn.onclick = enterEdit;
  shareBtn.onclick = () => openShareSheet({ rawText: raw, filename: current!.id + '.cho' });
  setBtn.onclick = () => openAddToSetlist(current!.id);

  buildSwitcher();
  syncEdited();
  draw();
  return root;
}
