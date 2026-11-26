# Jules Berne’s Pie Chart — v0.1.091

Phone-first PWA for weight, nutrition, water, steps, and activity tracking. Hosted on GitHub Pages with Google sign-in, shared Food and Activity Libraries, and owner-private history.

## Current files

- `index.html` — chart, overlays, forms, and interactions.
- `piechart-db.js`, `firebase-config.js`, and `firestore.rules` — Firebase integration and security rules.
- `activity-math.js` and `calorie-budget.js` — activity and energy calculations.
- `nz-concise-2021.js`, `au-afcd-r3.js`, `usda-foundation-2026.js` — bundled food references.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — PWA metadata and icons.
- `PROJECT_SPEC.md` — authoritative requirements and implementation notes.

## Updating

Patch ZIPs contain only changed files. Extract a patch into the existing GitHub Pages repository, replacing those filenames, preserving unchanged files, and commit. Apply patch versions in sequence when they modify different files.

Updates to the scanner handoff do not alter Firebase rules, Health Connect, or existing private records. Retain the existing database and food reference files.

See `FIREBASE_SETUP.md` for current Firebase access and security details.

The graph reads genuine owner-private Firestore history only. Imported Noom numerical
summaries are stored under `users/{uid}/dailyTotals/{YYYY-MM-DD}.noom`, and original
Noom daily budgets are preserved. The former public `dummy-data.csv` is retired
and should not be deployed. Missing measurements stay blank. Historical budgets
never project missing steps from nearby days; only today may project unobserved
steps. For other owner-specific historical imports, prepare Firestore-compatible
records offline and upload them separately; personal data is not committed to GitHub.

## Current history and synchronisation

Firestore's existing persistent IndexedDB cache holds each browser profile's authorised account data. Live snapshot listeners apply only changed documents. Cached history is retained locally for later launches; unrelated Firestore metadata, favourites, and library notifications do not redraw the graph. Changed dates and chart bands refresh without rebuilding unrelated graph content. This cache is not an off-device backup.

Imported Noom summaries are stored privately at `users/{uid}/dailyTotals/{YYYY-MM-DD}.noom`. Their original calorie budgets, including genuine missing days, are authoritative throughout the period covered by that member's Noom history. Daily calorie/nutrient/water readings and diaries add separately recorded PieChart entries to imported Noom totals. Do not place personal history exports in GitHub.

Favourites are account-private under `users/{uid}/settings/favorites`; shared definitions never seed personal favourites. Existing private settings are not reset.

## Scanner

The separate Android PieChart Companion v0.2.016 handles ML Kit per-100 nutrition scanning. PieChart preserves the unsaved Food Item draft for the app-to-app callback. See `PROJECT_SPEC.md` for current scanner requirements and remaining phone testing; there is no scanner change in this patch.
