#!/usr/bin/env python3
"""
Probe: notation/tab lane — render-from-source + semantic transpose + share-as-PDF.

Pipeline exercised (the MusicXML "interchange bus" from DESIGN.md):

    ABC (text master)
      -> music21   parse, analyze key, SEMANTIC transpose (notes AND chord symbols)
      -> MusicXML  the interchange bus
      -> Verovio   engrave -> SVG ("render from source")
      -> cairosvg  SVG -> PDF / PNG (the shareable artifact)

Unlike the chord lane (regex on chord text), transposing here moves real pitches, so the
same mechanism works for melody and tab — not just chord symbols.

Run:  python3 notation_probe.py        Deps: music21, verovio, cairosvg
"""
import os
from music21 import converter, harmony

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# A short original reel in D with chord symbols — stands in for a fiddle-tune lead sheet.
ABC = """X:1
T:Probe Reel in D
M:4/4
L:1/8
K:D
"D" A2 FA d2 cd | "G" B2 GB "A" e2 ce | "D" d2 FA d2 cd | "A" e2 ce "D" d4 |]
"""


def chord_figures(score):
    return [cs.figure for cs in score.recurse().getElementsByClass(harmony.ChordSymbol)]


def render(score, stem):
    """score -> MusicXML -> Verovio SVG -> PDF + PNG. Returns files written."""
    import verovio
    xml_path = os.path.join(OUT, stem + ".musicxml")
    score.write("musicxml", fp=xml_path)
    written = [xml_path]

    tk = verovio.toolkit()
    tk.setOptions({"pageWidth": 2100, "adjustPageHeight": True,
                   "scale": 55, "header": "none", "footer": "none"})
    if not tk.loadData(open(xml_path).read()):
        raise RuntimeError("verovio failed to load MusicXML")
    svg = tk.renderToSVG(1)
    svg_path = os.path.join(OUT, stem + ".svg")
    open(svg_path, "w").write(svg)
    written.append(svg_path)

    try:
        import cairosvg
        pdf_path, png_path = os.path.join(OUT, stem + ".pdf"), os.path.join(OUT, stem + ".png")
        cairosvg.svg2pdf(bytestring=svg.encode(), write_to=pdf_path)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=png_path, output_width=1600)
        written += [pdf_path, png_path]
    except Exception as e:
        print("  (SVG -> PDF/PNG skipped:", e, ")")
    return written


def main():
    os.makedirs(OUT, exist_ok=True)
    open(os.path.join(OUT, "probe-reel.abc"), "w").write(ABC)

    s = converter.parse(ABC, format="abc")
    t = s.transpose("M2")                      # +2 semitones: D -> E

    print("Analyzed key (original):", s.analyze("key"))
    print("Analyzed key (+M2)     :", t.analyze("key"))
    print("Chord symbols original :", chord_figures(s))
    print("Chord symbols +M2      :", chord_figures(t))

    files = render(s, "probe-reel") + render(t, "probe-reel.transpose+2")
    print("\nwrote:")
    for f in files:
        print("   probe/out/%-32s (%d bytes)" % (os.path.basename(f), os.path.getsize(f)))


if __name__ == "__main__":
    main()
