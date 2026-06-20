import { type Entry, sortKey } from '../catalog';

const TAGS: [string, string][] = [
  ['all', 'All'], ['charts', 'Has chart'], ['jam', 'Jam'], ['instrumental', 'Instrumental'],
  ['jjb', 'JJB'], ['trio', 'Trio'], ['tt', 'TT'], ['gypsy-wind', 'Gypsy Wind'],
];

export function renderList(songs: Entry[], onOpen: (e: Entry) => void): HTMLElement {
  const root = document.createElement('div'); root.className = 'view list';
  const search = document.createElement('input');
  search.type = 'search'; search.placeholder = 'Search songs…'; search.className = 'search';
  const chips = document.createElement('div'); chips.className = 'chips';
  const count = document.createElement('div'); count.className = 'count';
  const rows = document.createElement('div'); rows.className = 'rows';
  root.append(search, chips, count, rows);

  let q = '';
  let tag = 'all';

  function passes(s: Entry): boolean {
    if (tag === 'charts' && !s.hasChords) return false;
    if (tag !== 'all' && tag !== 'charts' && !s.tags.includes(tag)) return false;
    if (q && !s.title.toLowerCase().includes(q)) return false;
    return true;
  }

  function badge(cls: string, text: string): HTMLElement {
    const b = document.createElement('span'); b.className = 'badge ' + cls; b.textContent = text; return b;
  }

  function draw() {
    chips.innerHTML = '';
    for (const [k, label] of TAGS) {
      const c = document.createElement('button');
      c.className = 'chip' + (tag === k ? ' on' : '');
      c.textContent = label;
      c.onclick = () => { tag = k; draw(); };
      chips.appendChild(c);
    }
    const list = songs.filter(passes).sort((a, b) => sortKey(a.title).localeCompare(sortKey(b.title)));
    count.textContent = `${list.length} songs`;
    rows.innerHTML = '';
    for (const s of list) {
      const r = document.createElement('div'); r.className = 'row'; r.onclick = () => onOpen(s);
      const t = document.createElement('div'); t.className = 'row-title'; t.textContent = s.title;
      r.appendChild(t);
      if (s.lead) r.appendChild(badge('lead', s.lead));
      if (s.hasChords) r.appendChild(badge('chords', '♪'));
      if (s.key) r.appendChild(badge('key', s.key));
      rows.appendChild(r);
    }
  }

  search.oninput = () => { q = search.value.toLowerCase(); draw(); };
  draw();
  return root;
}
