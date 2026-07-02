// Music-theory regression checks: transpose + Nashville against real corpus spellings
// (B°/F, D+, C`7, Em7-, multi-chord brackets, section words that must NOT transpose).
//   npx tsx scripts/theory-check.ts     (or: npm run theory) — exits 1 on any mismatch.
import { transposeChord, nashvilleChord, soundingKey } from '../src/music';

const cases: [string, string, string][] = [
  // [description, actual, expected]
  ['C +2', transposeChord('C', 2, false), 'D'],
  ['Bb +2 (flat key)', transposeChord('Bb', 2, true), 'C'],
  ['G -1 (flat)', transposeChord('G', -1, true), 'Gb'],
  ['Am7/G +2', transposeChord('Am7/G', 2, false), 'Bm7/A'],
  ['C6/9 +2 (slash-9 is not a bass)', transposeChord('C6/9', 2, false), 'D6/9'],
  ['C`7 +2 (odd suffix)', transposeChord('C`7', 2, false), 'D`7'],
  ['B°/F +2 (diminished + bass)', transposeChord('B°/F', 2, false), 'C#°/G'],
  ['(B°/F) +2 (parenthesized)', transposeChord('(B°/F)', 2, false), '(C#°/G)'],
  ['D+ +2 (augmented)', transposeChord('D+', 2, false), 'E+'],
  ['Em7- +2 (trailing dash)', transposeChord('Em7-', 2, false), 'F#m7-'],
  ['F#m  Bm +2 (two chords, one token)', transposeChord('F#m  Bm', 2, false), 'G#m  C#m'],
  ['Bridge unchanged', transposeChord('Bridge', 2, false), 'Bridge'],
  ['BREAK unchanged', transposeChord('BREAK', 2, false), 'BREAK'],
  ['x4 unchanged', transposeChord('x4', 2, false), 'x4'],
  ['nash Am in Am', nashvilleChord('Am', 'Am'), '6m'],
  ['nash Dm7 in Am', nashvilleChord('Dm7', 'Am'), '2m7'],
  ['nash E7 in Am', nashvilleChord('E7', 'Am'), '37'],
  ['nash C`7 in Am', nashvilleChord('C`7', 'Am'), '1`7'],
  ['nash B°/F in Am', nashvilleChord('B°/F', 'Am'), '7°/4'],
  ['nash G in G', nashvilleChord('G', 'G'), '1'],
  ['nash F#m Bm in D', nashvilleChord('F#m Bm', 'D'), '3m 6m'],
  ['nash Bridge unchanged', nashvilleChord('Bridge', 'G'), 'Bridge'],
  ['soundingKey Am +2', soundingKey('Am', 2) ?? '∅', 'Bm'],
  ['soundingKey Bb +2', soundingKey('Bb', 2) ?? '∅', 'C'],
];

let failed = 0;
for (const [name, actual, expected] of cases) {
  if (actual !== expected) { failed++; console.error(`✗ ${name}: got "${actual}", want "${expected}"`); }
}
if (failed) { console.error(`\n${failed}/${cases.length} theory checks FAILED`); process.exit(1); }
console.log(`✓ theory: ${cases.length}/${cases.length} checks pass`);
