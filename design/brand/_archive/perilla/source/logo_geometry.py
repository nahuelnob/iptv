"""Generate the Perilla logo SVGs from one shared geometry.

Mark: a knob (disc) with a pointer slot cut out, plus the "tuning dot" it points at.
Wordmark: monoline rounded letterforms drawn as stroked paths (no font at render time).
"""
import math
import os
import sys

# Usage: python design/brand/source/logo_geometry.py design/brand
OUT = sys.argv[1]

INK_LIGHT = "#f5f0ea"   # n-6, ink on dark
INK_DARK = "#16130f"    # n-0, ink on light
TEAL = "#4fd1bc"        # accent, on dark
TEAL_DEEP = "#117464"   # accent for light backgrounds
BG_ICON = "#211d18"     # n-1
BG_BANNER = "#211d18"   # n-1


def f(v):
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s == "-0" else s


# ---------------------------------------------------------------- mark geometry (unit box 100)
CX, CY, R = 47.0, 53.0, 38.0
ANG = math.radians(45)
U = (math.cos(ANG), -math.sin(ANG))
N = (-U[1], U[0])
SLOT_HALF = 6.0
SLOT_LEN = 22.0
DOT_R = 8.0
DOT_GAP = 6.0


def mark_bbox(dot_r=DOT_R, dot_gap=DOT_GAP):
    """Tight box (x, y, w, h) of the mark in unit space."""
    dist = R + dot_gap + dot_r
    dx, dy = CX + U[0] * dist, CY + U[1] * dist
    x0, y1 = CX - R, CY + R
    x1, y0 = max(CX + R, dx + dot_r), min(CY - R, dy - dot_r)
    return (x0, y0, x1 - x0, y1 - y0)


MARK_BOX = mark_bbox()  # tight viewBox (x, y, w, h)


def mark_paths(tx=0.0, ty=0.0, s=1.0, slot_half=SLOT_HALF, dot_r=DOT_R, dot_gap=DOT_GAP):
    """Return (disc_with_slot_path_d, (dot_cx, dot_cy, dot_r)) in target coordinates."""
    def p(x, y):
        return (tx + x * s, ty + y * s)

    cx, cy = p(CX, CY)
    r = R * s
    a = slot_half * s
    p0 = (cx, cy)
    p1 = (cx + U[0] * SLOT_LEN * s, cy + U[1] * SLOT_LEN * s)
    A = (p0[0] + N[0] * a, p0[1] + N[1] * a)
    B = (p1[0] + N[0] * a, p1[1] + N[1] * a)
    C = (p1[0] - N[0] * a, p1[1] - N[1] * a)
    D = (p0[0] - N[0] * a, p0[1] - N[1] * a)
    disc = (f"M{f(cx - r)} {f(cy)}a{f(r)} {f(r)} 0 1 0 {f(2 * r)} 0a{f(r)} {f(r)} 0 1 0 {f(-2 * r)} 0Z")
    slot = (f"M{f(A[0])} {f(A[1])}L{f(B[0])} {f(B[1])}A{f(a)} {f(a)} 0 0 0 {f(C[0])} {f(C[1])}"
            f"L{f(D[0])} {f(D[1])}A{f(a)} {f(a)} 0 0 0 {f(A[0])} {f(A[1])}Z")
    dist = (R + dot_gap + dot_r) * s
    dot = (cx + U[0] * dist, cy + U[1] * dist, dot_r * s)
    return disc + slot, dot


def mark_svg_group(tx, ty, s, ink, accent, **kw):
    d, (dx, dy, dr) = mark_paths(tx, ty, s, **kw)
    return (f'<path fill="{ink}" fill-rule="evenodd" d="{d}"/>'
            f'<circle cx="{f(dx)}" cy="{f(dy)}" r="{f(dr)}" fill="{accent}"/>')


# ---------------------------------------------------------------- wordmark glyphs
# Units: x-height 40, stroke 9, baseline y=0 (up is negative). Glyph x starts at its outer left edge.
W = 9.0
H = 4.5  # half stroke


