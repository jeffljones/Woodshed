#!/usr/bin/env python3
"""
Probe: Jam Book song -> ChordPro, plus live transpose and Nashville-number rendering.

Validates the riskiest assumptions of the first ("chord-lane") slice using REAL data
from the existing jam-book library, with zero external dependencies:

  1. jam-book `lines[]` (chord-line-over-lyric-line) -> inline ChordPro (.cho)
  2. live transpose of chord charts (word-boundary-safe, column-preserving)
  3. chord <-> Nashville Number System toggle (key-relative, transpose-invariant)

The music theory is ported faithfully from the jam-book reference app
(jam_book_reference.html). If transpose/Nashville are wrong here, they were wrong there.

Usage:  python3 jam_to_chordpro.py [song_id ...]
        (defaults: auto-pick a clean charted+keyed song, plus s022)
"""
import json, os, re, sys

LIB = "/tmp/ref/song_library.json"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# ---------- music math (ported from the jam book) ----------
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
FLAT = {'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B', 'Fb': 'E'}
SHOW_FLAT = {'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'}
PREF_FLAT = {'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm'}
MAJSCALE = [0, 2, 4, 5, 7, 9, 11]

# chord token inside a line (with leading boundary guard so "(cycle throughout)" survives)
CHRE = re.compile(
    r'(^|[^A-Za-z])([A-G])([#b]?)((?:maj|min|m|sus|dim|aug|add|M|\^)*[0-9]*(?:b5)?)((?:/[A-G][#b]?)?)(?![A-Za-z])')
# whole-token chord test (for inline conversion / column scan)
CH_TOKEN = re.compile(
    r'^\(?[A-G][#b]?(?:maj|min|m|sus|dim|aug|add|M|\^)*\d*(?:b5)?[-+°]?\??(?:/[A-G][#b]?)?\)?[,.]?$')


def note_idx(n):
    n = FLAT.get(n, n)
    return NOTES.index(n) if n in NOTES else -1


def shift_note(n, semis, flat):
    i = note_idx(n)
    if i < 0:
        return n
    out = NOTES[(i + semis + 1200) % 12]
    return SHOW_FLAT[out] if (flat and out in SHOW_FLAT) else out


def to_nash(root, qual, bass, key):
    if not key:
        return root + qual + bass
    m = re.match(r'^([A-G][#b]?)(m?)$', key)
    if not m:
        return root + qual + bass
    tonic = note_idx(m.group(1))
    if m.group(2):                       # minor key -> use relative major
        tonic = (tonic + 3) % 12
    iv = (note_idx(root) - tonic + 12) % 12
    if iv in MAJSCALE:
        deg = str(MAJSCALE.index(iv) + 1)
    else:
        nxt = (iv + 1) % 12
        deg = 'b' + str(MAJSCALE.index(nxt) + 1) if nxt in MAJSCALE else '#?'
    is_min = bool(re.match(r'^m(?!aj)', qual))
    q = re.sub(r'^maj', 'Δ', re.sub(r'^m(?!aj)', '', qual))
    return deg + ('m' if is_min else '') + q + bass


def transpose_line(x, semis, flat=False, nash=False, key=None):
    """Rewrite chord tokens in a line; pad shortened chords to preserve column alignment."""
    def repl(m):
        pre, root, acc, qual, bass = m.group(1), m.group(2), m.group(3), m.group(4), m.group(5)
        r = root + (acc or '')
        if nash:
            return pre + to_nash(r, qual, bass, key)
        nr = shift_note(r, semis, flat)
        nb = '/' + shift_note(bass[1:], semis, flat) if bass else ''
        out = nr + qual + nb
        orig = len(m.group(0)) - len(pre)
        if len(out) < orig:
            out += ' ' * (orig - len(out))
        return pre + out
    return CHRE.sub(repl, x)


# ---------- key detection (ported) ----------
def song_key(song):
    k = song.get('key')
    if k:
        m = re.match(r'^([A-G][#b]?)(m?)', k.strip())
        if m:
            return m.group(1) + (m.group(2) or '')
    for l in song.get('lines', []):
        if l['t'] == 'chord':
            m = re.search(r'([A-G][#b]?)(m?)', l['x'])
            if m:
                return m.group(1) + m.group(2)
    return None


