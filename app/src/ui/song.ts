import { type Entry, type Chart, loadChart, primaryChart } from '../catalog';
import { parseChordPro, type Song } from '../chordpro';
import { renderSong } from '../render';
import { keyPrefersFlat, soundingKey, capoHint } from '../music';

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

export async function renderSongView(entry: Entry, onBack: () => void): Promise<HTMLElement> {
  const root = document.createElement('div'); root.className = 'view song';
  let current = primaryChart(entry);
  if (!current) {
    const back = btn('← Songs'); back.onclick = onBack;
    const msg = document.createElement('p'); msg.className = 'loading'; msg.textContent = 'No chart for this song yet.';
    root.append(back, msg);
    return root;
  }

  let raw = await loadChart(current.file);
  let song = parseChordPro(raw);
  let transpose = 0;
  let nashville = false;
  let fontPx = 19;

  const back = btn('← Songs'); back.onclick = onBack;
  const title = document.createElement('h1'); title.className = 'song-title';
  const keyBadge = document.createElement('span'); keyBadge.className = 'badge key';
  const head = document.createElement('div'); head.className = 'song-head';
  head.append(back, title, keyBadge);

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
  const dl = btn('⤓ .cho');
  const capo = document.createElement('span'); capo.className = 'capo';
  const controls = document.createElement('div'); controls.className = 'controls';
  controls.append(
    group([tDown, lbl('Transpose ', tVal), tUp]),
    nashBtn,
    group([fDown, lbl('Size'), fUp]),
    capo,
    dl,
  );

  const wrap = document.createElement('div'); wrap.className = 'song-body-wrap';
  root.append(head, arrangements, controls, wrap);

  async function selectChart(c: Chart) {
    current = c;
    transpose = 0; nashville = false; // a different arrangement may be in a different key
    raw = await loadChart(c.file);
    song = parseChordPro(raw);
    buildSwitcher();
    draw();
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
  dl.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([raw], { type: 'text/plain' }));
    a.download = current!.id + '.cho';
    a.click();
  };

  buildSwitcher();
  draw();
  return root;
}