def glyph(ch, x):
    """Return (stroke path d, list of dots (cx, cy, r), advance, left_kind, right_kind)."""
    if ch == "p":
        sx, c = x + H, x + 20
        return (f"M{f(sx)} -35.5V13.5M{f(c)} -35.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31Z",
                [], 40, "S", "R")
    if ch == "e":
        c = x + 20
        a = math.radians(48)
        ex, ey = c + 15.5 * math.cos(a), -20 + 15.5 * math.sin(a)
        return (f"M{f(c - 15.5)} -20H{f(c + 15.5)}A15.5 15.5 0 1 0 {f(ex)} {f(ey)}", [], 40, "R", "R")
    if ch == "r":
        sx = x + H
        return (f"M{f(sx)} -35.5V-4.5M{f(sx)} -18A17.5 17.5 0 0 1 {f(sx + 17.5)} -35.5", [], 26.5, "S", "O")
    if ch == "i":
        sx = x + H
        return (f"M{f(sx)} -35.5V-4.5", [(sx, -52.0, 5.5)], 9, "S", "S")
    if ch == "l":
        sx = x + H
        return (f"M{f(sx)} -53.5V-4.5", [], 9, "S", "S")
    if ch == "a":
        c = x + 20
        return (f"M{f(c)} -35.5a15.5 15.5 0 1 0 0 31a15.5 15.5 0 1 0 0-31ZM{f(c + 15.5)} -35.5V-4.5",
                [], 40, "R", "S")
    if ch == "o":
        c = x + 20
        return (f"M{f(c)} -35.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31Z", [], 40, "R", "R")
    if ch == "ó":
        c = x + 20
        return (f"M{f(c)} -35.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31ZM{f(c + 1)} -50L{f(c + 7)} -57",
                [], 40, "R", "R")
    if ch == "n":
        sx = x + H
        return (f"M{f(sx)} -35.5V-4.5M{f(sx)} -22A13.5 13.5 0 0 1 {f(sx + 27)} -22V-4.5", [], 36, "S", "S")
    if ch == "g":
        c = x + 20
        st = c + 15.5
        return (f"M{f(c)} -35.5a15.5 15.5 0 1 0 0 31a15.5 15.5 0 1 0 0-31ZM{f(st)} -35.5V2"
                f"A11.5 11.5 0 0 1 {f(st - 11.5)} 13.5H{f(c - 6)}", [], 40, "R", "S")
    if ch == "f":
        sx = x + 13.5
        return (f"M{f(sx)} -4.5V-42A11.5 11.5 0 0 1 {f(sx + 11.5)} -53.5H{f(sx + 16)}"
                f"M{f(x + H)} -35.5H{f(sx + 11.5)}", [], 34, "O", "O")
    raise ValueError(ch)


GAP = {("S", "S"): 11, ("S", "R"): 9.5, ("R", "S"): 9.5, ("R", "R"): 8}


def wordmark(text):
    """Return (stroke d, dots, width) for a word laid out from x=0."""
    x, prev, ds, dots = 0.0, None, [], []
    for ch in text:
        _, _, _, lk, _ = glyph(ch, 0)
        if prev is not None:
            if prev == "O" or lk == "O":
                x += 3 if prev == "O" else 6
            else:
                x += GAP[(prev, lk)]
        d, dt, adv, lk, rk = glyph(ch, x)
        ds.append(d)
        dots += dt
        x += adv
        prev = rk
    return "".join(ds), dots, x


def word_svg_group(text, tx, ty, s, ink):
    d, dots, _ = wordmark(text)
    tr = f' transform="translate({f(tx)} {f(ty)}) scale({f(s)})"' if (tx or ty or s != 1) else ""
    out = (f'<g{tr}><path fill="none" stroke="{ink}" stroke-width="9" stroke-linecap="round" '
           f'stroke-linejoin="round" d="{d}"/>')
    for cx, cy, r in dots:
        out += f'<circle cx="{f(cx)}" cy="{f(cy)}" r="{f(r)}" fill="{ink}"/>'
    return out + "</g>"


def svg(w, h, body, title, vb=None):
    vb = vb or f"0 0 {f(w)} {f(h)}"
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{f(w)}" height="{f(h)}" '
            f'role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n')


