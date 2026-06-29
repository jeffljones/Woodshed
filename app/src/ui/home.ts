// Master–detail Home (DESIGN.md §14, step 3): left sidebar filter-nav + right pane with
// search, sort, list⇄grid toggle, an A–Z jump rail, and badged rows/cards.
import { type Entry, type ChartType, sortKey, primaryChart, hasChart } from '../catalog';

type SortMode = 'title' | 'key' | 'type';

// Content-type badge: [css class, label]. Classes are themed in styles.css.
const TYPE_BADGE: Record<ChartType, [string, string]> = {
  chord_lyric: ['cl', 'Chords'],
  bar_chart: ['bar', 'Bars'],
  tab: ['tab', 'Tab'],
  notation: ['notation', 'Score'],
};

// Sidebar nav. Filter ids: 'all' | 'haschart' | 'type:<ChartType>' | 'tag:<tag>'.
const TYPE_NAV: [ChartType, string][] = [
  ['chord_lyric', 'Chords'], ['bar_chart', 'Bars'], ['tab', 'Tab'], ['notation', 'Score'],
];
const TAG_NAV: [string, string][] = [
  ['jam', 'Jam'], ['instrumental', 'Instrumental'], ['jjb', 'JJB'],
  ['trio', 'Trio'], ['tt', 'TT'], ['gypsy-wind', 'Gypsy Wind'],
];

const LETTERS = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function matchesFilter(e: Entry, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'haschart') return hasChart(e);
  if (filter.startsWith('type:')) return e.charts.some((c) => !c.stub && c.type === filter.slice(5));
  if (filter.startsWith('tag:')) return e.tags.includes(filter.slice(4));
  return true;
}

// Jump-rail bucket for a title — uses the same article-stripped sort key as ordering,
// so "A Whole New World" files (and jumps) under W, consistent with the list order.
function letterOf(title: string): string {
  const c = (sortKey(title)[0] || '#').toUpperCase();
  return c >= 'A' && c <= 'Z' ? c : '#';
}

// Persisted across navigation so returning from a song restores the list exactly.
export interface HomeState { filter: string; q: string; sort: SortMode; grid: boolean; scrollY: number; }

