// Catalog access — loads the generated index and individual chart masters.

export interface Entry {
  id: string;
  title: string;
  key: string | null;
  lead: string | null;
  tags: string[];
  fmt: string;
  hasChords: boolean;
  source: string | null;
  file: string;
  flags: string[];
  needs_review: boolean;
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

export function sortKey(t: string): string {
  return (t || '').replace(/^(the|a)\s+/i, '').toUpperCase();
}