def write(name, content):
    os.makedirs(os.path.dirname(os.path.join(OUT, name)), exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(content)


# ---------------------------------------------------------------- horizontal logo
_, _, WM_W = wordmark("perilla")
MARK_S = 0.95                 # mark box 82 -> 77.9 tall
MARK_H = MARK_BOX[3] * MARK_S
GAP_MW = 24
# Wordmark spans y -58..18 (ascender..descender); centre the mark on the x-height middle (-20).
WM_TOP, WM_BOT = -58.0, 18.0


def horizontal(ink, accent):
    mark_y = -20 - MARK_H / 2
    top = min(mark_y, WM_TOP)
    bot = max(mark_y + MARK_H, WM_BOT)
    width = MARK_H + GAP_MW + WM_W
    height = bot - top
    oy = -top
    body = mark_svg_group(-MARK_BOX[0] * MARK_S, mark_y + oy - MARK_BOX[1] * MARK_S, MARK_S, ink, accent)
    body += word_svg_group("perilla", MARK_H + GAP_MW, oy, 1, ink)
    return width, height, body


def stacked(ink, accent):
    ms = 1.3
    mh = MARK_BOX[3] * ms
    gap = 22
    width = max(mh, WM_W)
    # Optical centring: the disc (not the box) sits on the wordmark's centre line; the dot hangs right.
    tx = width / 2 - CX * ms
    body = mark_svg_group(tx, -MARK_BOX[1] * ms, ms, ink, accent)
    width = max(width, tx + (MARK_BOX[0] + MARK_BOX[2]) * ms)
    wy = mh + gap + 58
    body += word_svg_group("perilla", (width - WM_W) / 2, wy, 1, ink)
    return width, wy + 18, body


w, h, b = horizontal(INK_LIGHT, TEAL)
write("logo/logo-horizontal.svg", svg(w, h, b, "Perilla"))
w, h, b = horizontal(INK_DARK, TEAL_DEEP)
write("logo/logo-horizontal-on-light.svg", svg(w, h, b, "Perilla"))
w, h, b = horizontal(INK_LIGHT, INK_LIGHT)
write("logo/mono-light.svg", svg(w, h, b, "Perilla"))
w, h, b = horizontal(INK_DARK, INK_DARK)
write("logo/mono-dark.svg", svg(w, h, b, "Perilla"))
w, h, b = stacked(INK_LIGHT, TEAL)
write("logo/logo-stacked.svg", svg(w, h, b, "Perilla"))
bx0, by0, bw, bh = MARK_BOX
write("logo/mark.svg", svg(bw, bh, mark_svg_group(-bx0, -by0, 1, INK_LIGHT, TEAL), "Perilla"))

# ---------------------------------------------------------------- Android: adaptive icon (432, safe circle 264)
ICON_S = 2.3
# Centre the mark's tight box (centre 50,50) on 216,216.
icx = 216 - (MARK_BOX[0] + MARK_BOX[2] / 2) * ICON_S
icy = 216 - (MARK_BOX[1] + MARK_BOX[3] / 2) * ICON_S
fg = mark_svg_group(icx, icy, ICON_S, INK_LIGHT, TEAL)
write("android/app-icon-foreground.svg", svg(432, 432, fg, "Perilla"))
write("android/app-icon-background.svg", svg(432, 432, f'<rect width="432" height="432" fill="{BG_ICON}"/>',
                                             "Perilla"))
write("android/app-icon.svg", svg(432, 432, f'<rect width="432" height="432" fill="{BG_ICON}"/>' + fg, "Perilla"))

# ---------------------------------------------------------------- Android TV banner 320x180
lw, lh, _ = horizontal(INK_LIGHT, TEAL)
bs = 264 / lw
bx, by = (320 - lw * bs) / 2, (180 - lh * bs) / 2
_, _, body = horizontal(INK_LIGHT, TEAL)
banner = (f'<rect width="320" height="180" fill="{BG_BANNER}"/>'
          f'<g transform="translate({f(bx)} {f(by)}) scale({f(bs)})">{body}</g>')
write("android/tv-banner.svg", svg(320, 180, banner, "Perilla"))

# ---------------------------------------------------------------- favicon (dark tile so it reads on light tab bars)
# Tuned for 16px: wider slot and a larger dot, same composition.
FAV = dict(slot_half=7.5, dot_r=10.0, dot_gap=6.0)
fb = mark_bbox(FAV["dot_r"], FAV["dot_gap"])
fs = 54 / fb[2]
fx = 32 - (fb[0] + fb[2] / 2) * fs
fy = 32 - (fb[1] + fb[3] / 2) * fs
fav = (f'<rect width="64" height="64" rx="14" fill="{INK_DARK}"/>'
       + mark_svg_group(fx, fy, fs, INK_LIGHT, TEAL, **FAV))
write("favicon.svg", svg(64, 64, fav, "Perilla"))

# ---------------------------------------------------------------- name sketches (wordmark only)
for word, fname in (("fogón", "sketch-fogon.svg"), ("alaire", "sketch-alaire.svg")):
    d, dots, ww = wordmark(word)
    top = -62 if word == "fogón" else -58
    write("sketches/" + fname, svg(ww + 10, 18 - top + 10, word_svg_group(word, 5, -top + 5, 1, INK_LIGHT),
                                   word.capitalize(), ))

print("wordmark width", WM_W, "mark box", MARK_BOX)
