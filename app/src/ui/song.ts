import { type Entry, loadChart } from '../catalog';
import { parseChordPro } from '../chordpro';
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

export async function renderSongView(entry: Entry, onBack: () => void): Promise<HTMLElement> {
  const root = document.createElement('div'); root.className = 'view song';
  const raw = await loadChart(entry.file);
  const song = parseChordPro(raw);

  let transpose = 0;
  let nashville = false;
  let fontPx = 19;

  const back = btn('← Songs'); back.onclick = onBack;
  const title = document.createElement('h1'); title.className = 'song-title'; title.textContent = song.title;
  const keyBadge = document.createElement('span'); keyBadge.className = 'badge key';
  const head = document.createElement('div'); head.className = 'song-head';
  head.append(back, title, keyBadge);

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
  root.append(head, controls, wrap);

  function draw() {
    const key = song.key;
    const sk = soundingKey(key, transpose);
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
    a.download = entry.id + '.cho';
    a.click();
  };

  draw();
  return root;
}
