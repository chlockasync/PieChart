# Jules Berne’s Pie Chart — Project Specification

**Status:** Agreed product requirements, with implementation status noted separately below.  
**Baseline:** Prototype v0.1.028 · 17 November 2026  
**Project/package name:** `PieChart`

## 1. Purpose and approach

A free, phone-first personal nutrition, activity, and weight tracker, designed primarily for everyday use by one person, with a second user able to test and maintain it. It replaces the practical tracking functions of Noom, not its coaching or educational content. Everyday recording should be quick; the app should not require routine database administration.

Develop the web app on GitHub Pages first, then provide Android integration where browser capabilities are insufficient. Keep the interface lean, touch-first, and consistent with the existing approved design. Do not introduce dashboards, controls, or complexity without a clear need.

## 2. Home screen and charts

**The home screen is the graph**, with a compact title bar featuring the approved right-facing meat-pie slice on a nautical chart, the name **Jules Berne’s Pie Chart**, and settings. The installed-app icon uses the same artwork.

Eight independent, vertically stacked chart bands appear by default, in this order: **Weight, Steps, Water, Calories, Fibre, Protein, Fats, Carbs**. Each has its own native-unit vertical scale, a distinct existing colour, fine daily marks with short downward fades, and thin full-width separators. The integrated right-hand label column shows the metric, actual reading, applicable target/budget, and a prominent percentage when a valid target exists. The far-right, 12 px colour strip has a muted full-height background and a saturated fill proportional to target achievement. Do **not** invent fat or carbohydrate targets. Weight percentage represents actual weight divided by target weight, not weight-loss progress.

The graph plots **individual daily records at every date range**, never aggregated multi-day averages. Initially show 100 days of the available history. Horizontal swipes reveal more or less historical data; the time axis moves during gestures, while the graph redraws on release. The axis marks actual calendar months, switching to year markers for long spans. The last completed day’s date belongs directly beneath its final plotted day column. Today's incomplete values appear in the right-hand readouts, **not** as a misleading partially completed chart column. There is no period selector.

Weight is shown using **actual weigh-in dots** and a smooth filled high/low envelope derived from a seven-calendar-day window of genuine measurements, including context preceding the displayed period. Never invent missed weigh-ins. Calorie ranges and valid goals use the existing coloured dashed styling. Preserve the currently approved band geometry and graph treatment unless a change is specifically requested.

Both portrait and landscape use the **same upright, left-to-right chart**, scaled to fit. Users can hide/show individual bands with explicit eye controls and reorder them by long-pressing and dragging their right-hand labels. A plain label tap must not accidentally change visibility. The installed PWA should request fullscreen without locking orientation.

## 3. Recording and daily history

- **Weight:** Double-tap its chart label to open the existing spacious entry sheet. A single horizontal, speed-sensitive ruler starts from the previous measurement; slow swipes permit precise **0.01 kg** adjustments, and fast swipes cover more ground with momentum. The fixed full reading sits directly beneath the pointer. The screen has **Record** and **Cancel** only. Preserve irregular weigh-in history and allow corrections/deletions.
- **Water:** Double-tap to show **five most recently used amounts** and **New amount**, displayed as a balanced 3×2 grid. Selecting a remembered amount records it immediately. New quantities become recent choices.
- **Food:** Search and recording will be built separately. The final entry flow should favour relevant saved Foods, Dishes, and Meals and require minimal taps; its precise screen design is not yet agreed. Existing nutrition-metric double taps currently open the **library**, not a working food diary.
- **Exercise:** Record activity type, duration/time, and intensity when relevant; calculate estimated energy use, rather than requiring manually supplied calories burned. Support favourite activities. Avoid double-counting exercise and steps.
- **Diary:** Recorded intake appears as a straightforward chronological list. No compulsory breakfast/lunch/dinner categories or meal times. Historical entries can be corrected.

Steps must be obtained automatically from a compatible Android source (planned Health Connect), with **no manual step-entry screen** and no accessory requirement.

## 4. Approved food library

The app’s own Food Item library starts **EMPTY**. There is **no generic starter database, canned food list, bulk population, or automatic importing**. Only individually reviewed and explicitly approved records enter the shared library.

