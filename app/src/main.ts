import './styles.css';
import '@fontsource/spectral/600.css';
import '@fontsource/hanken-grotesk/400.css';
import '@fontsource/hanken-grotesk/500.css';
import '@fontsource/hanken-grotesk/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import { loadIndex, type Entry } from './catalog';
import { renderHome, type HomeState } from './ui/home';
import { renderSongView } from './ui/song';
import { initTheme, buildThemeControl } from './theme';

const app = document.getElementById('app') as HTMLElement;
let songs: Entry[] = [];

// Home view state, persisted across navigation so returning from a song restores the
// filter / search / sort / view mode and scroll position instead of resetting.
const homeState: HomeState = { filter: 'all', q: '', sort: 'title', grid: false, scrollY: 0 };

// We restore scroll ourselves on back/forward; stop the browser from also doing it.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function header(): HTMLElement {
  const h = document.createElement('header'); h.className = 'topbar';
  const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'Woodshed';
  brand.title = 'Library home'; brand.onclick = goHome;
  const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = `${songs.length} songs`;
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  h.append(brand, sub, spacer, buildThemeControl());
  return h;
}

function mount(view: HTMLElement) {
  app.innerHTML = '';
  app.append(header(), view);
}

function showHome() {
  mount(renderHome(songs, openSong, homeState));
  requestAnimationFrame(() => window.scrollTo(0, homeState.scrollY)); // after rows lay out
}

async function showSong(e: Entry) {
  mount(await renderSongView(e, goBack));
  window.scrollTo(0, 0);
}

// User picked a song from the list: remember the list scroll, push history so Back returns.
function openSong(e: Entry) {
  homeState.scrollY = window.scrollY;
  history.pushState({ song: e.id }, '', '#/song/' + e.id);
  showSong(e);
}

// "← Songs" button / device Back — return to the list (popstate re-renders + restores it).
function goBack() { history.back(); }

// Brand: jump to the list from anywhere.
function goHome() { if (location.hash && location.hash !== '#') history.back(); }

function route() {
  const m = location.hash.match(/^#\/song\/(.+)$/);
  const found = m ? songs.find((s) => s.id === decodeURIComponent(m[1])) : undefined;
  if (found) showSong(found); else showHome();
}

window.addEventListener('popstate', route);

async function boot() {
  app.innerHTML = '<div class="loading">Loading library…</div>';
  try {
    songs = await loadIndex();
  } catch (err) {
    app.innerHTML = `<div class="loading">Could not load library.<br>${String(err)}</div>`;
    return;
  }
  // Deep link to a song: seed a home entry beneath it so the first Back lands on the list.
  const m = location.hash.match(/^#\/song\/(.+)$/);
  const id = m && songs.find((s) => s.id === decodeURIComponent(m[1])) ? decodeURIComponent(m[1]) : null;
  if (id) {
    history.replaceState(null, '', '#');
    history.pushState({ song: id }, '', '#/song/' + id);
  }
  route();
}

initTheme();
boot();
