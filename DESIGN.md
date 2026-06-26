# Music Library & Viewer — Design Note

> Name: **Woodshed**.
> Status: **living design note, not a build plan.** Captures the decisions and the
> reasoning behind them as of 2026-06-18. Nothing here is committed to code yet.

---

## 0. One-paragraph summary

A personal, free, self-hosted web app to **catalog, view, transpose, and share** a
musician's written-music library — chord charts, lyric+chord charts, lead sheets, tab,
and standard notation — backed by **open plain-text masters kept in git**. The app is a
focused *viewer over a catalog* (modeled on the "Jam Book" reference UX, which the owner
likes), deliberately small. All the heavy lifting — OMR scan-in, key/instrument
transforms, engraving — happens **upstream in a batch pipeline** built on standard tools
(music21, MuseScore, Verovio, ChordPro/ABC/LilyPond), not in the app. It is one layer of
a broader local-first homelab ecosystem.

---

## 1. Why build this at all

- The owner already has a **working reference app** (the Jam Book) whose *interface* he
  likes, and a real corpus of material (606 cataloged songs + a lot of **printed tab and
  sheet music** to digitize).
- **Paid apps were rejected:** he won't pay, and the ones he tried annoyed him with
  design choices that made the experience worse. Owning the UX is a primary motivation.
- Off-the-shelf tools cover *viewing/performing* (forScore, Kavita) and *editing*
  (MuseScore) well, but **nothing gives a single catalog across all formats plus the
  automation to re-key/share on demand.** That gap is what justifies custom work.

## 2. Goals

- **Digitize, organize, and make accessible** sheet music, chord charts, tab, and lyrics
  across devices.
- Store masters in **open, durable, flexible text formats** (ChordPro / MusicXML / ABC).
- **Transpose** chord & lyric+chord charts live, in the app.
- **Toggle chord/lyric charts between letter chords and the Nashville Number System** on
  the fly — a core feature, not an extra.
- **Display** notation and tab cleanly (view-only in the app).
- **Share**: generate a downloadable **PDF** (default) and, optionally, the **raw master
  file**.
- Bundle handy practice utilities: a **tuner** and a **metronome**.
- A custom UX the owner controls. Free. Self-hostable.

## 3. Non-goals (explicit — these keep scope from sprawling)

- Not audio streaming (Navidrome already does that).
- **Not converting everything.** Dense/handwritten scans mostly stay PDFs you just read;
  you only OMR the specific pieces you want editable.
- **No automatic arranging or re-fingering.** Machine output only needs to get the notes
  "in the ballpark"; the owner does the cleanup by hand — that's part of the learning
  process.
- **No in-app transpose for notation/tab.** That happens upstream and produces a new
  arrangement (see §6, §7).
- Not replacing MuseScore / forScore / Kavita / Joplin where they're already good.
- Not (initially) a community/contribution platform — **personal first.**

## 4. Principles / ethos

- **Local-first, plain-text, git-native, scriptable, durable, free.**
- **The data is the API.** The unifying layer is the open data substrate, not any single
  UI (see §5).
- **Right tool per layer.** MusicXML is the interchange bus; no format lock-in.
- **Canonical material stays safe.** Non-destructive editing (the Jam Book "overlay"
  pattern: edits layer on top, never mutate the master; revert = delete the overlay).
- **Ship small; avoid sprawl.** Bias toward a working slice over architectural
  perfection.

## 5. The core architectural insight

"**One app vs. several tools**" turned out to be the wrong question. The real unifying
layer is the **data**:

> A thin custom hub (catalog + pipeline) over a **shared open substrate of text masters**,
> with mature off-the-shelf tools reading and writing that same data where they're already
> good.

How thin the custom hub can be is an **empirical** question, decided by how cleanly
existing tools interoperate with the open formats. Worth a small interop probe before
committing to how much UI to build (see §12).

**Division of labor:**
- *Dense PDF scores* → Kavita (browser) + forScore/MobileSheets (iPad on the stand).
- *Lyrics / notes* → Joplin (already synced everywhere).
- *Notation editing & hand-arranging* → MuseScore.
- *Batch transforms / OMR / audio→notation* → pipeline on Vanguard (GPU, not always-on).
- *Interactive catalog + chart transpose + share + tuner/metronome* → **this app** (the
  gap nothing else fills).

## 6. Data model

### Canonical masters are open text, in git
- **ChordPro (`.cho`)** — chord & lyric+chord charts. The bulk of the existing jam
  material. Tiny, grep-able, transposable forever, renders to clean PDF.
- **MusicXML** — anything **pitch-based** (melody, standard notation, tab). This is the
  source of truth for melodic material **because** cross-instrument moves and real
  transposition need actual pitches.
