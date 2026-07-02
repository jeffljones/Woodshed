// Theme controller: Auto / Light / Dark, persisted, with live OS-change following.
//   dark  = "Console" (default, stage)   light = "Fakebook" (paper, rehearsal)
export type ThemeMode = 'auto' | 'light' | 'dark';

const KEY = 'woodshed:theme';
const mq = window.matchMedia('(prefers-color-scheme: light)');

function mode(): ThemeMode {
  return (localStorage.getItem(KEY) as ThemeMode) || 'auto';
}
function effective(m: ThemeMode): 'light' | 'dark' {
  return m === 'auto' ? (mq.matches ? 'light' : 'dark') : m;
}
function apply(): void {
  document.documentElement.dataset.theme = effective(mode());
}

export function initTheme(): void {
  apply();
  // When in Auto, follow the OS flipping while the app is open.
  mq.addEventListener('change', () => { if (mode() === 'auto') apply(); });
}

const OPTS: [ThemeMode, string, string][] = [
  ['auto', '◐', 'Auto'],
  ['light', '☀', 'Light'],
  ['dark', '☾', 'Dark'],
];

export function buildThemeControl(): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'themectl';
  const btns: HTMLButtonElement[] = [];
  for (const [m, glyph, label] of OPTS) {
    const b = document.createElement('button');
    b.className = 'themebtn';
    b.textContent = glyph;
    b.title = `Theme: ${label}`;
    b.setAttribute('aria-label', `Theme: ${label}`);
    b.onclick = () => { localStorage.setItem(KEY, m); apply(); sync(); };
    btns.push(b);
    wrap.appendChild(b);
  }
  function sync() {
    const cur = mode();
    btns.forEach((b, i) => b.classList.toggle('on', OPTS[i][0] === cur));
  }
  sync();
  return wrap;
}
