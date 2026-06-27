// Non-destructive edit overlays. In-app edits are stored in localStorage, keyed by chart id,
// and layered on top of the canonical master at load time — the .cho file is never mutated.
// Reverting an edit = deleting the overlay (DESIGN.md §4, §11). Static-host-safe (no backend).
const PREFIX = 'woodshed:overlay:';

export function overlayGet(id: string): string | null {
  try { return localStorage.getItem(PREFIX + id); } catch { return null; }
}
export function overlaySet(id: string, text: string): void {
  try { localStorage.setItem(PREFIX + id, text); } catch { /* quota / private mode: ignore */ }
}
export function overlayClear(id: string): void {
  try { localStorage.removeItem(PREFIX + id); } catch { /* ignore */ }
}
export function overlayHas(id: string): boolean {
  return overlayGet(id) !== null;
}
