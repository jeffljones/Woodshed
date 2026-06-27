// In-app ChordPro editor (DESIGN.md §14 step 5, H). Edits are non-destructive: the song view
// saves them to a localStorage overlay keyed by chart id (overlays.ts), never touching the
// master. A live preview re-parses on every keystroke, rendered at the current view settings.
import { parseChordPro } from '../chordpro';
import { renderSong } from '../render';
import { keyPrefersFlat } from '../music';

export interface EditorOpts {
  initial: string;
  transpose: number;
  nashville: boolean;
  hasOverlay: boolean;
  onSave: (text: string) => void;
  onRevert: () => void;
  onClose: () => void;
}

function ebtn(label: string): HTMLButtonElement {
  const b = document.createElement('button'); b.textContent = label; return b;
}

export function renderEditor(o: EditorOpts): HTMLElement {
  const root = document.createElement('div'); root.className = 'editor';

  const ta = document.createElement('textarea');
  ta.className = 'editor-text'; ta.value = o.initial; ta.spellcheck = false;
  ta.setAttribute('aria-label', 'ChordPro source');

  const preview = document.createElement('div'); preview.className = 'editor-preview';
  function draw() {
    const song = parseChordPro(ta.value);
    preview.innerHTML = '';
    preview.appendChild(renderSong(song, {
      transpose: o.transpose, nashville: o.nashville,
      key: song.key, flat: keyPrefersFlat(song.key),
    }));
  }
  ta.oninput = draw;

  const save = ebtn('Save'); save.className = 'on';
  const revert = ebtn('Revert to master'); revert.disabled = !o.hasOverlay;
  const close = ebtn('Close');
  save.onclick = () => o.onSave(ta.value);
  revert.onclick = () => o.onRevert();
  close.onclick = () => o.onClose();

  const hint = document.createElement('span'); hint.className = 'editor-hint';
  hint.textContent = 'Saves locally on this device — the master file is never changed.';
  const bar = document.createElement('div'); bar.className = 'editor-bar';
  bar.append(save, revert, close, hint);

  const panes = document.createElement('div'); panes.className = 'editor-panes';
  panes.append(ta, preview);

  root.append(bar, panes);
  draw();
  return root;
}
