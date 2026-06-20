// Dev smoke test: parse a real .cho master and render it as text with transpose + Nashville,
// proving the app's TS parser/theory on real data without a browser.
//   npx tsx scripts/smoke.ts <song-id>
import { readFileSync } from 'node:fs';
import { parseChordPro, type Song } from '../src/chordpro';
import { transposeChord, nashvilleChord, soundingKey } from '../src/music';

function chord(sym: string, semis: number, nash: boolean, key: string | null): string {
  return nash ? nashvilleChord(sym, key) : transposeChord(sym, semis, false);
}

function renderText(song: Song, semis: number, nash: boolean): string[] {
  const out: string[] = [];
  for (const ln of song.lines) {
    if (ln.kind === 'blank') out.push('');
    else if (ln.kind === 'comment') out.push('[' + ln.text + ']');
    else if (ln.kind === 'section') out.push(ln.text.toUpperCase() + ':');
    else if (ln.kind === 'grid')
      out.push(ln.text.replace(/[A-G][#b]?[^\s|]*/g, (s) => chord(s, semis, nash, song.key)));
    else {
      let top = '', bot = '';
      for (const seg of ln.segments) {
        const c = seg.chord ? chord(seg.chord, semis, nash, song.key) : '';
        const w = Math.max(c ? c.length + 1 : 0, seg.text.length);
        top += c.padEnd(w);
        bot += seg.text.padEnd(w);
      }
      if (top.trim()) out.push(top.replace(/\s+$/, ''));
      out.push(bot.replace(/\s+$/, ''));
    }
  }
  return out;
}

const id = process.argv[2] || 'blue-moon';
const song = parseChordPro(readFileSync(new URL('../../library/charts/' + id + '.cho', import.meta.url), 'utf8'));

console.log('TITLE:', song.title, '| KEY:', song.key, '\n');
const views: [string, number, boolean][] = [['ORIGINAL', 0, false], ['TRANSPOSE +2', 2, false], ['NASHVILLE', 0, true]];
for (const [label, semis, nash] of views) {
  console.log('=== ' + label + (nash ? '' : ' (sounding ' + soundingKey(song.key, semis) + ')') + ' ===');
  console.log(renderText(song, semis, nash).slice(0, 14).join('\n'));
  console.log();
}
