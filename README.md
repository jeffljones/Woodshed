# Woodshed — Music Library & Viewer

A personal, free, self-hosted web app to **catalog, view, transpose, and share** a
musician's written-music library — chord charts, lyric+chord charts, lead sheets, tab,
and standard notation — backed by **open plain-text masters kept in git**.

**Live:** https://jeffljones.github.io/Woodshed/ — GitHub Pages, deployed from `main`.

## What it does today

- **Library** of 606 songs: sidebar filters (has-chart, content type, collections),
  search, sort, list⇄grid views, A–Z jump rail, content-type badges.
- **Charts:** chord-over-lyric and bar/number rendering (repeat marks `‖: :‖ ×N`), live
  **transpose** (remembered per song) and **Nashville numbers**, capo hints, text size.
- **Editing:** in-app ChordPro editor with live preview. Edits save to a
  **non-destructive local overlay** — the master file is never touched; revert anytime.
- **Setlists & performance:** build ordered sets (＋ Set on any song), reorder, then
  play through with Prev/Next. Auto-scroll with adjustable speed.
- **Practice:** metronome (accented downbeat, 2/3/4/6 beats) + tuning reference tones.
- **Share/export:** themed print-to-PDF, download `.cho`, copy ChordPro.
- **Offline PWA:** installable; after first visit the app — and any chart you've
  opened — works with no signal. Console (dark) / Fakebook (light) / Auto themes.

The heavy upstream lifting (scan-in/OMR, engraving, notation rendering) is a separate
batch-pipeline track; see DESIGN.md §9.

## Repository layout

    library/charts/*.cho    canonical ChordPro masters — THE source of truth
    library/index.json      generated catalog (never hand-edit; see build-index)
    app/                    the viewer — Vite + TypeScript, no framework
    pipeline/convert.py     one-time seed bootstrap from the old jam-book export
    probe/                  feasibility probes (chord + notation lanes)

## Adding or editing songs

1. Drop a prepared `.cho` into `library/charts/` (or edit one in place). Metadata lives
   in the file: `{title: …}`, `{key: …}`, `{meta: lead …}`, `{meta: tag …}`.
2. Rebuild the catalog: `cd app && npm run build-index`
3. Commit and push. CI also rebuilds the index from the masters on every deploy, so a
   stale committed index can't ship.

## Development

    cd app
    npm install
    npm run dev          # local dev server
    npm run build        # typecheck + production build
    npm run build-index  # regenerate library/index.json by scanning the masters
    npm run check        # validate index shape + that every master file exists
    npm run theory       # music-theory regression checks (transpose / Nashville)
    npm run smoke <id>   # render a chart in the terminal (transpose + Nashville)

The full design, the reasoning behind every decision, and the implementation log live
in **[DESIGN.md](DESIGN.md)**.
