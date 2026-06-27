// Export / share sheet (DESIGN.md §14 step 5, I). Static-host-safe, no backend:
//   • Save as PDF — the browser's print, with a themed "paper" print stylesheet (styles.css
//     @media print) that renders just the chart in its current key / Nashville state.
//   • Download .cho — the ChordPro source, including any local overlay edits.
//   • Copy ChordPro — source to the clipboard.
export interface ShareOpts {
  rawText: string;
  filename: string;
}

export function openShareSheet(o: ShareOpts): void {
  const backdrop = document.createElement('div'); backdrop.className = 'share-backdrop';
  const sheet = document.createElement('div'); sheet.className = 'share-sheet';
  const h = document.createElement('h2'); h.className = 'share-title'; h.textContent = 'Share / export';

  function close() { backdrop.remove(); document.removeEventListener('keydown', onKey); }
  function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }

  function opt(label: string, sub: string, fn: (subEl: HTMLElement) => void): HTMLButtonElement {
    const b = document.createElement('button'); b.className = 'share-opt';
    const t = document.createElement('span'); t.className = 'share-opt-label'; t.textContent = label;
    const s = document.createElement('span'); s.className = 'share-opt-sub'; s.textContent = sub;
    b.append(t, s); b.onclick = () => fn(s); return b;
  }

  const pdf = opt('Save as PDF', 'Themed paper layout, current key — opens your print dialog', () => {
    close();
    setTimeout(() => window.print(), 60); // let the sheet leave the DOM before printing
  });
  const cho = opt('Download .cho', 'ChordPro source, including your edits', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([o.rawText], { type: 'text/plain' }));
    a.download = o.filename; a.click();
    close();
  });
  const copy = opt('Copy ChordPro', 'Copy the source to the clipboard', async (sub) => {
    try { await navigator.clipboard.writeText(o.rawText); sub.textContent = 'Copied ✓'; }
    catch { sub.textContent = 'Copy unavailable'; }
  });

  const closeBtn = document.createElement('button'); closeBtn.className = 'share-close'; closeBtn.textContent = 'Close';
  closeBtn.onclick = close;

  sheet.append(h, pdf, cho, copy, closeBtn);
  backdrop.appendChild(sheet);
  backdrop.onclick = (e) => { if (e.target === backdrop) close(); };
  document.addEventListener('keydown', onKey);
  document.body.appendChild(backdrop);
}
