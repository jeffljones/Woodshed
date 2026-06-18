# Probe — format & tooling interop

Quick, reproducible checks that the data model and the first ("chord-lane") slice are
feasible. Everything here runs in a sandbox — **nothing to install on your machines.**
See the repo's `DESIGN.md` for why these matter.

## What it validates
- **Chord lane (zero dependencies):** `jam_to_chordpro.py`
  - jam-book `lines[]` → inline ChordPro (`.cho`)
  - live transpose (column-preserving, word-boundary-safe)
  - chord ↔ Nashville Number toggle (key-relative, transpose-invariant)
- **Notation/tab lane:** `notation_probe.py` — ABC → music21 → MusicXML → Verovio → SVG →
  PDF/PNG. Semantic transpose (real pitches: notes *and* chord symbols), render-from-source,
  and a shareable PDF. Deps in `requirements.txt`; `run.sh` reproduces it all in a venv.

## Run it
    python3 jam_to_chordpro.py [song_id ...]

Reads the jam-book library and writes results to `out/`. The music theory is ported
faithfully from the jam-book reference app — if it's wrong here, it was wrong there.

## Results so far
- **"Black Mountain Rag"** (key A): transpose +2 and Nashville verified correct
  (`A→B`, `D→E`, `G = b7` of A, …); bar notation `| … | x4` preserved untouched.
- **"Baby's in Black"**: converted to ChordPro — and this surfaced real edge cases in the
  **first-pass** converter: chord lines separated from their lyric by a blank line don't
  auto-inline yet; bar-notation lines (`|A |E |`) pass through untouched; and embedded
  metadata lines (`Key:`, `Time:`, `Tempo:`) need dedicated handling. Exactly what a probe
  is for — the smart converter is part of step 3, now de-risked because we know the cases.
- **Notation lane** ("Probe Reel in D"): the full pipeline runs in-sandbox. Semantic
  transpose +M2 moved melody *and* chords correctly (`D G A → E A B`); Verovio engraved the
  score from MusicXML; cairosvg produced PDF + PNG. (music21's *statistical* key analyzer
  guessed the relative minor on the short snippet — a reminder to trust the source's
  declared key, not auto-analysis.)

## Bottom line
The musical intelligence — transpose, Nashville, semantic transpose, render-from-source,
PDF export — is cheap and works off-the-shelf. The real effort lives in **data
conversion**: cleaning the existing corpus into good ChordPro / MusicXML masters.

## Not in this probe (needs your hardware)
OMR of scanned tab/sheet music (Audiveris/oemer) and audio→notation (Basic Pitch) —
batch jobs for Vanguard's GPU — plus MuseScore GUI cleanup, which is a desktop step.
