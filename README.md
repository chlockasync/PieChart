# Jules Berne’s Pie Chart — v0.1.039

An installable, phone-first health, nutrition, and activity tracker prototype for GitHub Pages. The chart and its CSV history are **fictional demonstrations**. The food library supports explicitly approved Food Items, Dishes, and Meals, with local NZ/AU/USDA reference search, barcode lookup, and review of OCR-scanned nutrition labels.

## Version 0.1.039 — Firebase foundation

This version adds a configurable Firebase/Firestore connection, Google account sign-in, a two-member allowlist, shared approved-food synchronisation, and secure collection paths for private personal records. **The live backend is not active until the project owner completes the setup.** Read **`FIREBASE_SETUP.md`** for the one-time console and GitHub Pages steps.

This is not yet a production data tracker: the existing chart, weight sheet, and water sheet still work with demo data, not the Firestore personal records. Automatic, recoverable historical backups are **not implemented**; Firestore syncing and its offline cache are not backups. Continue to retain independent approved-food exports.

## Applying update ZIPs

The initial full project lives in GitHub Pages. Each later `PieChart` ZIP is a **patch** containing *only files changed in that version*. Extract or upload the patch over the existing files, preserving all unchanged files. Do not delete earlier files simply because they are absent from the patch. Include **new** files from the patch (this version adds `firebase-config.js`, `piechart-db.js`, `firestore.rules`, and `FIREBASE_SETUP.md`).

This version also updates `index.html`, `PROJECT_SPEC.md`, and this `README.md`. `PROJECT_SPEC.md` is the authoritative requirements and implementation-status reference. `firestore.rules` must also be **published in Firebase Console**; merely uploading it to GitHub Pages does not activate the rules.

## Food library

From the home chart, open Settings → Food library. Approved records appear first, with read-only NZ Concise (2021), AFCD Release 3, and USDA Foundation (2026) search suggestions after them. A barcode scan or a selected external suggestion opens an editable review form; nothing external is approved automatically. The bundled `approved-foods-seed.js` contains only an earlier user-approved testing snapshot and is **not** a general starter library.

Without configured Firebase, records remain local to the browser as in the previous prototype. With Firebase connected and a valid membership document, approved records load from the shared Firestore library. Use Settings → Transfer local approved foods to **explicitly** copy approved items from that browser into the cloud, without overwriting matching cloud records or deleting local copies.

The bundled `dummy-data.csv` controls the **demo chart only**. The branded icon and locally bundled reference indexes are unchanged.
