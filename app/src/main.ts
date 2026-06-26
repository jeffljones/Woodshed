import './styles.css';
import '@fontsource/spectral/600.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import { loadIndex, type Entry } from './catalog';
import { renderHome } from './ui/home';
import { renderSongView } from './ui/song';
import { initTheme, buildThemeControl } from './theme';

const app = document.getElementById('app') as HTMLElement;
let songs: Entry[] = [];

function header(): HTMLElement {
  const h = document.createElement('header'); h.className = 'topbar';
  const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'Woodshed';
  brand.onclick = showList;
  const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = `${songs.length} songs`;
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  h.append(brand, sub, spacer, buildThemeControl());
  return h;
}

function mount(view: HTMLElement) {
  app.innerHTML = '';
  app.append(header(), view);
  window.scrollTo(0, 0);
}

function showList() {
  history.replaceState(null, '', '#');
  mount(renderHome(songs, openSong));
}

async function openSong(e: Entry) {
  history.replaceState(null, '', '#/song/' + e.id);
  mount(await renderSongView(e, showList));
}

async function boot() {
  app.innerHTML = '<div class="loading">Loading library…</div>';
  try {
    songs = await loadIndex();
  } catch (err) {
    app.innerHTML = `<div class="loading">Could not load library.<br>${String(err)}</div>`;
    return;
  }
  const m = location.hash.match(/^#\/song\/(.+)$/);
  let found: Entry | undefined;
  if (m) found = songs.find((s) => s.id === decodeURIComponent(m[1]));
  if (found) openSong(found);
  else showList();
}

initTheme();
boot();
