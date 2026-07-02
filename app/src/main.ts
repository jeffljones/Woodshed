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
import { renderSetlistsIndex, renderSetlistDetail, renderPerform, type SetlistNav } from './ui/setlists';
import { openPractice } from './ui/practice';
import { initTheme, buildThemeControl } from './theme';

const app = document.getElementById('app') as HTMLElement;
let songs: Entry[] = [];
let byId = new Map<string, Entry>();

// Home view state, persisted across navigation so returning from a song restores the
// filter / search / sort / view mode and scroll position.
const homeState: HomeState = { filter: 'all', q: '', sort: 'title', grid: false, scrollY: 0 };

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

function navTo(hash: string, replace = false) {
  if (replace) history.replaceState({}, '', hash); else history.pushState({}, '', hash);
  route();
}

const setlistNav: SetlistNav = {
  open: (id) => navTo('#/set/' + id),
  index: () => navTo('#/setlists'),
  song: (sid) => { const e = byId.get(sid); if (e) openSong(e); },
  perform: (id, i, replace) => navTo('#/perform/' + id + '/' + i, replace),
  back: () => history.back(),
};

function header(): HTMLElement {
  const h = document.createElement('header'); h.className = 'topbar';
  const brand = document.createElement('div'); brand.className = 'brand'; brand.textContent = 'Woodshed';
  brand.title = 'Library home'; brand.onclick = goHome;
  const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = `${songs.length} songs`;
  const spacer = document.createElement('div'); spacer.className = 'spacer';
  const sets = document.createElement('button'); sets.className = 'navlink'; sets.textContent = '♫ Setlists';
  sets.onclick = () => navTo('#/setlists');
  const prac = document.createElement('button'); prac.className = 'navlink'; prac.textContent = '♩ Practice';
  prac.onclick = openPractice;
  h.append(brand, sub, spacer, sets, prac, buildThemeControl());
  return h;
}

function mount(view: HTMLElement) { app.innerHTML = ''; app.append(header(), view); }

function errorView(msg: string): HTMLElement {
  const d = document.createElement('div'); d.className = 'view';
  const back = document.createElement('button'); back.className = 'back'; back.textContent = '← Back';
  back.onclick = () => history.back();
  const p = document.createElement('p'); p.className = 'loading'; p.textContent = msg;
  d.append(back, p); return d;
}

function showHome() {
  mount(renderHome(songs, openSong, homeState));
  requestAnimationFrame(() => window.scrollTo(0, homeState.scrollY));
}
async function showSong(e: Entry) {
  try { mount(await renderSongView(e, goBack)); window.scrollTo(0, 0); }
  catch { mount(errorView(`Could not load the chart for “${e.title}”.`)); }
}
function showSetlists() { mount(renderSetlistsIndex(setlistNav)); window.scrollTo(0, 0); }
function showSetlist(id: string) { mount(renderSetlistDetail(id, (x) => byId.get(x), setlistNav)); window.scrollTo(0, 0); }
async function showPerform(id: string, i: number) {
  try { mount(await renderPerform(id, i, (x) => byId.get(x), setlistNav)); window.scrollTo(0, 0); }
  catch { mount(errorView('Could not load this setlist chart.')); }
}

function openSong(e: Entry) {
  homeState.scrollY = window.scrollY;
  history.pushState({ song: e.id }, '', '#/song/' + e.id);
  showSong(e);
}
function goBack() { history.back(); }
function goHome() { if (location.hash && location.hash !== '#') navTo('#'); }

function route() {
  const h = location.hash;
  let m: RegExpMatchArray | null;
  if ((m = h.match(/^#\/song\/(.+)$/))) { const e = byId.get(decodeURIComponent(m[1])); if (e) return showSong(e); }
  else if ((m = h.match(/^#\/perform\/([^/]+)\/(\d+)$/))) return showPerform(decodeURIComponent(m[1]), parseInt(m[2], 10));
  else if ((m = h.match(/^#\/set\/(.+)$/))) return showSetlist(decodeURIComponent(m[1]));
  else if (h === '#/setlists') return showSetlists();
  return showHome();
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
  byId = new Map(songs.map((s) => [s.id, s]));
  // Deep link to a song: seed a home entry beneath it so the first Back lands on the list.
  const m = location.hash.match(/^#\/song\/(.+)$/);
  const id = m && byId.get(decodeURIComponent(m[1])) ? decodeURIComponent(m[1]) : null;
  if (id) { history.replaceState(null, '', '#'); history.pushState({ song: id }, '', '#/song/' + id); }
  route();
}

initTheme();
boot();
