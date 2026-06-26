// Minimal ChordPro parser tuned to the files our pipeline emits:
//   {title:} {key:} {meta: name value} {comment:} {start_of_grid}/{end_of_grid}
//   lyric lines with inline [chord]s, and raw bar-notation lines inside grids.

export interface Segment { chord?: string; text: string; }

export type Line =
  | { kind: 'lyric'; segments: Segment[] }
  | { kind: 'grid'; text: string }
  | { kind: 'comment'; text: string }
  | { kind: 'section'; text: string }
  | { kind: 'blank' };

export interface Song {
  title: string;
  key: string | null;
  meta: Record<string, string[]>;
  lines: Line[];
}

const DIRECTIVE = /^\{([^:}]+)(?::\s*([\s\S]*?))?\}$/;

function addMeta(song: Song, k: string, v: string): void {
  if (!song.meta[k]) song.meta[k] = [];
  song.meta[k].push(v);
}

export function parseChordPro(text: string): Song {
  const song: Song = { title: 'Untitled', key: null, meta: {}, lines: [] };
  let inGrid = false;

  for (const raw of text.replace(/\r/g, '').split('\n')) {
    const d = DIRECTIVE.exec(raw.trim());
    if (d) {
      const name = d[1].trim().toLowerCase();
      const value = (d[2] ?? '').trim();
      if (name === 'title' || name === 't') song.title = value;
      else if (name === 'key' && song.key === null) song.key = value;
      else if (name === 'start_of_grid' || name === 'sog') inGrid = true;
      else if (name === 'end_of_grid' || name === 'eog') inGrid = false;
      else if (name === 'comment' || name === 'c') song.lines.push({ kind: 'comment', text: value });
      else if (name === 'meta') {
        const sp = value.indexOf(' ');
        addMeta(song, sp < 0 ? value : value.slice(0, sp), sp < 0 ? '' : value.slice(sp + 1));
      } else if (['time', 'tempo', 'capo', 'tuning', 'artist', 'composer'].includes(name)) {
        addMeta(song, name, value);
      } else if (name.startsWith('start_of_')) {
        song.lines.push({ kind: 'section', text: name.slice('start_of_'.length) });
      }
      continue;
    }
    if (raw.trim() === '') { song.lines.push({ kind: 'blank' }); continue; }
    if (inGrid || looksLikeBars(raw)) { song.lines.push({ kind: 'grid', text: raw }); continue; }
    song.lines.push({ kind: 'lyric', segments: parseSegments(raw) });
  }
  return song;
}

function parseSegments(line: string): Segment[] {
  const segs: Segment[] = [];
  const re = /\[([^\]]*)\]/g;
  let last = 0;
  let pending: string | undefined;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = line.slice(last, m.index);
    if (text || pending !== undefined) segs.push({ chord: pending, text });
    pending = m[1];
    last = re.lastIndex;
  }
  const tail = line.slice(last);
  if (tail || pending !== undefined) segs.push({ chord: pending, text: tail });
  return segs.length ? segs : [{ text: line }];
}

// A bar/number line carries barlines and only chord / barline / repeat tokens — no lyric
// words. We promote such lines (even when the source didn't wrap them in {start_of_grid})
// to the grid renderer, so bar notation looks consistent wherever it appears.
const BAR_CHORD = /^[A-G][#b]?(?:maj|min|sus|dim|aug|add|m|M|°|\+|b5|[0-9`^.]|\/[A-G][#b]?)*$/;
function looksLikeBars(line: string): boolean {
  if (!line.includes('|')) return false;
  let chords = 0;
  for (let tok of line.trim().split(/\s+/)) {
    tok = tok.replace(/[|:]/g, '').replace(/\(?[xX]\d+\)?/g, ''); // strip barlines + repeat counts
    if (tok === '') continue;
    if (BAR_CHORD.test(tok)) chords++;
    else return false; // a non-chord token means it's lyrics, not a bar line
  }
  return chords > 0;
}