- **ABC (`.abc`)** — tunes / lead sheets, especially fiddle tunes (the lingua franca of
  the trad/bluegrass world). Convertible to/from MusicXML.
- **LilyPond (`.ly`)** — optional, as a **render target** for the finest engraving. *Not*
  an interchange hub (converting *out* of LilyPond is poor).
- **PDF** — dense scans you choose not to convert. View-only.

**MusicXML is the interchange bus.** **The JSON catalog index is a generated build
artifact — not the master.** The text files are canonical.

### Tab is a *derived view*, not a master
Fret-and-string is instrument-specific. To re-tab for another instrument you need the
underlying pitches, then re-derive fingerings for the target tuning. So **the master for
anything melodic is pitch-based (MusicXML); tab is generated from it** (this is exactly
how MuseScore works — notes are real, tab is derived per tuning). This single decision
satisfies both the interop goal (§5) and the cross-instrument goal (§7).

### Work → Arrangements (supersedes the Jam Book's flat list)
The catalog is **not** a flat song list. A **Work** (song/tune) has metadata and **one or
more Arrangements/Versions** — e.g. the original, a banjo version, a transposed-for-the-
singer version — **each its own master file, linked to the parent**, with provenance
("this banjo arrangement was derived from that fiddle tune"). This falls out naturally
once you routinely spin instrument- and key-specific versions.

### Metadata / catalog layer (format-agnostic)
Title, composer/source, key, instrument(s) + tuning, tags (genre / setlist / provenance /
process state), format, file path(s), parent-work link.

**Naming/metadata convention decided on day one** (e.g. `Composer - Title - Key -
Arrangement`) — library usability at 200+ pieces depends on consistency, and the viewer
keys off filename + metadata.

## 7. The three lanes (how formats behave in the app)

- **Lane A — Chord / lyric+chord charts (ChordPro).** Rendered **live from source** in
  the app. **Live transpose** (chord-symbol shift; reuse the Jam Book's word-boundary-safe
  regex so comments like `(cycle throughout)` survive). **Chord ↔ Nashville Number toggle** — a *core* feature: flip the whole chart between
  letter chords (`G`, `C`, `D7`) and key-relative Nashville numbers (`1`, `4`, `5`) on
  demand, so a tune can be read in any key. Because the numbers are key-relative, they
  stay put when you transpose — that interplay is the point. Capo hints also carry over.
  (All reuse the proven Jam Book logic: `toNash`, key detection, relative-major handling
  for minor keys.) Share → transposed PDF + optional raw `.cho`.
- **Lane B — Notation & tab (MusicXML / ABC, or pre-rendered PDF).** **View-only — no
  in-app transpose.** Display via in-browser renderer (Verovio / abcjs / OSMD) where it's
  clean, otherwise a **pipeline-rendered PDF** (the safe default, especially for tab,
  where browser engravers are weakest). Re-keying or moving to another instrument happens
  **upstream** and shows up as a **new arrangement** in the catalog — not a button in the
  viewer.
- **Lane C — Lyrics / plain text.** Simple display (and/or these live in Joplin).

> The "no transpose for notation/tab" rule is a *feature*: view-only means the app can
> serve a rendered PDF and skip the two hardest browser problems (transposing engraved
> notation, and tab engraving).

## 8. The app (custom web app) — scope

A focused **catalog viewer**, modeled on the Jam Book UX the owner liked:

- **Catalog/library:** browse, search, filter (tag / instrument / key), A–Z jump.
- **Reading view** with a **format-aware render pane** (pluggable body — the net-new
  capability vs. the Jam Book, which was monospace text only).
- **Live transpose on Lane A only**, plus the **chord ↔ Nashville Number toggle** (core —
  see §7) and capo hints.
- **View-only PDF/notation** for Lane B.
- **Utility drawer:** **tuner** (Web Audio + mic + pitch detection) and **metronome**
  (Web Audio scheduling). Self-contained; touch neither catalog nor data model.
