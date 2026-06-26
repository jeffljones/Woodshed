// Catalog access — loads the generated index and individual chart masters.
//
// Data model (DESIGN.md §6, §14): a Work/Song is a container of one-or-more Charts
// (arrangements). The corpus is currently 1:1 — one ChordPro master per song — but the
// `charts` array is where future banjo / re-keyed / notation arrangements will land.

// The four content types a chart can carry, and the master formats that back them.
export type ChartType = 'chord_lyric' | 'bar_chart' | 'tab' | 'notation';
export type ChartFormat = 'chordpro' | 'musicxml' | 'pdf';

export interface Chart {
  id: string;
  type: ChartType;
  format: ChartFormat;
  key: string | null;
  file: string;
  hasChords: boolean;
  stub: boolean;            // metadata-only placeholder, no chart content yet
  importFmt: string | null; // provenance: original import-source format (docx/xls/…)
  source: string | null;    // provenance: original file path
  flags: string[];
  needsReview: boolean;
}

export interface Entry {
  id: string;
  title: string;
  key: string | null;       // canonical key (mirrors the primary chart)
  lead: string | null;
  tags: string[];
  jambookId: string | null;
  charts: Chart[];
  needsReview: boolean;
}

interface Index { version: number; generated: string; count: number; songs: Entry[]; }

export async function loadIndex(): Promise<Entry[]> {
  const res = await fetch('index.json');
  if (!res.ok) throw new Error(`index.json ${res.status}`);
  return ((await res.json()) as Index).songs;
}

export async function loadChart(file: string): Promise<string> {
  const res = await fetch(file);
  if (!res.ok) throw new Error(`${file} ${res.status}`);
  return res.text();
}

// The chart shown by default for a song: prefer a real chart over a stub placeholder.
export function primaryChart(e: Entry): Chart | undefined {
  return e.charts.find((c) => !c.stub) ?? e.charts[0];
}

// True when the song has at least one chart with actual content (not just a stub).
export function hasChart(e: Entry): boolean {
  return e.charts.some((c) => !c.stub);
}

export function sortKey(t: string): string {
  return (t || '').replace(/^(the|a)\s+/i, '').toUpperCase();
}
