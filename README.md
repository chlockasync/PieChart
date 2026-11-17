# Jules Berne's Pie Chart — v0.1.027

A phone-first, installable GitHub Pages prototype. Upload `index.html`, `manifest.webmanifest`, `dummy-data.csv`, `icon-192.png`, and `icon-512.png` together at the site root. The two Markdown files document the design.

## Current display

The original eight-band graph, right-side metric labels and ratio bars, nautical meat-pie logo, date-axis gestures, weight-recording wheel, and water-recording control are retained from v0.1.026. The historical records are still entirely fictional and loaded from `dummy-data.csv`; they are NOT entries from the new food library.

## Food library foundation — v0.1.027

Open **Settings (gear) → Food library**, or double-tap a nutrition metric. The old canned sample Food Items, Dishes, and Meals have been removed entirely. The personal Food Item library starts **empty** and is never automatically populated.

Search matches your approved items immediately, placing relevant saved items first. After at least four characters, the app also searches Open Food Facts (clearly marked **external**). To respect the provider's stated 10-searches-per-minute limit, external requests are debounced and spaced at least eight seconds apart; results are cached during the session. A live internet connection and provider availability are required. External suggestions remain outside your database until deliberately approved.

Selecting an external result opens its editable review form. Every Food Item requires calories, protein, carbohydrates, fat, and fibre per 100 g or 100 mL, plus a source. Missing nutritional values are left visibly blank and MUST be filled with a defensible value or explicit estimate; they are never silently replaced with zero. Optional brand, barcode, and familiar-measure conversions are available. **Approve and save** is the only way to add a Food Item. An individual specific item can also be created manually; existing approved items can be edited or removed.

**Important:** This is the first implementation stage, not the finished food diary. Approved items live in this browser's `localStorage` only, rather than Firebase. Items are NOT shared, synced, or backed up, and may be lost if browser data is cleared. Do not enter irreplaceable real data yet. Meal/Dish composition, secondary nutritional sources and estimate research, food recording, Google sign-in, and Firebase come later. The current food screen does not alter the displayed demo nutrient totals.

The source code includes no starter food records, even in the absence of an internet connection.
