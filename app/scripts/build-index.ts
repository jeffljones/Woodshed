// Build library/index.json by SCANNING the .cho masters. The masters are canonical; the
// index is a generated artifact (DESIGN.md §9). Reuses the app's ChordPro parser so a
// chart is classified exactly the way the app renders it — one parser, no drift.
//
// This replaces convert.py's index role: convert.py now only bootstraps the seed corpus
// (jam-book blob → .cho). Adding a song = drop a prepared .cho in library/charts/ and
// re-run this. MusicXML/PDF handlers slot into READERS when those masters appear (PDF will
// need a sidecar, since a PDF carries no embedded metadata).
//   npx tsx scripts/build-index.ts     (or: npm run build-index)
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename, extname } from 'node:path';
import { parseChordPro, type Song } from '../src/chordpro';
import type { Chart, ChartType, Entry } from '../src/catalog';

const LIB = resolve(dirname(fileURLToPath(import.meta.url)), '../../library');
const CHARTS = resolve(LIB, 'charts');

// Classify a parsed ChordPro master: bar_chart (pure bar/number grid) vs chord_lyric, plus
// whether it carries chords and whether it's just a stub placeholder. Mirrors the app's
// own understanding of the same `lines` — so the badge/filter and the render agree.
function classify(song: Song): { type: ChartType; hasChords: boolean; stub: boolean } {
  let hasGrid = false, pairedChord = false, anyChord = false, lyricText = false;
  for (const ln of song.lines) {
    if (ln.kind === 'grid') { hasGrid = true; anyChord = true; }
    else if (ln.kind === 'lyric') {
      for (const seg of ln.segments) {
        if (seg.chord) { anyChord = true; if (seg.text.trim()) pairedChord = true; }
        if (seg.text.trim()) lyricText = true;
      }
    }
  }
  return {
    type: hasGrid && !pairedChord ? 'bar_chart' : 'chord_lyric',
    hasChords: anyChord,
    stub: !anyChord && !lyricText,
  };
}

// A reader turns one master file into { workId, chart }. Keyed by extension so MusicXML/PDF
// readers drop in later without touching the scan/group/emit machinery below.
type Reader = (file: string) => { workId: string; chart: Chart; song: Song };
const READERS: Record<string, Reader> = {
  '.cho': (file) => {
    const id = basename(file, '.cho');
    const song = parseChordPro(readFileSync(resolve(CHARTS, file), 'utf8'));
    const { type, hasChords, stub } = classify(song);
    return {
      workId: song.meta.work?.[0] ?? id, // future: group arrangements under one Work
      song,
      chart: {
        id, type, format: 'chordpro', key: song.key, file: `charts/${id}.cho`,
        hasChords, stub, source: song.meta.source?.[0] ?? null,
      },
    };
  },
};

const files = readdirSync(CHARTS).filter((f) => READERS[extname(f)]).sort();
const parsed = files.map((f) => READERS[extname(f)](f));

// Group charts under Works (one-to-one today; the array is ready for arrangements).
const byWork = new Map<string, typeof parsed>();
for (const p of parsed) (byWork.get(p.workId) ?? byWork.set(p.workId, []).get(p.workId)!).push(p);

const songs: Entry[] = [...byWork.entries()].map(([workId, members]) => {
  const primary = members.find((m) => !m.chart.stub) ?? members[0]; // metadata from the real chart
  const s = primary.song;
  return {
    id: workId, title: s.title, key: s.key,
    lead: s.meta.lead?.[0] ?? null, tags: s.meta.tag ?? [],
    charts: members.map((m) => m.chart),
  };
}).sort((a, b) => a.id.localeCompare(b.id));

const index = {
  version: 2,
  generated: new Date().toISOString().slice(0, 10),
  count: songs.length,
  chartCount: parsed.length,
  songs,
};
writeFileSync(resolve(LIB, 'index.json'), JSON.stringify(index, null, 1) + '\n', 'utf8');

const types: Record<string, number> = {};
let stubs = 0;
for (const p of parsed) { types[p.chart.type] = (types[p.chart.type] ?? 0) + 1; if (p.chart.stub) stubs++; }
console.log(`build-index: ${songs.length} works, ${parsed.length} charts`);
console.log('  types:', JSON.stringify(types), '| stubs:', stubs);
