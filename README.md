# PieChart v0.1.054 — chart, search, and field interactions (delta patch)

**Install over v0.1.053.** Replace only `index.html`, `PROJECT_SPEC.md`, and `README.md`. Keep all other files, especially `piechart-db.js` (still version 0.1.053), `calorie-budget.js`, `dummy-data.csv`, `firebase-config.js`, and the existing three bundled reference datasets. No Firebase rule or schema changes are needed. Do not apply this web update to the separate Android companion repository.

## Changes

- Each graph metric independently switches from CSV sample history to private recordings. A backdated Activity no longer hides the unrelated Food, Water, Weight, or Steps sample readings. Real private data takes precedence for its own metric.
- Every band now plots through **today** on the same timeline. Today can be incomplete; a missing measurement stays blank rather than being fabricated.
- All text and numeric fields in entry sheets select current contents on focus. Finger drag vertically on numeric fields to adjust: upwards increases, downwards decreases, with field-specific increments and acceleration. Tap-to-type is unchanged; the horizontal Weight ruler retains its own controls.
- Before typing in the shared Food Library search, show only favourite and recently saved/edited/recorded library items (Food Items, Dishes, and Meals), plus the two recipe-creation actions. Food Items now also have a Favourite checkbox.
- Saving a Food Item, Dish, or Meal from the library returns to an empty, focused search; saving an ingredient from inside a draft recipe instead returns to that unfinished recipe and inserts the item.
- Open Food Facts barcode requests now prefer its English product name. When the source language is not English and no English name exists, the review form uses a barcode placeholder and clearly asks for a checked name, rather than treating a foreign-language name as suitable for the library. Barcode data remains manually reviewed.

## Barcode providers reviewed

- **Currently integrated:** Open Food Facts live barcode lookup, free/public and multilingual but crowdsourced; label review is essential.
- **Possible future source:** FoodSwitch (NZ/Australia branded records); programmatic access/licensing needs verification.
- **Possible supplementary source:** USDA FoodData Central Branded Foods API, with GTIN/UPC and API key, US-centric; require exact barcode equality on results.
- **Not currently usable as a free live source:** FSANZ Australian Branded Food Database (not public). The bundled AFCD, NZ Concise, and USDA Foundation indexes are **name searches**, not a second barcode provider.

Local headless-browser tests of the navigation, source-data handover, today-ended graph, focus, and swipe behaviour passed using a mocked private Firestore state. Live-phone/Firebase validation is still required. No APK was built or changed by this patch.
