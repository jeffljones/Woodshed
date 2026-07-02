// Music theory — transpose, Nashville numbers, capo hints.
// Ported faithfully from the jam-book reference (and the pipeline probe).

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT: Record<string, string> = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E' };
const SHOW_FLAT: Record<string, string> = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
const PREF_FLAT = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm']);
const MAJSCALE = [0, 2, 4, 5, 7, 9, 11];

function noteIdx(n: string): number { n = FLAT[n] ?? n; return NOTES.indexOf(n); }

function shiftNote(n: string, semis: number, flat: boolean): string {
  const i = noteIdx(n);
  if (i < 0) return n;
  const out = NOTES[(i + semis + 1200) % 12];
  return flat && SHOW_FLAT[out] ? SHOW_FLAT[out] : out;
}

const CHORD = /^([A-G][#b]?)(\S*)$/;
// A real chord quality is empty or starts chord-ish (m7, maj, sus4, °, +, b5, `7, .,-…).
// This guard keeps words that merely start with a note letter ("Bridge", "BREAK") intact.
const QUALITY_OK = /^($|[0-9Mmsdab#Δ°ø^`(),.+/-])/;

interface ParsedChord { root: string; quality: string; bass?: string; }

function parseChord(sym: string): ParsedChord | null {
  const m = CHORD.exec(sym.trim());
  if (!m) return null;
  let quality = m[2];
  let bass: string | undefined;
  const slash = quality.lastIndexOf('/');
  if (slash >= 0) {
    const b = quality.slice(slash + 1);
    if (/^[A-G][#b]?$/.test(b)) { bass = b; quality = quality.slice(0, slash); }
  }
  if (!QUALITY_OK.test(quality)) return null;
  return { root: m[1], quality, bass };
}

// Chord symbols in the wild: "F#m  Bm" (two chords in one bracket), "(B°/F)"
// (parenthesized), "C`7" / "Em7-" (odd suffixes). Apply f to every note-rooted token,
// preserving whitespace and paren wrappers; leave anything unparseable untouched.
function mapChordTokens(sym: string, f: (tok: string) => string): string {
  return sym
    .split(/(\s+)/)
    .map((part) => {
      if (!part || /^\s+$/.test(part)) return part;
      const m = /^(\(*)(.*?)(\)*)$/.exec(part)!;
      return m[1] + f(m[2]) + m[3];
    })
    .join('');
}

export function keyPrefersFlat(key?: string | null): boolean {
  return key ? PREF_FLAT.has(key.replace(/\s+/g, '')) : false;
}

export function transposeChord(sym: string, semis: number, flat: boolean): string {
  return mapChordTokens(sym, (tok) => {
    const c = parseChord(tok);
    if (!c) return tok;
    const bass = c.bass ? '/' + shiftNote(c.bass, semis, flat) : '';
    return shiftNote(c.root, semis, flat) + c.quality + bass;
  });
}

function degree(rootNote: string, tonic: number): string {
  const iv = (noteIdx(rootNote) - tonic + 12) % 12;
  const di = MAJSCALE.indexOf(iv);
  if (di >= 0) return String(di + 1);
  const dj = MAJSCALE.indexOf((iv + 1) % 12);
  return dj >= 0 ? 'b' + (dj + 1) : '?';
}

export function nashvilleChord(sym: string, key?: string | null): string {
  if (!key) return sym;
  const km = /^([A-G][#b]?)(m?)/.exec(key.trim());
  if (!km) return sym;
  let tonic = noteIdx(km[1]);
  if (km[2]) tonic = (tonic + 3) % 12; // minor key -> relative major
  return mapChordTokens(sym, (tok) => {
    const c = parseChord(tok);
    if (!c) return tok;
    const isMin = /^m(?!aj)/.test(c.quality);
    const q = c.quality.replace(/^m(?!aj)/, '').replace(/^maj/, 'Δ');
    const bass = c.bass ? '/' + degree(c.bass, tonic) : '';
    return degree(c.root, tonic) + (isMin ? 'm' : '') + q + bass;
  });
}

export function soundingKey(key: string | null | undefined, semis: number): string | null {
  if (!key) return null;
  const m = /^([A-G][#b]?)(m?)$/.exec(key.trim());
  if (!m) return null;
  return shiftNote(m[1], semis, keyPrefersFlat(key)) + (m[2] || '');
}

export function capoHint(sounding: string | null): string {
  if (!sounding || sounding.endsWith('m')) return '';
  const i = noteIdx(sounding.replace('m', ''));
  if (i < 0) return '';
  const shapes: Record<string, number> = { G: 7, C: 0, D: 2, A: 9, E: 4 };
  let best: { shape: string; capo: number } | null = null;
  for (const shape in shapes) {
    const capo = (i - shapes[shape] + 12) % 12;
    if (capo >= 0 && capo <= 7 && (!best || capo < best.capo)) best = { shape, capo };
  }
  if (!best) return '';
  return best.capo === 0 ? `open ${best.shape} shapes` : `capo ${best.capo} → ${best.shape} shapes`;
}
