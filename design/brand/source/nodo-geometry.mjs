// Nodo brand geometry: the single source of every SVG in design/brand/.
// Run: node design/brand/source/nodo-geometry.mjs
//
// The wordmark is a geometric construction (not a traced font): circles, ellipses and
// rectangles in a unit system where the x-height is 100. SVG y grows downward, so the
// baseline sits at y = 140 and the ascender line at y = 0.

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const COLOR = {
  hueso: "#F5F4F0",
  negro: "#111111",
  rojo: "#E8381E",
  gris: "#5E5C57",
  pantalla: "#0E0E0E",
};

const f = (n) => String(Math.round(n * 100) / 100);

// ---------------------------------------------------------------- wordmark units
export const U = {
  base: 140, // baseline (y-down)
  xh: 100, // x-height
  asc: 140, // ascender height of the d
  stem: 26, // vertical stem
  hair: 22, // thinned top/bottom of round strokes (optical correction)
  ov: 2, // overshoot of round letters
};
const Y = (y) => U.base - y; // y-up glyph space to SVG space

// n: full-height left stem + semicircular shoulder (same arch as the mark).
function glyphN(x0) {
  const W = 94;
  const R = W / 2;
  const top = U.xh + 1.5; // shoulder overshoot
  const cy = top - R;
  const rx = R - U.stem;
  const ry = top - U.hair - cy;
  const join = cy + Math.sqrt(R * R - rx * rx); // where the shoulder leaves the stem
  const d =
    `M${f(x0)} ${f(Y(0))}V${f(Y(U.xh))}H${f(x0 + U.stem)}V${f(Y(join))}` +
    `A${f(R)} ${f(R)} 0 0 1 ${f(x0 + W)} ${f(Y(cy))}V${f(Y(0))}H${f(x0 + W - U.stem)}V${f(Y(cy))}` +
    `A${f(rx)} ${f(ry)} 0 0 0 ${f(x0 + U.stem)} ${f(Y(cy))}V${f(Y(0))}Z`;
  return { d, w: W };
}

// Ellipse as two arcs. cw = clockwise on screen (outer), ccw for counters.
function ellipse(cx, cy, rx, ry, cw = true) {
  const s = cw ? 1 : 0;
  return (
    `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 ${s} ${f(cx + rx)} ${f(cy)}` +
    `A${f(rx)} ${f(ry)} 0 1 ${s} ${f(cx - rx)} ${f(cy)}Z`
  );
}

// o: circle ring, heavier at the sides than at top and bottom.
function glyphO(x0) {
  const R = 52;
  const cx = x0 + R;
  const cy = Y(50);
  return { d: ellipse(cx, cy, R, R) + ellipse(cx, cy, R - U.stem, R - U.hair, false), w: 2 * R };
}

// d: bowl whose counter is tangent to the inner edge of the right stem.
function glyphD(x0) {
  const rx = 50;
  const ry = 52;
  const cx = x0 + rx;
  const cy = Y(50);
  const stemL = cx + rx - U.stem;
  const stemR = cx + rx;
  const dx = stemL - cx;
  const dy = ry * Math.sqrt(1 - (dx / rx) ** 2);
  const outer =
    `M${f(stemR)} ${f(Y(0))}V${f(Y(U.asc))}H${f(stemL)}V${f(cy - dy)}` +
    `A${f(rx)} ${f(ry)} 0 1 0 ${f(stemL)} ${f(cy + dy)}V${f(Y(0))}Z`;
  // The outer contour runs counter-clockwise, so the counter runs clockwise (nonzero fill).
  const inner = ellipse(cx, cy, rx - U.stem, ry - U.hair, true);
  return { d: outer + inner, w: 2 * rx };
}

// Spacing: visible gaps between glyph extremes. Tight on purpose (the -0.06em look);
// round-to-round pairs sit closer than straight-to-round pairs.
const GAP = { no: 9, od: 7, do: 9, oDot: 8 };
const DOT_R = 17;

function wordmark() {
  let x = 0;
  const n = glyphN(x);
  x += n.w + GAP.no;
  const o1 = glyphO(x);
  x += o1.w + GAP.od;
  const d = glyphD(x);
  x += d.w + GAP.do;
  const o2 = glyphO(x);
  x += o2.w + GAP.oDot;
  const dot = { cx: x + DOT_R, cy: Y(DOT_R - 1), r: DOT_R }; // 1 unit overshoot below baseline
  const width = x + 2 * DOT_R;
  return { ink: n.d + o1.d + d.d + o2.d, dot, width, height: U.base + U.ov };
}

export const WM = wordmark();

const circle = (c, fill) => `<circle cx="${f(c.cx)}" cy="${f(c.cy)}" r="${f(c.r)}" fill="${fill}"/>`;

function wordmarkSvg(ink, dot, title) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f(WM.width)} ${f(WM.height)}" width="${f(WM.width)}" height="${f(WM.height)}" role="img" aria-label="${title}">` +
    `<path fill="${ink}" d="${WM.ink}"/>${circle(WM.dot, dot)}</svg>\n`
  );
}