export function renderHome(songs: Entry[], onOpen: (e: Entry) => void, state: HomeState): HTMLElement {
  let filter = state.filter;
  let q = state.q.toLowerCase().trim(); // q = match string; state.q keeps the raw display value
  let sort: SortMode = state.sort;
  let grid = state.grid;

  const root = document.createElement('div'); root.className = 'home';

  const filterCount = (id: string) => songs.filter((s) => matchesFilter(s, id)).length;

  function badge(cls: string, text: string): HTMLElement {
    const b = document.createElement('span'); b.className = 'badge ' + cls; b.textContent = text; return b;
  }
  function badgesFor(e: Entry): HTMLElement[] {
    const out: HTMLElement[] = [];
    if (e.lead) out.push(badge('lead', e.lead));
    const pc = primaryChart(e);
    if (pc) {
      if (pc.stub) out.push(badge('stub', 'Stub'));
      else { const [cls, label] = TYPE_BADGE[pc.type]; out.push(badge(cls, label)); }
    }
    if (e.key) out.push(badge('key', e.key));
    return out;
  }

  // ---- sidebar (filter nav) ----
  const sidebar = document.createElement('aside'); sidebar.className = 'sidebar';
  function navItem(id: string, label: string): HTMLButtonElement {
    const n = filterCount(id);
    const b = document.createElement('button'); b.className = 'navitem'; b.dataset.filter = id;
    const t = document.createElement('span'); t.textContent = label;
    const c = document.createElement('span'); c.className = 'navcount'; c.textContent = String(n);
    b.append(t, c);
    if (!n) b.disabled = true;
    b.onclick = () => { filter = state.filter = id; root.classList.remove('show-filters'); syncNav(); draw(); };
    return b;
  }
  function navGroup(title: string, items: HTMLElement[]): HTMLElement | null {
    if (!items.length) return null;
    const g = document.createElement('div'); g.className = 'navgroup';
    const h = document.createElement('div'); h.className = 'navtitle'; h.textContent = title;
    g.append(h, ...items); return g;
  }
  const groups = [
    navGroup('Library', [navItem('all', 'All songs'), navItem('haschart', 'Has chart')]),
    navGroup('Type', TYPE_NAV.filter(([t]) => filterCount('type:' + t) > 0).map(([t, l]) => navItem('type:' + t, l))),
    navGroup('Collections', TAG_NAV.filter(([t]) => filterCount('tag:' + t) > 0).map(([t, l]) => navItem('tag:' + t, l))),
  ].filter((g): g is HTMLElement => g !== null);
  sidebar.append(...groups);
  const navButtons = [...sidebar.querySelectorAll<HTMLButtonElement>('button.navitem')];
  function syncNav() { navButtons.forEach((b) => b.classList.toggle('on', b.dataset.filter === filter)); }

  // ---- pane (search / toolbar / results + A–Z rail) ----
  const pane = document.createElement('section'); pane.className = 'pane';

  const search = document.createElement('input');
  search.type = 'search'; search.placeholder = 'Search songs…'; search.className = 'search';
  search.value = state.q;
  search.oninput = () => { state.q = search.value; q = state.q.toLowerCase().trim(); draw(); };

  const filtersToggle = document.createElement('button');
  filtersToggle.className = 'filters-toggle'; filtersToggle.textContent = '☰ Filters';
  filtersToggle.onclick = () => root.classList.toggle('show-filters');

  const sortSel = document.createElement('select'); sortSel.className = 'sortsel';
  for (const [v, l] of [['title', 'Title'], ['key', 'Key'], ['type', 'Type']] as [SortMode, string][]) {
    const o = document.createElement('option'); o.value = v; o.textContent = 'Sort: ' + l; sortSel.appendChild(o);
  }
  sortSel.value = state.sort;
  sortSel.onchange = () => { sort = state.sort = sortSel.value as SortMode; draw(); };

  const listBtn = document.createElement('button'); listBtn.textContent = '☰'; listBtn.title = 'List view';
  const gridBtn = document.createElement('button'); gridBtn.textContent = '▦'; gridBtn.title = 'Grid view';
  listBtn.onclick = () => { grid = state.grid = false; syncView(); draw(); };
  gridBtn.onclick = () => { grid = state.grid = true; syncView(); draw(); };
  const viewToggle = document.createElement('div'); viewToggle.className = 'viewtoggle';
  viewToggle.append(listBtn, gridBtn);
  function syncView() { listBtn.classList.toggle('on', !grid); gridBtn.classList.toggle('on', grid); }

  const resultCount = document.createElement('div'); resultCount.className = 'count';
  const toolbar = document.createElement('div'); toolbar.className = 'toolbar';
  toolbar.append(filtersToggle, sortSel, viewToggle, resultCount);

  const results = document.createElement('div'); results.className = 'results';
  const az = document.createElement('nav'); az.className = 'az';
  const azBtns: Record<string, HTMLButtonElement> = {};
  for (const L of LETTERS) {
    const b = document.createElement('button'); b.className = 'azL'; b.textContent = L;
    b.onclick = () => results.querySelector<HTMLElement>(`[data-letter="${L}"]`)
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    azBtns[L] = b; az.appendChild(b);
  }
  const paneMain = document.createElement('div'); paneMain.className = 'pane-main';
  paneMain.append(results, az);
  pane.append(search, toolbar, paneMain);

  // ---- render ----
  function cmp(a: Entry, b: Entry): number {
    if (sort === 'key') {
      const ak = a.key || '￿', bk = b.key || '￿';
      if (ak !== bk) return ak.localeCompare(bk);
    } else if (sort === 'type') {
      const at = primaryChart(a)?.type || '￿', bt = primaryChart(b)?.type || '￿';
      if (at !== bt) return at.localeCompare(bt);
    }
    return sortKey(a.title).localeCompare(sortKey(b.title));
  }
  function rowEl(s: Entry): HTMLElement {
    const r = document.createElement('div'); r.className = 'row'; r.onclick = () => onOpen(s);
    const t = document.createElement('div'); t.className = 'row-title'; t.textContent = s.title;
    r.append(t, ...badgesFor(s)); return r;
  }
  function cardEl(s: Entry): HTMLElement {
    const c = document.createElement('div'); c.className = 'card'; c.onclick = () => onOpen(s);
    const t = document.createElement('div'); t.className = 'card-title'; t.textContent = s.title;
    const b = document.createElement('div'); b.className = 'card-badges'; b.append(...badgesFor(s));
    c.append(t, b); return c;
  }
  function draw() {
    const list = songs
      .filter((s) => matchesFilter(s, filter) && (!q || s.title.toLowerCase().includes(q)))
      .sort(cmp);
    resultCount.textContent = `${list.length} song${list.length === 1 ? '' : 's'}`;

    const present = new Set(list.map((s) => letterOf(s.title)));
    for (const L of LETTERS) azBtns[L].classList.toggle('off', !present.has(L));

    results.className = 'results' + (grid ? ' grid' : '');
    results.innerHTML = '';
    let last = '';
    for (const s of list) {
      const el = grid ? cardEl(s) : rowEl(s);
      const L = letterOf(s.title);
      if (L !== last) { el.dataset.letter = L; last = L; } // anchor first item of each letter
      results.appendChild(el);
    }
    if (!list.length) {
      const empty = document.createElement('div'); empty.className = 'empty'; empty.textContent = 'No songs match.';
      results.appendChild(empty);
    }
  }

  root.append(sidebar, pane);
  syncNav(); syncView(); draw();
  return root;
}
