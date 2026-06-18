# Aertifact — Music Library & Viewer

A personal, free, self-hosted web app to **catalog, view, transpose, and share** a
musician's written-music library — chord charts, lyric+chord charts, lead sheets, tab,
and standard notation — backed by **open plain-text masters kept in git**.

The app is a focused *viewer over a catalog*; the heavy lifting (scan-in/OMR, key and
instrument transforms, engraving) happens upstream in a batch pipeline built on standard
tools (music21, MuseScore, Verovio, ChordPro/ABC/LilyPond).

**Status:** early / pre-implementation. The full design and the reasoning behind every
decision live in **[DESIGN.md](DESIGN.md)** — start there.
