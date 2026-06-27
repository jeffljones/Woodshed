import { type Entry, type Chart, loadChart, primaryChart } from '../catalog';
import { parseChordPro } from '../chordpro';
import { renderSong } from '../render';
import { keyPrefersFlat, soundingKey, capoHint } from '../music';
import { overlayGet, overlaySet, overlayClear, overlayHas } from '../overlays';
import { renderEditor } from './editor';
import { openShareSheet } from './share';

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
    const back = btn('← Songs'); back.onclick = onBack;
    const msg = document.createElement('p'); msg.className = 'loading'; msg.textContent = 'No chart for this song yet.';
    root.append(back, msg);
    return root;
  }

  let raw = await loadText(current);
  let song = parseChordPro(raw);
  let transpose = 0;
  let nashville = false;
  let fontPx = 19;

  const back = btn('← Songs'); back.onclick = onBack;
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
  const shareBtn = btn('⤴ Share');
  const capo = document.createElement('span'); capo.className = 'capo';
  const controls = document.createElement('div'); controls.className = 'controls';
  controls.append(
    group([tDown, lbl('Transpose ', tVal), tUp]),
    nashBtn,
    group([fDown, lbl('Size'), fUp]),
    capo,
    editBtn,
    shareBtn,
  );

  const wrap = document.createElement('div'); wrap.className = 'song-body-wrap';
  const editorWrap = document.createElement('div'); editorWrap.className = 'editor-wrap'; editorWrap.style.display = 'none';
  root.append(head, arrangements, controls, wrap, editorWrap);

  function syncEdited() { editedBadge.style.display = overlayHas(current!.id) ? '' : 'none'; }

  async function selectChart(c: Chart) {
    current = c;
    transpose = 0; nashville = false;
    exitEdit();
    raw = await loadText(c);
    song = parseChordPro(raw);
    buildSwitcher(); syncEdited(); draw();
  }

  function enterEdit() {
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

  tUp.onclick = () => { transpose++; draw(); };
  tDown.onclick = () => { transpose--; draw(); };
  nashBtn.onclick = () => { nashville = !nashville; draw(); };
  fUp.onclick = () => { fontPx = Math.min(34, fontPx + 2); draw(); };
  fDown.onclick = () => { fontPx = Math.max(12, fontPx - 2); draw(); };
  editBtn.onclick = enterEdit;
  shareBtn.onclick = () => openShareSheet({ rawText: raw, filename: current!.id + '.cho' });

  buildSwitcher();
  syncEdited();
  draw();
  return root;
}
