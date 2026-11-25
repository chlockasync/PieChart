# Jules Berne’s Pie Chart — v0.1.089

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
Noom daily budgets are preserved. The former public `dummy-data.csv` is retired;
**delete it from the GitHub Pages repository when applying this patch**. Missing
measurements stay blank. For other owner-specific historical imports, prepare
Firestore-compatible records offline and upload them separately; personal data
is not committed to GitHub.

## Android nutrition-panel scanner integration

The PieChart Food Item form offers **Scan nutrition panel** on Android, launching the installed PieChart Companion v0.2.016 directly into its ML Kit camera screen. The native scanner is styled to match PieChart's Food Item dialog, with a large camera grid, the same five nutrient colours, and Cancel / Done buttons. Readings in the companion are regular-weight until confirmed, then bold.

PieChart v0.1.081 preserves the unsaved Food Item draft and handles a session-specific HTTPS callback. **Done** returns confirmed and provisional original per-100 g/mL readings, labelled by status; the Food Item form fills all recognised figures and marks provisional entries **check** for manual review. Missing fields remain blank, not zero. If energy was printed in kcal, PieChart converts it to kJ rather than misinterpreting the unit. The user can correct values manually and restore previous values before saving. **Cancel** does not change the form. The previously tested five-dummy-values path is replaced by live scanner results; an old dummy callback is still recognised and safely blocked from saving.

This v0.1.081 / v0.2.016 return change has **not yet been phone-tested**. Barcode lookup remains Open Food Facts only; failures now show their reason, offer a product-page link, and try its official v3 API after v2 fails when appropriate. External network availability cannot be guaranteed. Test a fresh unsaved Food Item and confirm successful Done, Cancel, incomplete labels, and any duplicate browser tabs. The existing browser-photo reader is available as **Use photograph instead** and remains the fallback on non-Android devices.

Apply only the changed files from the PieChart v0.1.081 delta ZIP into the **PieChart** repository (not PieChartCompanion), preserving unchanged files and paths, and allow GitHub Pages to deploy. The companion must separately be updated in its own repository.