Food search is typeahead: matching approved records appear first, while external reference results remain visibly identified. **NZ Food Composition Database** is the primary reference for unbranded/general foods. The app can read the official **FOODfiles 2024 Standard DATA.AP** data locally and keep the searchable reference separate from the approved library. The downloadable 2024 data may be older than the current NZ website search; do not claim otherwise. If supported direct online NZ searching becomes available, it may replace the manual reference import without changing the approval rules. The app also supports entering or scanning a packaged-food barcode. Where public barcode data is used (currently Open Food Facts), label its source, availability, and uncertainty. FoodSwitch/GS1 catalogues must not be treated as freely accessible without confirmed permissions.

Selecting any external suggestion opens an editable review form. **Only explicit approval saves an item** to the shared library. Provide source information, allow manually entering a specific Food Item, and never silently populate the library or replace NZ name-search data with a different provider.

Every approved Food Item must have **calories, protein, carbohydrates, fats, and fibre**, normally per **100 g or 100 mL**. Missing figures require a reasonable, identified estimate rather than omission or an unlabelled zero. Store optional brand, barcode, original source, and per-value estimation/source status. Support editable, item-specific conversions for familiar units (slice, egg, cup, etc.); these are quantities of the same item, not separate database items. When recording, offer the **last five used quantities/units** plus a new quantity, as with water.

Approved Food Item changes affect future entries and recipes. A diary entry retains a **small snapshot of its recorded nutritional values**; old records need not be recalculated following a minor library correction unless the historical entry itself is edited. Daily totals can be cached for efficiency.

## 5. Dishes and Meals

Three searchable, independently favouriteable levels: **Food Item → Dish → Meal**. Any level may be recorded directly. Dishes can contain Food Items or other Dishes; Meals can contain Food Items, Dishes, or other Meals. Prevent circular references.

A saved Dish/Meal has defined ingredient quantities. Users can add, omit, scale, or explicitly substitute components; do **not** impose automatic substitution rules. Calculate total Dish weight from ingredient quantities. A changed combination can be saved as a separately named variation, **linked to its parent by default**, so relevant later source edits flow through. Users can deliberately sever that link. Editing one recorded instance does not alter a shared template. New diary entries default to the saved recipe quantities, not the last recorded adjustment.

## 6. Calorie budget and trends

Initially calculate a **maintenance-calorie range** for current body weight, using an evidence-based resting-expenditure estimate plus tracked movement and exercise. Refine estimates cautiously over time from recorded intake and smoothed longer-term weight changes. Do not overfit normal weight fluctuations or presume an incomplete food diary is complete. Show uncertainty where it matters. The budget is calculated, **not manually overridden**.

Weight-loss targets, rates, target dates, and transitions can be developed later; values in the current sample charts are **fictional demonstrations**, not adopted personal targets.

## 7. Accounts, storage, and delivery

Use **Google sign-in and Firebase** with separate private personal records for the two users and a shared approved Food Item/Dish/Meal library. Entries must work offline and sync when connected, without losing unsynced records. Provide export and **automatic recoverable off-device historical backups**, separate from normal live synchronisation, with almost no ongoing administration. Validate the actual no-cost backup approach before adopting it.

Keep the GitHub Pages build lightweight, with vanilla HTML/CSS/JavaScript and a manifest. Later, package as a signed Android app where necessary for automatic steps; test Health Connect on the intended Xiaomi phones **early**, not after the rest of development. Preserve device and account security and minimise permissions.

## 8. Prototype status and next work

**Working prototype:** The approved PWA visual design, interactive eight-band graph, touch gestures, weight/water controls, and fictional demonstration history are retained. The Food Item library starts empty, searches approved foods, accepts a separate official NZ FOODfiles reference file for on-device typeahead, offers manual or supported camera barcode lookup with an explicitly identified Open Food Facts fallback, and requires an editable review and approval before storing an item. The search results region keeps a fixed height. The imported reference is held in browser IndexedDB when permitted; **approved** items are still stored in browser localStorage only. No reference foods are bundled as approved records.

**Not yet production-ready:** Real shared Firebase food library and sign-in, reliable synchronisation/backups, full Food/Dish/Meal recording, nutrient-source gap research, exercise, Health Connect steps, and adaptive calorie modelling. Food records cannot be treated as recoverable until secure, account-linked persistence and backups are implemented. Barcode access and device camera support still require testing on the intended phones. The current NZ file-based lookup is not the August 2026 online search dataset.

**Next focus:** Verify NZ reference import with the actual 2024 release and barcode behaviour on device, then implement secure, shared persistence before the real food diary. Keep the approved UI unchanged unless requested.