// ---------------------------------------------------------------- mark (100 x 100)
export const MARK = {
  size: 100,
  radius: 18,
  stroke: 11,
  nW: 40, // outer width of the arch
  nH: 44, // outer height of the arch
  dotR: 7.2, // 1.31 x stroke, same ratio as the wordmark dot to its stem
  gap: 5,
  x0: 23, // group nudged right of bbox-centre: the small dot weighs less than the n
  top: 27,
};

function markN(x0, top, W, H, s) {
  const R = W / 2;
  const r = R - s;
  const base = top + H;
  const cy = top + R;
  return (
    `M${f(x0)} ${f(base)}V${f(cy)}A${f(R)} ${f(R)} 0 0 1 ${f(x0 + W)} ${f(cy)}V${f(base)}` +
    `H${f(x0 + W - s)}V${f(cy)}A${f(r)} ${f(r)} 0 0 0 ${f(x0 + s)} ${f(cy)}V${f(base)}Z`
  );
}

function markParts(scale = 1, ox = 0, oy = 0) {
  const m = MARK;
  const S = (v) => v * scale;
  const n = markN(ox + S(m.x0), oy + S(m.top), S(m.nW), S(m.nH), S(m.stroke));
  const dot = {
    cx: ox + S(m.x0 + m.nW + m.gap + m.dotR),
    cy: oy + S(m.top + m.nH - m.dotR),
    r: S(m.dotR),
  };
  return { n, dot };
}

const rrect = (x, y, w, h, r, fill) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(r)}" fill="${fill}"/>`;

function markSvg() {
  const { n, dot } = markParts();
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="Nodo">` +
    rrect(0, 0, 100, 100, MARK.radius, COLOR.negro) +
    `<path fill="${COLOR.hueso}" d="${n}"/>${circle(dot, COLOR.rojo)}</svg>\n`
  );
}

// 24 px simplification: the n drops out, the dot grows so it survives 16 px.
export const MARK_SMALL_DOT = { cx: 64, cy: 64, r: 15 };
function markSmallSvg() {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="24" height="24" role="img" aria-label="Nodo">` +
    rrect(0, 0, 100, 100, MARK.radius, COLOR.negro) +
    `${circle(MARK_SMALL_DOT, COLOR.rojo)}</svg>\n`
  );
}

// ---------------------------------------------------------------- Android
// Adaptive icon: 432 px = 108 dp. The mark's 100-unit square maps onto the 288 px (72 dp)
// visible viewport, which keeps the n and the dot inside the 264 px safe circle.
const ICON = 432;
const ICON_SCALE = 2.88;
const ICON_OFF = (ICON - 100 * ICON_SCALE) / 2;

function iconForeground(withBg) {
  const { n, dot } = markParts(ICON_SCALE, ICON_OFF, ICON_OFF);
  const bg = withBg ? `<rect width="${ICON}" height="${ICON}" fill="${COLOR.negro}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON} ${ICON}" width="${ICON}" height="${ICON}"${withBg ? ' role="img" aria-label="Nodo"' : ""}>` +
    `${bg}<path fill="${COLOR.hueso}" d="${n}"/>${circle(dot, COLOR.rojo)}</svg>\n`
  );
}

function iconBackground() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON} ${ICON}" width="${ICON}" height="${ICON}"><rect width="${ICON}" height="${ICON}" fill="${COLOR.negro}"/></svg>\n`;
}

// TV banner 320 x 180: wordmark 176 px wide (55% of the width), optically centred.
function banner() {
  const W = 320;
  const H = 180;
  const w = 176;
  const k = w / WM.width;
  const tx = (W - w) / 2;
  // bbox centre is y = 70, x-height band centre is y = 90; the single ascender of the d
  // should not drag the word upward, so y = 80 sits on the canvas centre.
  const opticalY = 80;
  const ty = H / 2 - opticalY * k;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Nodo">` +
    `<rect width="${W}" height="${H}" fill="${COLOR.negro}"/>` +
    `<g transform="translate(${f(tx)} ${f(ty)}) scale(${Math.round(k * 100000) / 100000})">` +
    `<path fill="${COLOR.hueso}" d="${WM.ink}"/>${circle(WM.dot, COLOR.rojo)}</g></svg>\n`
  );
}

// ---------------------------------------------------------------- write
const out = {
  "logo/logo.svg": wordmarkSvg(COLOR.negro, COLOR.rojo, "nodo."),
  "logo/logo-on-dark.svg": wordmarkSvg(COLOR.hueso, COLOR.rojo, "nodo."),
  "logo/mono-dark.svg": wordmarkSvg(COLOR.negro, COLOR.negro, "nodo."),
  "logo/mono-light.svg": wordmarkSvg(COLOR.hueso, COLOR.hueso, "nodo."),
  "logo/mark.svg": markSvg(),
  "logo/mark-small.svg": markSmallSvg(),
  "favicon.svg": markSmallSvg().replace('width="24" height="24"', 'width="32" height="32"'),
  "android/tv-banner.svg": banner(),
  "android/app-icon.svg": iconForeground(true),
  "android/app-icon-foreground.svg": iconForeground(false),
  "android/app-icon-background.svg": iconBackground(),
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const [rel, svg] of Object.entries(out)) {
    const p = join(ROOT, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, svg);
    console.log(`${rel}  ${svg.length} B`);
  }
  console.log(`wordmark ${f(WM.width)} x ${f(WM.height)}, dot`, WM.dot);
  console.log("mark", markParts());
}
