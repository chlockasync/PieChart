# Jules Berne’s Pie Chart — v0.1.102

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

## Food Library display and Food Item editing

The shared Food/Dish/Meal library persists in the UI through unrelated Firebase
notifications. The last release had a local-view clearing regression; the shared
Firestore documents never needed reimporting. Favourites remain member-private.

Today's Food places recorded entries before search/scan, followed by private
favourites. Food Item review uses a combined brand-prefixed Food name, two inline
toggles, Barcode / Values per 100 selectors, and one cohesive five-card, colour-coded nutrient panel at every screen width. That
same panel also presents the calculated whole-recipe nutrient totals in both Dish
and Meal editors, with their weight and water totals underneath. Existing and
new Food Items use the same editable panel. The fibre estimate explanation sits
below the cards. Favourite checkboxes now share one consistent
style across Food, Dish, Meal, and Activity editors. The editable Source field is
removed; existing reference provenance is preserved internally. Legacy brand
metadata is read for display and folded into the visible name on save; no
Firestore migration is required.

## Nutrient-card and home-reading presentation

Food Items, Dishes, and Meals use the same five-card nutrient renderer, with equal
spacing, centred values, and thicker coloured top borders at all widths. The
editable Food Item inputs retain double-tap typing, hold-to-scrub, and energy
conversion. Display Cal values as whole numbers without changing the underlying
numeric precision. The Fibre Estimate action sits vertically centred beneath
its value inside the Fibre card, with no wasted row in the other cards.

The home-screen Calories, Fibre, and Protein readings display whole numbers;
stored measurements and calculations retain their original precision.

## Daily Food and Activity layout

Today's Food and Today's Activities now use the same Recorded → Search → Favourites
arrangement with shared spacing and consistent search-state hiding. The recorded
list has additional breathing room before the search field. The standalone Food
and Activity Libraries retain their regular search-first layout. In all three
Today's diaries (Food, Water, and Activities), recorded entries are shown oldest
to newest, including on past dates. This does not change storage or recent shortcuts.

## Water recording controls

Today's Water's New Amount action uses the same sticky action-row component as
other entry forms, keeping the purple Record amount button readable above the
phone keyboard. The Water shortcut uses the shared per-100 mL hydration rule
(including configured contributions below 100%) and leaves live chart
refreshes to Firestore's incremental history listener. Previously saved Water
entries remain unchanged. No database migration is required.

## Barcode selection and numeric field gestures

Scanning a barcode that uniquely identifies a saved Food Item opens that item immediately through the existing shared Food Library selection flow. No external product lookup is needed for an exact local match; ambiguous matches remain selectable from search results.

All numeric fields now require a double tap or double click to open the keyboard and type, while a brief stationary hold (190 ms) starts shared vertical scrubbing; swiping before activation still scrolls. Keyboard users can use Enter. Choosing **New amount** in Today's Water is an explicit exception: it focuses and selects the value immediately so the numeric keyboard is ready.

## Calculation and history corrections

Noom's missing individual nutrients never hide known values from later PieChart servings. Known partial values are displayed with a ≥ marker, while completely unrecorded nutrients remain missing. Open Food Facts no longer manufactures energy from macronutrients: the Food Item review requires the user to supply missing energy. New food and Water shortcuts retain a private unrounded `snapshotBasis` so repeated edits do not accumulate roundoff; older entries acquire that basis on their first edit. Duration-only and distance-only activities can estimate expenditure but do not fabricate recorded steps. Existing imported notes are preserved without invented duration, distance, steps, or kcal. Metadata-only Firestore events stay inert, and ordinary history changes update only affected in-memory rows and chart bands.

The 3,000-step budget baseline and other energy-model assumptions remain **unreviewed design decisions**; this patch does not change them. No private records or database rules need migrating.

## Activity creation and numeric forms

New Activities follow new Food Items: save the shared library definition first, then review an editable, prefilled Record form; only pressing Record creates a private diary entry. Cancel leaves the Activity saved without a new diary record. Editing existing library definitions does not automatically record them. Numeric fields relock on blur and after scrubbing; Escape first dismisses field focus rather than unintentionally closing the entire form.
