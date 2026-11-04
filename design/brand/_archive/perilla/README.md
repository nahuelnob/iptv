# Perilla brand assets

Brand identity for the app (proposed name: **Perilla**). Open `manual.html` in a browser for the full brand manual (Spanish).

All files are optimized SVG: no fonts, no embedded rasters, no gradients.

## Files

| File | Use |
|------|-----|
| `manual.html` | Brand manual (concept, name, logo, color, type, icons, app usage, voice, downloads) |
| `logo/logo-horizontal.svg` | Primary logo (mark + wordmark), dark backgrounds |
| `logo/logo-horizontal-on-light.svg` | Primary logo, light backgrounds (ink `#16130f`, dot `#117464`) |
| `logo/logo-stacked.svg` | Stacked logo, dark backgrounds |
| `logo/mark.svg` | Symbol only, dark backgrounds (rail, small spaces) |
| `logo/mono-light.svg` | One-color logo in `#f5f0ea`, for dark backgrounds |
| `logo/mono-dark.svg` | One-color logo in `#16130f`, for light backgrounds |
| `android/tv-banner.svg` | Android TV launcher banner, 320x180 |
| `android/app-icon.svg` | Full launcher icon, 432x432 (background + foreground) |
| `android/app-icon-foreground.svg` | Adaptive icon foreground layer, 432x432, mark inside the central 264 px safe circle |
| `android/app-icon-background.svg` | Adaptive icon background layer, 432x432, solid `#211d18` |
| `favicon.svg` | Web favicon, tuned for 16 to 64 px |
| `sketches/sketch-fogon.svg`, `sketches/sketch-alaire.svg` | Wordmark sketches of the two alternative names (not for production) |
| `source/logo_geometry.py` | Single source of the geometry; regenerates every SVG above |

## Android build

- **TV banner** (`android:banner` in the manifest): `android/tv-banner.svg`. Import it as a vector drawable (Android Studio, Vector Asset) or export a 320x180 PNG to `res/drawable-xhdpi/banner.png`.
- **Adaptive launcher icon** (`mipmap-anydpi-v26/ic_launcher.xml`): foreground `android/app-icon-foreground.svg`, background `android/app-icon-background.svg` (or the color `#211d18`). The 432 px canvas maps to 108 dp; the mark stays within the 66 dp safe zone.
- **Legacy and round icons** (API < 26, `ic_launcher_round`): `android/app-icon.svg`, exported per density (48, 72, 96, 144, 192 px).
- **Splash** (Android 12+ `windowSplashScreenAnimatedIcon`): `android/app-icon-foreground.svg` on background `#16130f`.
- **Web**: `favicon.svg` as `<link rel="icon" type="image/svg+xml">`.

## Regenerating

```sh
python design/brand/source/logo_geometry.py design/brand
```

Colors and proportions live at the top of the script. Edit the geometry there, not in the individual SVG files.
