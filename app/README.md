# Woodshed — app

A browser viewer over the ChordPro library in `../library`: catalog browse + search,
chords-over-lyrics rendering, **live transpose**, and a **chord ↔ Nashville Number toggle**.
Vanilla TypeScript + Vite, no framework.

## Run (dev)
    npm install
    npm run dev          # http://localhost:5173

The dev server serves the canonical library (`../library`) at the web root, so the app
fetches `/index.json` and `/charts/<id>.cho` directly — no copy of the data.

## Build / preview
    npm run build        # type-checks, then bundles to dist/ (ships the library with it)
    npm run preview

## Verify the theory without a browser
    npx tsx scripts/smoke.ts blue-moon

## Layout
    src/music.ts     transpose / Nashville / capo (ported from the jam book)
    src/chordpro.ts  parse .cho -> model
    src/render.ts    model -> DOM (applies transpose / Nashville)
    src/catalog.ts   load index.json + chart masters
    src/ui/          list + song views
    src/main.ts      bootstrap + hash routing