# ---------- jam-book lines -> inline ChordPro ----------
def chord_cols(line):
    """[(col, token)] for chord-shaped tokens in a chord line (skips bars/furniture)."""
    out = []
    for m in re.finditer(r'\S+', line):
        if CH_TOKEN.match(m.group(0)):
            out.append((m.start(), m.group(0)))
    return out


def to_inline(chord_line, lyric_line):
    """Place [chord] into the lyric at each chord's column (right-to-left to keep indices)."""
    s = lyric_line
    for col, tok in sorted(chord_cols(chord_line), key=lambda t: -t[0]):
        pos = min(col, len(s))
        s = s[:pos] + '[' + tok + ']' + s[pos:]
    return s


def to_chordpro(song):
    lines = song.get('lines', [])
    key = song_key(song)
    out = ['{title: %s}' % song['title']]
    if key:
        out.append('{key: %s}' % key)
    if song.get('lead'):
        out.append('{c: lead: %s}' % song['lead'])
    out.append('')
    i = 0
    while i < len(lines):
        l = lines[i]
        if l['t'] == 'label':
            out.append('{c: %s}' % l['x'].strip())
        elif l['t'] == 'blank':
            out.append('')
        elif l['t'] == 'lyric':
            out.append(l['x'])
        elif l['t'] == 'chord':
            nxt = lines[i + 1] if i + 1 < len(lines) else None
            if nxt and nxt['t'] == 'lyric':
                out.append(to_inline(l['x'], nxt['x']))
                i += 1                                   # consumed the lyric
            else:
                out.append('  '.join('[%s]' % t for _, t in chord_cols(l['x'])) or l['x'])
        i += 1
    return '\n'.join(out) + '\n'


# ---------- plain-chart renderer (for easy eyeballing) ----------
def render_plain(song, semis=0, nash=False):
    key = song_key(song)
    flat = (key in PREF_FLAT) if key else False
    rows = []
    for l in song.get('lines', []):
        if l['t'] == 'chord':
            rows.append(transpose_line(l['x'], semis, flat, nash, key))
        elif l['t'] == 'blank':
            rows.append('')
        else:
            rows.append(l['x'])
    return rows


def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')[:40] or 'song'


def pick_demo(songs):
    """A clean charted+keyed song with a readable length, for the printed sample."""
    cands = [s for s in songs if s.get('hasChords') and s.get('key')
             and 10 <= len(s.get('lines', [])) <= 30]
    return cands[0] if cands else next(s for s in songs if s.get('hasChords'))


def main():
    os.makedirs(OUT, exist_ok=True)
    lib = json.load(open(LIB))
    by_id = {s['id']: s for s in lib['songs']}
    ids = sys.argv[1:]
    if not ids:
        ids = [pick_demo(lib['songs'])['id'], 's022']

    demo = None
    for sid in ids:
        s = by_id.get(sid)
        if not s:
            print('!! no song', sid); continue
        base = slug(s['title'])
        key = song_key(s)
        open(os.path.join(OUT, base + '.cho'), 'w').write(to_chordpro(s))
        open(os.path.join(OUT, base + '.original.txt'), 'w').write('\n'.join(render_plain(s)))
        open(os.path.join(OUT, base + '.transpose+2.txt'), 'w').write('\n'.join(render_plain(s, 2)))
        open(os.path.join(OUT, base + '.nashville.txt'), 'w').write('\n'.join(render_plain(s, 0, True)))
        print('wrote 4 files for %-5s %r (key %s, %d lines)'
              % (sid, s['title'], key, len(s['lines'])))
        if demo is None:
            demo = s

    # printed sample so the result is visible without opening files
    key = song_key(demo)
    orig, tr, na = render_plain(demo), render_plain(demo, 2), render_plain(demo, 0, True)
    n = min(18, len(orig))
    print('\n' + '=' * 70)
    print('SAMPLE: %r  (key %s)' % (demo['title'], key))
    print('=' * 70)
    for label, rows in (('ORIGINAL', orig), ('TRANSPOSED +2', tr), ('NASHVILLE', na)):
        print('\n--- %s ---' % label)
        print('\n'.join(rows[:n]))


if __name__ == '__main__':
    main()
