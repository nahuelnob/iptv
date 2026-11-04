# Nodo brand assets

Brand identity for the app **Nodo**, direction "B · Punto". The wordmark is `nodo.` in lowercase, with a red period that marks the node and doubles as the "en vivo" (live) dot. Open `manual.html` in a browser for the full brand manual (Argentine Spanish).

Every SVG is hand-built geometry: no font dependency, no embedded rasters, no gradients, no filters. The geometry lives in `source/nodo-geometry.mjs`. To regenerate every SVG below, run `node design/brand/source/nodo-geometry.mjs`.

## Palette

| Name | HEX | Role |
|------|-----|------|
| Hueso | `#F5F4F0` | Light ground, ink on dark |
| Negro | `#111111` | Ink, mark square |
| Rojo vivo | `#E8381E` | The only accent: the dot, "en vivo", current channel, focus |
| Gris | `#5E5C57` | Secondary text, light grounds only |
| Pantalla | `#0E0E0E` | Dark app/TV ground |

Typeface: Schibsted Grotesk (Google Fonts, OFL), weights 400 / 600 / 800 / 900.

## Files

| File | Use |
|------|-----|
| `manual.html` | Brand manual: concept, name, logo (construction, versions, clear space, minimum sizes, incorrect uses), colour with measured contrast, type, the brand in the app, voice, downloads |
| `tokens-propuestos.css` | Proposed UI tokens for the dark TV app, using the variable names from `styles/tokens.css`. A proposal: `styles/tokens.css` is not modified |
| `logo/logo.svg` | Wordmark, Negro ink and red dot, for light grounds. 469 x 142 |
| `logo/logo-on-dark.svg` | Wordmark, Hueso ink and red dot, for dark grounds and the app |
| `logo/mono-dark.svg` | Wordmark in a single colour, Negro (dot included) |
| `logo/mono-light.svg` | Wordmark in a single colour, Hueso (dot included) |
| `logo/mark.svg` | Mark: Negro rounded square (radius 18%), Hueso "n" arch, red dot. Use at 32 px and up |
| `logo/mark-small.svg` | Mark simplified for 24 px and below: the square and a larger red dot only |
| `favicon.svg` | Web favicon (same drawing as `mark-small.svg`) |
| `android/tv-banner.svg` | Android TV launcher banner, exactly 320 x 180 |
| `android/app-icon.svg` | Adaptive icon composite preview, 432 x 432 (background + foreground) |
| `android/app-icon-foreground.svg` | Adaptive icon foreground layer, 432 x 432, transparent. The "n" and the dot stay inside the central 264 px safe circle |
| `android/app-icon-background.svg` | Adaptive icon background layer, 432 x 432, solid Negro `#111111` |
| `source/nodo-geometry.mjs` | Single source of the geometry |
| `_archive/perilla/` | The previous "Perilla" exploration, kept for reference. Not for production |

## What the builds use

**Android (Capacitor, `android/`)**

- **TV banner** (`android:banner="@drawable/banner"` in `AndroidManifest.xml`): `android/tv-banner.svg`. Import it as a vector drawable (Android Studio, Resource Manager, Vector Asset) named `banner`, or export a 320 x 180 PNG to `res/drawable-xhdpi/banner.png`.
- **Adaptive launcher icon** (`mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml`): foreground `android/app-icon-foreground.svg`, background `android/app-icon-background.svg`, or the colour `#111111`. The 432 px canvas maps to 108 dp. The launcher mask crops the canvas to its own shape, so the foreground carries no square of its own.
- **Legacy icons** (API below 26): export `logo/mark.svg` per density (48, 72, 96, 144, 192 px). Its rounded square is the legacy icon shape.

**Web**

- **Favicon**: `favicon.svg` (`<link rel="icon" href="..." type="image/svg+xml">`).
- **In-app logo** on the dark UI: `logo/logo-on-dark.svg`. For the side rail, use `logo/mark.svg` at 32 px or larger, otherwise `logo/mark-small.svg`.

## Accessibility notes

- On Pantalla `#0E0E0E` the mark's Negro square measures 1.02:1, so it has no visible edge. The Hueso "n" (17.16:1 against the square) and the red dot (4.51:1) carry the mark on its own.
- Red text passes 4.5:1 only on Pantalla (4.61:1). Never set red text on Hueso (3.80:1). On a red fill, use Negro text (4.51:1).