- **Share:** download **PDF** (default; reflects the current transposed key for charts) +
  download **raw master** (`.cho` / `.musicxml`) option. ("Both" — PDF for almost
  everyone, raw master for the occasional collaborator who'll edit.)
- **Carry-over niceties (optional / later):** set building + "deal me a set", font size,
  autoscroll, day/stage theme, foot-pedal control.
- **Render from source** in-browser (Verovio / abcjs) for the lanes shown live.
- No login to read. Self-hostable on the homelab (Tailscale) or static (GitHub Pages).

**Reuse from the Jam Book:** the proven music-theory core (word-safe transpose,
Nashville, capo hints, key detection) and the non-destructive overlay pattern.

## 9. The pipeline (batch / automation, upstream of the app)

- **Engine:** music21 (Python), with MusicXML as the bus.
- **Importers** (land messy inputs as masters):
  - The existing Jam Book importer: docx / txt / xls / MuseScore / ChordPro / bar
    notation → ChordPro/MusicXML. **The 606-song library is the seed corpus** (its
    `lines[]` model maps ~1:1 to ChordPro).
  - **OMR for printed scans:** Audiveris (headless CLI) or oemer (`pip`) → MusicXML, run
    on Vanguard. Only OMR what you want editable; the rest stay PDFs.
  - *(Later, separate project)* **Audio→notation:** Basic Pitch / AnthemScore →
    MIDI/MusicXML → same masters. Just another importer; **no design change to bolt it
    on.**
- **Transforms:** transpose + instrument re-map / octave-into-range (music21) → produces a
  **ballpark** new arrangement; human finishes in MuseScore; tab auto-derives for the
  target tuning.
- **Renderers** (masters → viewable): `chordpro` CLI, Verovio / `abcm2ps`, LilyPond → SVG
  and PDF. Used both for the app's view-only lane and for share/export PDFs.
- **Catalog/index builder:** scans masters, extracts + normalizes metadata, dedupes
  (prefer charted, fold metadata, record provenance), emits the JSON index the app
  consumes. *(Implemented for the chord lane: `app/scripts/build-index.ts` / `npm run
  build-index` scans the `.cho` masters — reusing the app's own ChordPro parser, so a chart
  is classified exactly the way it renders. `convert.py` is now seed-bootstrap only; masters
  are the single source of truth. MusicXML/PDF readers slot into the builder when those
  masters exist — PDF will need a metadata sidecar.)*
- Heavy jobs run as **batch on Vanguard's GPU**, not always-on Pi services.

## 10. Decision log (what we decided, and why)

1. **Build a custom app** for the catalog/viewer — free, and his own UX (paid apps
   annoyed him).
2. **Open text masters in git**: ChordPro / MusicXML / ABC; MusicXML = bus; **JSON index
   is generated, not canonical**.
3. **Pitch-based master for melodic/tab material; tab is a derived view** — enables
   cross-instrument + transpose, and lets outside tools interoperate.
4. **"Ballpark + manual cleanup"** — no auto-arranging/refingering. Removes the single
   hardest feature and matches how he learns arrangements.
5. **Work → Arrangements** catalog model — supersedes the Jam Book's flat list.
6. **App transposes only the chord lane; notation/tab is view-only**; their transpose
   happens upstream as new arrangements.
7. **Share = PDF (default, transposed) + raw master (option).** Both already exist as
   artifacts, so it's nearly free.
8. **Don't OMR everything;** dense scans stay PDFs. "Consistent viewable format" means a
   consistent *viewer* + conventions, not one file format.
9. **MusicXML-as-master's engraving loss is a non-issue here** — he hand-arranges every
   version anyway, so re-layout is expected work.
10. **Reuse the Jam Book's theory logic + UX; replace its data/render engine.**
11. **Personal-first;** community/contribution model deferred.
12. **Chord ↔ Nashville Number toggle is a core feature** of the chord lane (not a
    nice-to-have): flip a chart between letter chords and key-relative numbers on demand.
    Key-aware (needs the song key) and transpose-invariant — the numbers stay put when the
    key changes, which is the whole point of the system. Reuses the Jam Book's `toNash`.

## 11. Jam Book: carries over vs. replaced

**Carries over**
- Interface / library UX patterns.
- Music-theory core: word-safe transpose, Nashville, capo hints, key detection.
- The import pipeline (docx/txt/xls/MuseScore/ChordPro/bar notation).
- Non-destructive overlay editing pattern.
- The 606-song corpus, converted to ChordPro as the seed library.
- Optional niceties: set / deal / foot-pedal / themes / autoscroll.

**Replaced**
- Flat `lines[]` text data model → **Work/Arrangements + format-tagged masters**.
- Monospace-only rendering → **format-aware render-from-source**.
- JSON-as-master → **JSON-as-generated-index**.
- No export → **PDF/source share + pipeline renderers**.

## 12. Open questions (not yet decided)

- **App tech stack:** keep it vanilla/single-file like the Jam Book, or a light
  build (Vite/etc.)? Deferred.
- **Hosting:** homelab container vs. static GitHub Pages vs. both.
- **Repo layout:** one repo for app + pipeline + masters, or split them?
- **Exact metadata schema + naming convention** specifics.
- **In-browser renderer choice** per format (Verovio vs. OSMD vs. abcjs), and how much to
  lean on pre-rendered PDFs vs. live rendering — especially for **tab**.
- **Interop probe:** run a chord chart, a fiddle tune, and a tab piece through the
  candidate tools to measure round-trip fidelity and size the custom build (§5).
- **ABC vs. MusicXML primacy** for tunes.
- Which **carry-over niceties** (set/deal/foot-pedal/themes) are v1 vs. later.
- **"Share raw master" key question:** hand over the original-key master, or a transposed
  copy? (Minor; deferred.)
- **Community/contribution** model (deferred entirely for now).

## 13. A possible first slice (sketch only — not a commitment to start)

Honoring "ship small," and given **606 chord charts already exist**, the smallest useful
slice is the **chord-chart lane done well**:

> Catalog + ChordPro render + live transpose + the chord↔Nashville toggle + capo hints +
> share-as-PDF, seeded by converting the Jam Book library to ChordPro.

Notation/tab (view-only PDFs), the tuner/metronome, and the OMR/audio pipeline come after.
This is a sketch to react to later — **not** a plan to begin now.

## 14. v2 — Design-handoff reconciliation (decided)

A full UI design handoff ("Song View & Library — Chart / Tab / Notation App") landed and is
now the visual + feature north star. It **extends** this doc rather than contradicting it —
the data model and format decisions line up. Key calls:

**Confirmed (already matched here):** Song = container of one-or-more Charts = the
Work→Arrangements model (§6); ChordPro editable + render-time transpose/capo/Nashville;
MusicXML view-only + MuseScore round-trip; no cross-arrangement sync (a chart switcher,
nothing clever).

**New decisions:**
- **Themes:** ship **Console (dark, default)** + **Fakebook (light)** + **Auto**
  (`prefers-color-scheme`). One token set, `data-theme` switch, persisted. Type system:
  **Spectral** (titles), **Hanken Grotesk** (UI/lyrics), **IBM Plex Mono** (chords/tab/
  numbers). Chords get real prominence (14px/600/mono/accent), not tiny superscripts.
- **Notation/tab (revised):** render **view-only from MusicXML as SVG (Verovio), recolored
  live to the active theme**. The **aligned multi-layer beat-grid (handoff "F") is TABLED**
  for later. Export/print → themed PDF (cairosvg), defaulting to the light "paper" look.
  Editing still round-trips to MuseScore.
- **PDF-only lane (new):** for music that exists *only* as a PDF and won't convert cleanly,
  a **view-only PDF chart type** (PDF.js) with a **dark-invert toggle** for stage glare.
- **App shell:** flat list → **master–detail Home (M)** (sidebar nav + right pane: search /
  sort-filter / list⇄grid / A–Z jump bar / badge'd rows).
- **Setlists (N):** ordered, reorderable performance queue; set-scoped key/capo overrides;
  Start/Next/Prev performance mode.
- **Chart types (4):** chord_lyric · bar_chart · tab · notation; format = chordpro |
  musicxml | pdf. Library shows a content-type badge per chart.

**Implementation order (on top of the live chord-lane app):**
1. **Visual refresh** — theme tokens + 3 fonts + Auto/Light/Dark switcher + chord prominence. ← *done*
2. **Data model** — group charts under songs + per-chart type + content badges. ← *done*
   (index v2: `songs[].charts[]`; per-chart `type` ∈ chord_lyric/bar_chart/tab/notation +
   `format`; chord_lyric vs bar_chart auto-detected in `convert.py`; library shows a
   content-type badge; `npm run check` guards the generator→app index contract.)
3. **Master–detail Home shell** (M) + A–Z jump bar + sort/filter. ← *done*
   (left sidebar filter-nav with live counts — Library / Type / Collections; right pane =
   search + sort (title/key/type) + list⇄grid toggle + A–Z jump rail + badged rows/cards;
   sidebar collapses to a Filters drawer on mobile.)
4. **Bar/number chart view** (B) + ChordPro shorthand + arrangement switcher (K). ← *done*
   (grid lines render as bar cells with `‖: :‖` repeat marks + `×N` counts; unmarked bar
   lines auto-promote to the grid renderer; the Nashville toggle turns a bar chart into a
   number chart. Switcher shows when a Work has >1 chart. Deferred — not present in the
   corpus yet: `%`/`1-`/`4/6` shorthand and real `{start_of_verse}` section environments;
   these ride along with the converter/indexer work.)
5. In-app ChordPro editor (H). Export/share sheet (I) + themed PDF. ← *next*
   (Foundation done — the **master-scanning index builder** (`npm run build-index`) now
   generates `index.json` from the `.cho` masters, so a dropped-in or edited master is
   picked up directly; `convert.py` is demoted to seed bootstrap. The editor writes to that
   self-indexing model.)
6. Setlists + performance mode (N). Auto-scroll (A).
7. Notation/tab view-only SVG (E, J) + PDF-only lane. Practice-console audio (D).
8. (Later) Aligned beat-grid (F).
