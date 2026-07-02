// Setlists UI (DESIGN.md §14 step 6, N): an index of saved sets, a detail view to reorder /
// remove songs, and a performance mode that plays through the set with Prev/Next.
import { type Entry } from '../catalog';
import {
  allSetlists, getSetlist, createSetlist, renameSetlist, deleteSetlist,
  removeFromSetlist, moveInSetlist,
} from '../setlists';
import { renderSongView } from './song';

export interface SetlistNav {
  open: (id: string) => void;                              // setlist detail
  index: () => void;                                       // setlists index
  song: (songId: string) => void;                          // open a song (Back returns to the set)
  perform: (id: string, i: number, replace?: boolean) => void;
  back: () => void;
}
type Lookup = (id: string) => Entry | undefined;

function b(label: string, cls = ''): HTMLButtonElement {
  const x = document.createElement('button'); x.textContent = label; if (cls) x.className = cls; return x;
}

export function renderSetlistsIndex(nav: SetlistNav): HTMLElement {
  const root = document.createElement('div'); root.className = 'view setlists';
  const title = document.createElement('h1'); title.className = 'song-title'; title.textContent = 'Setlists';
  const add = b('＋ New setlist', 'on');
  add.onclick = () => { const name = prompt('Name this setlist:'); if (name !== null) nav.open(createSetlist(name).id); };
  const head = document.createElement('div'); head.className = 'song-head'; head.append(title, add);

  const rows = document.createElement('div'); rows.className = 'rows';
  const lists = allSetlists();
  if (!lists.length) {
    const e = document.createElement('p'); e.className = 'empty';
    e.textContent = 'No setlists yet. Create one, then add songs with ＋ Set on any song.';
    rows.append(e);
  } else for (const s of lists) {
    const r = document.createElement('div'); r.className = 'row'; r.onclick = () => nav.open(s.id);
    const t = document.createElement('div'); t.className = 'row-title'; t.textContent = s.name;
    const c = document.createElement('span'); c.className = 'badge';
    c.textContent = `${s.songIds.length} song${s.songIds.length === 1 ? '' : 's'}`;
    r.append(t, c); rows.append(r);
  }
  root.append(head, rows);
  return root;
}

export function renderSetlistDetail(id: string, lookup: Lookup, nav: SetlistNav): HTMLElement {
  const root = document.createElement('div'); root.className = 'view setlist';
  function draw() {
    root.innerHTML = '';
    const back = b('← Setlists', 'back'); back.onclick = nav.index;
    const s = getSetlist(id);
    if (!s) { const p = document.createElement('p'); p.className = 'loading'; p.textContent = 'Setlist not found.'; root.append(back, p); return; }
    const title = document.createElement('h1'); title.className = 'song-title'; title.textContent = s.name;
    const head = document.createElement('div'); head.className = 'song-head'; head.append(back, title);

    const perform = b('▶ Perform', 'on'); perform.disabled = !s.songIds.length; perform.onclick = () => nav.perform(id, 0);
    const rename = b('Rename'); rename.onclick = () => { const n = prompt('Rename setlist:', s.name); if (n !== null) { renameSetlist(id, n); draw(); } };
    const del = b('Delete'); del.onclick = () => { if (confirm(`Delete "${s.name}"?`)) { deleteSetlist(id); nav.index(); } };
    const bar = document.createElement('div'); bar.className = 'controls'; bar.append(perform, rename, del);

    const rows = document.createElement('div'); rows.className = 'rows';
    if (!s.songIds.length) {
      const e = document.createElement('p'); e.className = 'empty'; e.textContent = 'Empty. Open a song and tap ＋ Set to add it here.'; rows.append(e);
    } else s.songIds.forEach((sid, i) => {
      const e = lookup(sid);
      const r = document.createElement('div'); r.className = 'row setlist-row';
      const num = document.createElement('span'); num.className = 'setnum'; num.textContent = String(i + 1);
      const t = document.createElement('div'); t.className = 'row-title'; t.textContent = e ? e.title : sid; t.onclick = () => nav.song(sid);
      const up = b('↑'); up.disabled = i === 0; up.onclick = () => { moveInSetlist(id, i, -1); draw(); };
      const dn = b('↓'); dn.disabled = i === s.songIds.length - 1; dn.onclick = () => { moveInSetlist(id, i, 1); draw(); };
      const rm = b('✕'); rm.onclick = () => { removeFromSetlist(id, sid); draw(); };
      up.setAttribute('aria-label', 'Move up'); dn.setAttribute('aria-label', 'Move down');
      rm.setAttribute('aria-label', 'Remove from setlist');
      const tools = document.createElement('div'); tools.className = 'setrow-tools'; tools.append(up, dn, rm);
      r.append(num, t);
      if (e && e.key) { const k = document.createElement('span'); k.className = 'badge key'; k.textContent = e.key; r.append(k); }
      r.append(tools);
      rows.append(r);
    });
    root.append(head, bar, rows);
  }
  draw();
  return root;
}

export async function renderPerform(id: string, index: number, lookup: Lookup, nav: SetlistNav): Promise<HTMLElement> {
  const root = document.createElement('div'); root.className = 'perform';
  const s = getSetlist(id);
  if (!s || !s.songIds.length) {
    const p = document.createElement('p'); p.className = 'loading'; p.textContent = 'Nothing to perform.'; root.append(p); return root;
  }
  const i = Math.max(0, Math.min(index, s.songIds.length - 1));
  const done = b('✕ Done'); done.onclick = () => nav.back();
  const prev = b('‹ Prev'); prev.disabled = i === 0; prev.onclick = () => nav.perform(id, i - 1, true);
  const next = b('Next ›', 'on'); next.disabled = i === s.songIds.length - 1; next.onclick = () => nav.perform(id, i + 1, true);
  const counter = document.createElement('span'); counter.className = 'perform-counter';
  counter.textContent = `${i + 1} / ${s.songIds.length} · ${s.name}`;
  const bar = document.createElement('div'); bar.className = 'perform-bar'; bar.append(done, prev, counter, next);
  root.append(bar);

  const entry = lookup(s.songIds[i]);
  if (!entry) { const p = document.createElement('p'); p.className = 'loading'; p.textContent = 'Song not in library.'; root.append(p); return root; }
  root.append(await renderSongView(entry, () => nav.open(id))); // ← Songs exits to the setlist
  return root;
}
