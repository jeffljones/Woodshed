// Setlists: ordered, named collections of song ids, persisted per-device in localStorage
// (static-host-safe). A performance queue you build and play through (DESIGN.md §14 step 6).
export interface Setlist { id: string; name: string; songIds: string[]; }

const KEY = 'woodshed:setlists';

function load(): Setlist[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function save(lists: Setlist[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(lists)); } catch { /* quota / private mode: ignore */ }
}
function uid(): string { return 's' + Math.random().toString(36).slice(2, 9); }

export function allSetlists(): Setlist[] { return load(); }
export function getSetlist(id: string): Setlist | undefined { return load().find((s) => s.id === id); }

export function createSetlist(name: string): Setlist {
  const lists = load();
  const s: Setlist = { id: uid(), name: name.trim() || 'Untitled set', songIds: [] };
  lists.push(s); save(lists); return s;
}
export function renameSetlist(id: string, name: string): void {
  const lists = load(); const s = lists.find((x) => x.id === id);
  if (s) { s.name = name.trim() || s.name; save(lists); }
}
export function deleteSetlist(id: string): void { save(load().filter((s) => s.id !== id)); }

export function addToSetlist(id: string, songId: string): void {
  const lists = load(); const s = lists.find((x) => x.id === id);
  if (s && !s.songIds.includes(songId)) { s.songIds.push(songId); save(lists); }
}
export function removeFromSetlist(id: string, songId: string): void {
  const lists = load(); const s = lists.find((x) => x.id === id);
  if (s) { s.songIds = s.songIds.filter((x) => x !== songId); save(lists); }
}
export function moveInSetlist(id: string, index: number, dir: -1 | 1): void {
  const lists = load(); const s = lists.find((x) => x.id === id); if (!s) return;
  const j = index + dir;
  if (index < 0 || j < 0 || j >= s.songIds.length) return;
  [s.songIds[index], s.songIds[j]] = [s.songIds[j], s.songIds[index]];
  save(lists);
}
