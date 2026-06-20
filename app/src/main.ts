import './styles.css';
import { loadIndex, type Entry } from './catalog';
import { renderList } from './ui/list';
import { renderSongView } from './ui/song';

const app = document.getElementById('app') as HTMLElement;
let songs: Entry[] = [];

function header(): HTMLElement {
  const h = document.createElement('header'); h.className = 'topbar';
  const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'Woodshed';
  brand.onclick = showList;
  const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = `${songs.length} songs`;
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const theme = document.createElement('button'); theme.className = 'theme'; theme.textContent = '◐';
  theme.title = 'Toggle day / stage';
  theme.onclick = () => document.body.classList.toggle('day');
  h.append(brand, sub, spacer, theme);
  return h;
}

function mount(view: HTMLElement) {
  app.innerHTML = '';
  app.append(header(), view);
  window.scrollTo(0, 0);
}

function showList() {
  history.replaceState(null, '', '#');
  mount(renderList(songs, openSong));
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

boot();
