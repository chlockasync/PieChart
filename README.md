# Jules Berne’s Pie Chart — v0.1.028

An installable GitHub Pages prototype. Upload the ZIP contents together into the site root. `index.html` is the app, `manifest.webmanifest` and the icons enable installation, and `PROJECT_SPEC.md` is the up-to-date, authoritative requirements record. The bundled demo CSV is **fictional chart data**, not food entries.

## Food library — first working reference/approval flow

Open **Settings → Food library**. The approved-food library starts entirely empty. The search box finds approved foods immediately and searches a separate NZ reference if one has been loaded. The result panel is the same height before and after you type, without the previous four-character layout jump.

To enable official NZ food typeahead, download **[New Zealand FOODfiles 2024](https://www.foodcomposition.co.nz/foodfiles/)** on a Windows computer, run its installer, and locate the `Standard DATA.AP` text file in the installed data files. In the PieChart food library, choose **Load NZ FOODfiles data** and select that file. This is a one-time reference load per device; it is **not** an import into your approved library. The read-only search index is held in browser IndexedDB, or in the current session if that storage is unavailable. The reference data must remain distinct from any modified, user-approved copies. The latest NZ online search is at https://www.foodcomposition.co.nz/search/ (the 2024 downloadable dataset is older).

For a packaged food, enter its **7–14 digit barcode** and press **Barcode**, or try **Scan** to use the camera on a browser/device supporting `BarcodeDetector`. Barcode lookup currently uses the public **Open Food Facts** product endpoint as a labelled fallback; it is **not** the NZ name-search provider. A product might not exist there, or have missing nutrients. Manual barcode entry always remains available when camera scanning is unsupported. An internet connection is required for barcode lookup.

Selecting an external reference or barcode result opens an editable review. **All five nutritional fields (calories, protein, carbohydrates, fats, and fibre) and a data source are mandatory**; unavailable data must be supplied as a visibly marked estimate rather than an unlabeled zero. Pressing **Approve and save** is the only operation that adds a Food Item to your own library. No starter foods, mock products, bulk imports, or unapproved external food records are included in the release.

## Prototype limitations

- **Approved foods still save to browser localStorage only**. They are not backed up, shared, or synced through Firebase. Do not use this prototype for irreplaceable food records.
- The official NZ file importer was developed from the published **Standard DATA.AP** format and tested against synthetic data in that format; it has **not yet been verified with the actual NZ 2024 file** in this environment.
- Live public barcode API access and phone-camera scanning require verification on the real devices; browser tests use simulated API responses.
- Food recording, Dishes, Meals, personal accounts, automatic steps, and genuine nutrient calculations from real diary entries are not yet connected. The graph still displays fictional demo data.

The graph, weight ruler, water controls, title bar, and icons are otherwise unchanged.
