#!/usr/bin/env python3
"""
Convert the jam-book song_library.json into individual ChordPro (.cho) masters,
a generated catalog index, and a conversion-quality report.

Storage model (see DESIGN.md):
  INPUT   pipeline/import/song_library.json   the old single-blob export (provenance)
  OUTPUT  library/charts/<id>.cho             canonical text masters, one per song
          library/index.json                  generated catalog the app reads
          library/CONVERSION_REPORT.md        what converted clean vs. needs a human

The .cho files are canonical and git-diffable; the JSON index is a build artifact.

First pass: handles the cases the probe surfaced — blank-separated chord/lyric pairing,
bar-notation grids, embedded Key/Time/Tempo metadata, section labels, and stubs — and
*flags* anything ambiguous for review instead of guessing silently.

Run:  python3 pipeline/convert.py            # incremental; never overwrites edited masters
      python3 pipeline/convert.py --reseed    # wipe library/charts/ and regenerate all
"""
import json, os, re, shutil, datetime
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "pipeline", "import", "song_library.json")
CHARTS = os.path.join(ROOT, "library", "charts")
INDEX = os.path.join(ROOT, "library", "index.json")
REPORT = os.path.join(ROOT, "library", "CONVERSION_REPORT.md")

CH_TOKEN = re.compile(
    r'^\(?[A-G][#b]?(?:maj|min|m|sus|dim|aug|add|M|\^)*\d*(?:b5)?[-+°]?\??(?:/[A-G][#b]?)?\)?[,.]?$')
META_RE = re.compile(r'^\s*(key|time|tempo|bpm|capo|tuning|feel)\s*[:=]\s*(.+?)\s*$', re.I)
META_MAP = {'key': 'key', 'time': 'time', 'tempo': 'tempo', 'bpm': 'tempo', 'capo': 'capo'}


def slugify(t):
    return re.sub(r'[^a-z0-9]+', '-', (t or '').lower()).strip('-') or 'song'


def chord_cols(text):
    return [(m.start(), m.group(0)) for m in re.finditer(r'\S+', text)
            if CH_TOKEN.match(m.group(0))]


def _snap(s, pos):
    """Snap an insertion column to the start of the word it lands in (don't split tokens)."""
    pos = max(0, min(pos, len(s)))
    while pos > 0 and not s[pos - 1].isspace():
        pos -= 1
    return pos


def inline(chord_line, lyric_line):
    """Place [chord] into the lyric, snapped to word starts (right-to-left)."""
    s = lyric_line
    for col, tok in sorted(chord_cols(chord_line), key=lambda t: -t[0]):
        pos = _snap(s, min(col, len(s)))
        s = s[:pos] + '[' + tok + ']' + s[pos:]
    return s


def meta_directive(m):
    name, val = m.group(1).lower(), m.group(2)
    d = META_MAP.get(name)
    return '{%s: %s}' % (d, val) if d else '{meta: %s %s}' % (name, val)


def is_stub(song):
    lines = song.get('lines') or []
    return (song.get('fmt') == 'stub' or not lines
            or not any(l['t'] in ('chord', 'lyric') for l in lines))


def header(song):
    out = ['{title: %s}' % (song.get('title') or 'Untitled')]
    if song.get('key'):
        out.append('{key: %s}' % song['key'])
    if song.get('lead'):
        out.append('{meta: lead %s}' % song['lead'])
    for tg in song.get('tags') or []:
        out.append('{meta: tag %s}' % tg)
    if song.get('source'):
        out.append('{meta: source %s}' % song['source'])
    out.append('')
    return out


