// Validate that the generated library/index.json matches the v2 shape the app reads
// (catalog.ts). Guards the convert.py (Python) -> app (TS) contract that nothing else
// checks, and confirms every chart's master file actually exists on disk.
//   npx tsx scripts/check-index.ts     (or: npm run check)
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const LIB = resolve(dirname(fileURLToPath(import.meta.url)), '../../library');
const TYPES = new Set(['chord_lyric', 'bar_chart', 'tab', 'notation']);
const FORMATS = new Set(['chordpro', 'musicxml', 'pdf']);

const errors: string[] = [];
const fail = (m: string) => errors.push(m);

const idx = JSON.parse(readFileSync(resolve(LIB, 'index.json'), 'utf8'));
if (idx.version !== 2) fail(`version is ${idx.version}, expected 2`);
const songs: any[] = Array.isArray(idx.songs) ? idx.songs : (fail('songs is not an array'), []);
if (idx.count !== songs.length) fail(`count ${idx.count} != songs.length ${songs.length}`);

const typeCount: Record<string, number> = {};
let chartTotal = 0;
for (const s of songs) {
  const where = `song "${s.id}"`;
  if (!s.id || !s.title) fail(`${where}: missing id/title`);
  if (!Array.isArray(s.charts)) { fail(`${where}: charts not an array`); continue; }
  for (const c of s.charts) {
    chartTotal++;
    const cw = `${where} chart "${c.id}"`;
    if (!c.id) fail(`${cw}: missing id`);
    if (!TYPES.has(c.type)) fail(`${cw}: bad type "${c.type}"`);
    if (!FORMATS.has(c.format)) fail(`${cw}: bad format "${c.format}"`);
    if (typeof c.hasChords !== 'boolean') fail(`${cw}: hasChords not boolean`);
    if (typeof c.stub !== 'boolean') fail(`${cw}: stub not boolean`);
    if (!c.file) fail(`${cw}: missing file`);
    else if (!existsSync(resolve(LIB, c.file))) fail(`${cw}: file not found (${c.file})`);
    typeCount[c.type] = (typeCount[c.type] ?? 0) + 1;
  }
}
if (idx.chartCount !== undefined && idx.chartCount !== chartTotal)
  fail(`chartCount ${idx.chartCount} != counted ${chartTotal}`);

if (errors.length) {
  console.error(`✗ index.json: ${errors.length} problem(s)`);
  for (const e of errors.slice(0, 25)) console.error('  - ' + e);
  process.exit(1);
}
console.log(`✓ index.json v${idx.version}: ${songs.length} songs, ${chartTotal} charts`);
console.log('  types:', JSON.stringify(typeCount));
