# Jules Berne’s Pie Chart — v0.1.079

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

## Android scanner connection test

Apply the companion v0.2.006 patch and install its signed APK over the old version. On Android HTTPS PieChart, **Scan nutrition panel** in an unsaved Food Item opens a temporary companion screen, not the camera. It can return five fixed dummy readings or Cancel. Keep/edit non-nutrient draft fields first, then check they survive even if Android reopens PieChart in a new window. The first phone trial returned to the Today's Food browse screen, indicating the Food Item editor was not restored; the current PWA patch now waits for the database module before recovering the editor and retries after a foreground return. The phone retest remains outstanding. **Save and Record serving are blocked while test values are present**; select **Restore previous nutrient values** to continue editing. **Use photograph instead** preserves the previous Tesseract reader.

The current native test bridge accepts returns to `chlockasync.github.io` paths ending in `/index.html`. Verify that this is the PieChart host; a different host requires adjusting the companion allowlist before rebuilding. This is a test of Android app switching and form preservation, not evidence of successful OCR or a seamless transition yet.

## Stage 1 phone retest after v0.1.079

Only PieChart's GitHub Pages files need updating; the installed companion v0.2.006 remains unchanged. From Today's Food, open or create a Food Item, change its fields without saving, launch the companion, and tap **Return five TEST values**. Expected: the same Food Item editor reopens, all other field values and familiar measures are preserved, five fixed test numbers are visible, and **Restore previous nutrient values** is available. If Android resumes the PWA but does not deliver the callback, PieChart should still reopen the draft and explicitly say no scanner results were received. Test **Cancel without changes** as well. If it still opens only Today's Food, note whether the PWA was launched from its home-screen icon or from Chrome; do not save dummy numbers.