def convert(song):
    """Return (chordpro_text, flags)."""
    flags = []
    out = header(song)
    if is_stub(song):
        out.append('{comment: stub — no chart yet}')
        return '\n'.join(out) + '\n', ['stub']

    lines = song['lines']
    n = len(lines)
    grid_open = False
    non_bar_chords = pairings = 0
    i = 0

    def close_grid():
        nonlocal grid_open
        if grid_open:
            out.append('{end_of_grid}')
            grid_open = False

    while i < n:
        t, x = lines[i]['t'], lines[i].get('x', '')
        if t == 'blank':
            close_grid()
            if out and out[-1] != '':
                out.append('')
            i += 1
        elif t == 'label':
            close_grid()
            m = META_RE.match(x)
            out.append(meta_directive(m) if m else '{comment: %s}' % x.strip().rstrip(':'))
            i += 1
        elif t == 'lyric':
            close_grid()
            m = META_RE.match(x)
            out.append(meta_directive(m) if m else x)
            i += 1
        elif t == 'chord':
            if '|' in x:                                  # bar-notation -> grid
                if not grid_open:
                    out.append('{start_of_grid}')
                    grid_open = True
                out.append(x)
                i += 1
                continue
            close_grid()
            non_bar_chords += 1
            j = i + 1                                     # look past blanks for a lyric
            while j < n and lines[j]['t'] == 'blank':
                j += 1
            if j < n and lines[j]['t'] == 'lyric' and not META_RE.match(lines[j].get('x', '')):
                out.append(inline(x, lines[j]['x']))
                pairings += 1
                i = j + 1
            else:
                cols = chord_cols(x)
                if cols:
                    out.append(' '.join('[%s]' % c for _, c in cols))
                else:
                    out.append('{comment: %s}' % x.strip())
                    flags.append('odd-token')
                i += 1
        else:
            i += 1
    close_grid()
    while out and out[-1] == '':
        out.pop()

    if non_bar_chords and pairings == 0:
        flags.append('unpaired')
    if 'auto-chords' in (song.get('tags') or []):
        flags.append('verify-queue')
    return '\n'.join(out) + '\n', flags


STRUCTURAL = {'unpaired', 'odd-token'}


def main():
    import argparse
    ap = argparse.ArgumentParser(description="jam-book JSON -> ChordPro masters + index")
    ap.add_argument('--reseed', action='store_true',
                    help='wipe library/charts/ and regenerate every .cho (DESTROYS hand '
                         'edits). Default: create only missing files; never overwrite.')
    args = ap.parse_args()

    data = json.load(open(SRC))
    songs = data.get('songs', [])
    if args.reseed and os.path.isdir(CHARTS):
        shutil.rmtree(CHARTS)
    os.makedirs(CHARTS, exist_ok=True)

    used, index, flagcount = set(), [], Counter()
    n_stub = n_chart = n_clean = 0
    n_written = n_skipped = 0
    flagged = []

    for s in songs:
        text, flags = convert(s)
        base = slugify(s.get('title'))
        sid, k = base, 2
        while sid in used:
            sid, k = '%s-%d' % (base, k), k + 1
        used.add(sid)
        path = os.path.join(CHARTS, sid + '.cho')
        if os.path.exists(path) and not args.reseed:
            n_skipped += 1                       # preserve existing / hand-edited master
        else:
            open(path, 'w').write(text)
            n_written += 1

        structural = [f for f in flags if f in STRUCTURAL]
        if 'stub' in flags:
            n_stub += 1
        else:
            n_chart += 1
            if not structural:
                n_clean += 1
            else:
                flagged.append((sid, structural))
        flagcount.update(flags)
        index.append({
            'id': sid, 'title': s.get('title'), 'key': s.get('key'), 'lead': s.get('lead'),
            'tags': s.get('tags') or [], 'fmt': s.get('fmt'), 'hasChords': bool(s.get('hasChords')),
            'source': s.get('source'), 'jambook_id': s.get('id'),
            'file': 'charts/%s.cho' % sid, 'flags': flags, 'needs_review': bool(structural),
        })

    json.dump({'version': 1, 'generated': str(datetime.date.today()),
               'count': len(index), 'songs': index},
              open(INDEX, 'w'), indent=1, ensure_ascii=False)

    pct = (100.0 * n_clean / n_chart) if n_chart else 0
    rep = [
        '# Conversion report', '',
        '_Generated %s from `pipeline/import/song_library.json`._' % datetime.date.today(), '',
        '- total songs: **%d**' % len(songs),
        '- stubs (metadata only): **%d**' % n_stub,
        '- charts: **%d**' % n_chart,
        '  - converted clean: **%d** (%.1f%%)' % (n_clean, pct),
        '  - flagged for review: **%d**' % (n_chart - n_clean), '',
        '## Flag counts', '',
    ] + ['- `%s`: %d' % (k, v) for k, v in flagcount.most_common()] + [
        '', '## First 25 flagged charts', '',
    ] + ['- `%s` — %s' % (sid, ', '.join(fl)) for sid, fl in flagged[:25]] + ['']
    open(REPORT, 'w').write('\n'.join(rep))

    print('mode:', 'reseed (full regenerate)' if args.reseed
          else 'incremental (existing masters preserved)')
    print('total %d | stubs %d | charts %d | clean %d (%.1f%%) | flagged %d'
          % (len(songs), n_stub, n_chart, n_clean, pct, n_chart - n_clean))
    print('files: %d written, %d preserved | index.json + CONVERSION_REPORT.md regenerated'
          % (n_written, n_skipped))
    print('flags:', dict(flagcount))


if __name__ == '__main__':
    main()
