# Jules Berne’s Pie Chart — v0.1.075

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

v0.1.075 removes unused code and obsolete importer functions. It does not require new Firebase rules or change stored personal data. Previously imported NZ reference foods already stored in a device's browser remain readable, but there is no UI for importing additional reference files.

See `FIREBASE_SETUP.md` for current Firebase access and security details.
