# Jules Berne’s Pie Chart — v0.1.080

Phone-first PWA for weight, nutrition, water, steps, and activity tracking. Hosted on GitHub Pages with Google sign-in, shared Food and Activity Libraries, and owner-private history.

## Current files

- `index.html` — chart, overlays, forms, and interactions.
- `piechart-db.js`, `firebase-config.js`, and `firestore.rules` — Firebase integration and security rules.
- `activity-math.js` and `calorie-budget.js` — activity and energy calculations.
- `nz-concise-2021.js`, `au-afcd-r3.js`, `usda-foundation-2026.js` — bundled food references.
- `dummy-data.csv` — **public sample graph history**; not personal account history. Its calorie budgets are calculated by the app, not supplied by CSV.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png` — PWA metadata and icons.
- `PROJECT_SPEC.md` — authoritative requirements and implementation notes.

## Updating

Patch ZIPs contain only changed files. Extract a patch into the existing GitHub Pages repository, replacing those filenames, preserving unchanged files, and commit. Apply patch versions in sequence when they modify different files.

Updates to the scanner handoff do not alter Firebase rules, Health Connect, or existing private records. Retain the existing database and food reference files.

See `FIREBASE_SETUP.md` for current Firebase access and security details.

## Android nutrition-panel scanner integration

The PieChart Food Item form offers **Scan nutrition panel** on Android, launching the installed PieChart Companion v0.2.015 directly into its ML Kit camera screen. The native scanner is styled to match PieChart's Food Item dialog, with a large camera grid, the same five nutrient colours, and Cancel / Done buttons. Readings in the companion are regular-weight until confirmed, then bold.

PieChart v0.1.080 preserves the unsaved Food Item draft and handles a session-specific HTTPS callback. **Done** fills the inputs with confirmed original per-100 g/mL readings only; missing/unconfirmed values remain blank, not zero. If energy was printed in kcal, PieChart converts it to kJ rather than misinterpreting the unit. The user can correct values manually and restore previous values before saving. **Cancel** does not change the form. The previously tested five-dummy-values path is replaced by live scanner results; an old dummy callback is still recognised and safely blocked from saving.

This joint PWA/Android update has **not yet been phone-tested**. Test a fresh unsaved Food Item and confirm successful Done, Cancel, incomplete labels, and any duplicate browser tabs. The existing browser-photo reader is available as **Use photograph instead** and remains the fallback on non-Android devices.

Apply only the changed files from the PieChart v0.1.080 delta ZIP into the **PieChart** repository (not PieChartCompanion), preserving unchanged files and paths, and allow GitHub Pages to deploy. The companion must separately be updated in its own repository.

