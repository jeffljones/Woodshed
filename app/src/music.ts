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

const CHORD = /^([A-G][#b]?)((?:maj|min|m|sus|dim|aug|add|M|\^)*[0-9]*(?:b5)?)(?:\/([A-G][#b]?))?$/;

interface ParsedChord { root: string; quality: string; bass?: string; }

function parseChord(sym: string): ParsedChord | null {
  const m = CHORD.exec(sym.trim());
  return m ? { root: m[1], quality: m[2] || '', bass: m[3] } : null;
}

export function keyPrefersFlat(key?: string | null): boolean {
  return key ? PREF_FLAT.has(key.replace(/\s+/g, '')) : false;
}

export function transposeChord(sym: string, semis: number, flat: boolean): string {
  const c = parseChord(sym);
  if (!c) return sym;
  const bass = c.bass ? '/' + shiftNote(c.bass, semis, flat) : '';
  return shiftNote(c.root, semis, flat) + c.quality + bass;
}

function degree(rootNote: string, tonic: number): string {
  const iv = (noteIdx(rootNote) - tonic + 12) % 12;
  const di = MAJSCALE.indexOf(iv);
  if (di >= 0) return String(di + 1);
  const dj = MAJSCALE.indexOf((iv + 1) % 12);
  return dj >= 0 ? 'b' + (dj + 1) : '?';
}

export function nashvilleChord(sym: string, key?: string | null): string {
  const c = parseChord(sym);
  if (!c || !key) return sym;
  const km = /^([A-G][#b]?)(m?)/.exec(key.trim());
  if (!km) return sym;
  let tonic = noteIdx(km[1]);
  if (km[2]) tonic = (tonic + 3) % 12; // minor key -> relative major
  const isMin = /^m(?!aj)/.test(c.quality);
  const q = c.quality.replace(/^m(?!aj)/, '').replace(/^maj/, 'Δ');
  const bass = c.bass ? '/' + degree(c.bass, tonic) : '';
  return degree(c.root, tonic) + (isMin ? 'm' : '') + q + bass;
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
