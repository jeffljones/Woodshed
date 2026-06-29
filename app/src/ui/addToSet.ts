// "＋ Set" picker from the song view: toggle the current song in any setlist, or make a new
// one. Imports only the setlists model (no view) so the song view stays free of a cycle.
import { allSetlists, createSetlist, addToSetlist, removeFromSetlist } from '../setlists';

export function openAddToSetlist(songId: string): void {
  const backdrop = document.createElement('div'); backdrop.className = 'share-backdrop';
  const sheet = document.createElement('div'); sheet.className = 'share-sheet';
  function close() { backdrop.remove(); }

  function draw() {
    sheet.innerHTML = '';
    const h = document.createElement('h2'); h.className = 'share-title'; h.textContent = 'Add to setlist';
    sheet.append(h);
    for (const s of allSetlists()) {
      const has = s.songIds.includes(songId);
      const opt = document.createElement('button'); opt.className = 'share-opt' + (has ? ' on' : '');
      const t = document.createElement('span'); t.className = 'share-opt-label'; t.textContent = (has ? '✓ ' : '') + s.name;
      const sub = document.createElement('span'); sub.className = 'share-opt-sub';
      sub.textContent = `${s.songIds.length} song${s.songIds.length === 1 ? '' : 's'}`;
      opt.append(t, sub);
      opt.onclick = () => { if (has) removeFromSetlist(s.id, songId); else addToSetlist(s.id, songId); draw(); };
      sheet.append(opt);
    }
    const neu = document.createElement('button'); neu.className = 'share-opt';
    const nt = document.createElement('span'); nt.className = 'share-opt-label'; nt.textContent = '＋ New setlist…';
    neu.append(nt);
    neu.onclick = () => { const name = prompt('Name this setlist:'); if (name === null) return; addToSetlist(createSetlist(name).id, songId); draw(); };
    const closeBtn = document.createElement('button'); closeBtn.className = 'share-close'; closeBtn.textContent = 'Done'; closeBtn.onclick = close;
    sheet.append(neu, closeBtn);
  }

  draw();
  backdrop.append(sheet);
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  document.body.append(backdrop);
}
