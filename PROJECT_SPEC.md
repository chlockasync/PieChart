> **CURRENT DESIGN STATE (17 November 2026):** Refer to the latest v0.1.018 section at the end of this document. Older dated sections record superseded prototypes and are retained for historical context only. In particular, the current app has **no multi-day aggregation**, no period selector, a 100-day initial view, all eight metrics on, and separate vertical series bands, with the same upright chart in portrait and landscape.

# Joules Burn's Pie Chart (PieChart) — Living project specification

## CURRENT UI DIRECTION — v0.1.012 (supersedes earlier portrait and today-column experiments)

**Authoritative current decisions:** User explicitly rejected revisiting the old seven-day, four-series portrait redesign. Portrait must use the **same active series, same date span, and same upright graph and left-to-right timeline** as landscape, with metric labels on the right. The earlier rotated portrait timeline was explicitly abandoned. Do not add portrait-only summary panels or a new portrait dashboard.

- **Both orientations:** Landscape keeps the wide graph with compact readouts at right. In portrait the same upright graph is adapted to narrower width, with metric labels on the right. Swipe horizontally to adjust the visible history in either orientation. Adjust text orientation separately. PWA manifest requests `fullscreen` and `orientation: any` so Android orientation is **not locked**. A regular ChatGPT/Chrome file preview cannot hide its host UI like an installed PWA.
- **Compact live readouts:** Remove wasted left/right gaps within metric labels. One line reads, e.g., `Water 52%`; a coloured rule is the continuation of the last completed measurement; the line underneath reads, e.g., `1.3 of 2.5 litres`. Steps, calories, protein, and fibre show comparable progress towards their goals. For weight, display actual weight and target rather than a misleading percentage; carbs and fats have no invented targets. Preserve existing PieChart palette. The visibility eye, double-tap recording, and hold-to-reorder remain.
- **Last completed day meets live readouts:** Do not place a wide, mostly empty Today/partial-data column between yesterday's final measurement and today's status. The plotted historical series end at the latest completed day, immediately beside live readouts showing today's value and goal progress. The partial current day is not graphed as if it were a completed day. Exact daily data remain in the demo CSV, and later the production log.
- **Weight ribbon correction:** Keep actual weighed circles and a seven-calendar-day rolling actual-high/low envelope based on the full history including measurements before the visible interval. Ensure the interior of the closed high/low boundary path really fills, and that the high and low boundaries stay smooth rather than drawn as a staircase. A previous implementation's reversed boundary path was accidentally skipped and caused missing fill; this has been corrected. Missing weigh-ins must never be fabricated. Seven days remains an experimental window length.
- **Current status:** This is a visual/interaction prototype with sample data. No Health Connect, Firebase, recoverable backup, production nutrition library, or permanent diary records. Portrait gesture behaviour and layout must be tested on Xiaomi phones; browser-based verification may not match touch input.

---


**Status:** requirements agreed in discussion, not all implemented. **Prototype:** v0.1.010 landscape-only chart with dynamically separated vertical ranges and a right-side metric stack. Update this specification alongside each significant decision and each release. Do not infer that visible concept-art elements not expressly accepted are requirements.

## Purpose and release approach

A cost-free, phone-first replacement for the practical tracking functions of Noom: intake, calories and nutritional breakdown, daily maintenance budget, automatic steps, weight, exercise, history, and trends. No education, coaching, or psychological advice programme.

First develop responsive HTML/CSS/vanilla JS and iterate via GitHub Pages as with ListsForTheShop. Later package the same interface as a signed Android APK with native Health Connect integration. Test an early APK to verify automatic steps on the two Xiaomi Redmi Android phones; do not defer that technical risk to the end. No manual step counting. Minimise permissions, protect Google accounts, retain standard Android device security, and make installation/updates safe.

## Data and account management

Use Firebase with Google Sign-In, private user profiles/logs and a shared library for the two users. Offline input must work with locally cached data; sync when connection resumes. Cache selectively to keep storage and RAM low; never evict unsynced entries. Maintain **automatic off-phone historical, recoverable backups**, distinct from live syncing, with virtually no administration required. Verify a genuinely free and practical implementation before finalising the backup architecture. Data export required.

## Food item / Dish / Meal library

Three distinct independently favouriteable levels: **Food Item**, **Dish**, **Meal**. Each may be directly recorded. Dishes may contain food items and other dishes; meals may contain food items, dishes and other meals. All three levels shared across the couple. Nested composition needs circular-reference protection.

Add food data *only when needed*, not bulk imported. Search existing internal database first; then one-off external lookup (generic data, NZ products, and barcode during database entry), present proposed nutritional record and source for **approve or edit** before saving. Once saved, reuse internal data instead of fetching externally again, and cache for offline availability. Shared canonical food edits propagate through dependent dishes/meals for future use. Historical diary records preserve original nutritional snapshots.

Base dish/meal plus independently selectable additions, removals, ingredient quantities, substitutions (explicit edits, **no exclusive/automatic replacement rule**), or overall weight scaling. Total dish weight calculated from sum of ingredient quantities (not an independently entered cooked weight). **Save Combination** makes an independently named and searchable saved dish/meal derived from the source, linked by default so inherited updates propagate, with explicit option to **sever parent connection**. Editing a logged instance never changes the shared template. Logging defaults to saved recipe quantities, not last logged quantities.

## Daily records / activity / weight

**The landscape graph is the home screen.** A Record action (to design; not yet present in this first visual screenshot reference) opens a dedicated entry screen. Weight and Exercise buttons are above type-ahead food search. Search ranks relevant favourite meals, other meals, and food items. Recordings are a **plain list in the order recorded**, no breakfast/lunch/dinner/snack categories and no eating-time requirement. Water is recorded as a favourite food item.

Weight screen: date, days since last entry, previous recorded weight, scrolling new-weight input starting at previous weight, Record action; precision **0.01 kg**. This is an entry screen, not graph/reporting. Historical weight corrections/deletions through history. Weighing encouraged daily but often irregular; trends must handle missing days and natural noise.

Exercise: choose type, time/duration, and where relevant intensity. Estimate calorie expenditure automatically via established references and body weight, no manual calories-burned field. Allow favourite activities with default duration/intensity. Avoid counting the same steps/exercise twice. Overall expenditure estimates may calibrate against long-term intake/weight evidence but cannot accurately attribute every discrepancy to one specific exercise.

Steps counted automatically on device via Health Connect-compatible Android integration; no hardware accessories and **no manual step entry**. Steps displayed as part of graph, not separate dashboard or distance/calorie readouts.

## Calorie model

First phase: **maintenance range for current body weight**, sedentary baseline plus recorded daily movement and exercise. Initially Mifflin–St Jeor or another well-supported equation for resting expenditure; actual expenditure estimates improve with recorded intake, activity, and smoothed longer-term weight trend. Weight changes are noisy and irregular, confidence should be explicit and avoid overfitting or assuming incomplete food logs equal actual low intake. Calculate budget automatically, **no user override**. Weight-loss goals, target dates, rates, and transitions deliberately postponed; the graph concept art contains a target weight as future-state dummy data.

## Graph and visual design

Landscape-first, soft rounded friendly palette in spirit of later ListsForTheShop design. **The home screen IS the graph**. The original chosen visual reference, supplied in the conversation 16 Nov 2026, had a compact Joules Burn's Pie Chart (PieChart)/logo/date-range/Today/settings header, graph filling the main area, and one bottom row of pastel metric cells. Subsequent agreed revisions replace that bottom row with a right-hand vertical stack; see below. No added sidebars, dashboard cards, second data rows, reporting panels, or bulky controls. Graph can display raw points/lines, smooth trends and historical comparisons, and eventually scenario projections; keep first HTML pass faithful to selected image.

Graph variables requested: weight and target weight; calorie budget and consumed; protein, carbs, fats; steps and step goal; water and water goal. Different units must be scaled coherently on the same graph while preserving true values on labels/inspection; user's concern is that a shared percentage-of-target axis may crowd all lines near 100%, so **test with realistic dummy data before choosing a refined approach**. Supports trends, smoothing, ranges, optional relationships/forecasts in later versions. No separate large reporting cards. Current intake and remaining budget should be identifiable within home graph layout without reducing graph space.

## This prototype (v0.1.001)

Only the chosen landscape header, responsive SVG graph and one row of seven metric cells are implemented. Fictional 150-day dataset, default last 30 days, adjustable date range, swipe-free previous/next date navigation, Today return, metric visibility toggles and tap tooltip. Percentage scaling is implemented as each metric / own goal, a transparent test of near-100% overlap. The existing concept's weight band at ~30% cannot be represented honestly on that common goal axis; the prototype prioritises meaningful relative values over mimicking that misleading artificial offset. No recording, Firebase, Android integration, backup, barcode, or sign-in is implemented at this prototype stage.

## Portrait design experiment (v0.1.002)

The user asked to test a **portrait variant** of the selected home-screen graph. In portrait: show 7 days, hide Protein/Carbs/Fats completely, and retain only Weight, Calories, Steps, and Water as the sole bottom metric row. Preserve the original seven-series landscape graph when rotated. No additional dashboards, cards or navigation were requested. This is an experiment, not a replacement of the landscape-first design decision.

## Overlay axes experiment (v0.1.003)

The user requested independent, overlaid Y-axis ranges: all daily series share dates but use separate linear scales, fitted to the currently visible data **and each applicable target**. Do not use common percentage-of-goal/zero alignment. In landscape all seven metrics appear over 30 days initially; in portrait only Weight, Calories, Steps and Water appear over seven days, with the same header and single row of original metric cells. Each metric shows its own matching coloured dashed goal or budget only where requested (Weight, Calories, Steps, Water). No extra cards, navigation or dashboard panels. The focused axis alone has numeric tick labels in its own units, and touching a coloured line changes which axis is labelled; touch tooltip keeps real figures. Other plotted line positions are not numerically comparable across metrics. Auto-fit on each viewed interval is a deliberate visual experiment; axis range changes on date navigation can affect visual comparisons, which we should evaluate with the user. A distant target weight can compress weight variations, because both are included in the same honest linear scale.

## Smart vertical separation (v0.1.004)

In response to the user's original chart illustrating deliberate rescaling (blue band low, orange centre, purple top), the user rejected independently full-height overlaid scales because they put every line on top of every other. Trial a **single graph whose metrics each have an independently scaled and offset plot band**, allocated automatically. Preserve one shared date X-axis, clean graph-centric homepage, small original header and bottom metric row only. Preserve portrait 7-day four-series and landscape 30-day seven-series rules. Each series' actual data and goals remain in native units; positions across different metrics have no numerical significance. Algorithm fits raw observations and goal lines into visual bands with whitespace between smoothed trends, automatically allocates slightly more height to more-variable datasets, permits faint raw excursions to overlap, and does not start from zero; show pale raw observations + bold smoothed trend, just like user's graph. Goal/budget lines faint matching dashed. Tooltip and metrics show actual values. All data dummy; placement is an exploratory visual treatment to discuss with user, not confirmed final choice. No cards or extra navigation.

## Daily-width marks + weight ribbon (v0.1.005, trial)

User's clarified chart drawing requirements: **weight** uses joined rolling high/low bounds, a shaded band between the bounds, AND the true individual weight readings (do not interpolate missing measured weights). **Steps** has a goal line and day-wide horizontal reading marks. **Water** has goal line and day-wide horizontal marks. **Calories** has a variable budget-range band and day-wide horizontal daily readings. Each daily mark has same-colour translucent shading fading *downwards* from the mark; no joined daily polylines. Optional nutrients protein/carbs/fats/**fibre** may be toggled on, showing their readings without imposing targets. Vertical scaling and offsets are independent and softly positioned for core trend separation, with some permitted overlap. Do not imply an absolute relationship between vertical positions of different metrics. The visual prototype retains the exact prior header, one full-size graph and a single row of pastel metric buttons; no added panels. Portrait initially shows only 7 days and four core metrics, landscape default 30 days and four core metrics (optional nutrients off at first). This is an experimental implementation, not a final display decision. Dummy budget high/low and fibre values added to sample data; no real data / recording / steps yet.


## Landscape-only layout and graph updates (v0.1.006–v0.1.007)

Portrait work is suspended for now by explicit user decision. The graph remains the home screen with only a compact heading and controls; **no dashboard tiles, extra panels, or bottom metric row**.

- Right-hand metric controls in exact order: **Steps, Water, Weight, Calories, Protein, Fibre, Carbs, Fats**. Initial visible set is the four core metrics; nutrients optional, not included initially. Buttons toggle both graph and their own selection state.
- The graph's vertical positions and per-metric native-unit scales **recompute based on which metrics are selected**, in right-hand control order. One selected metric is centred. Multiple selected metrics share available height with mostly distinct core bands and some soft overlap; heights between different metrics are not directly comparable.
- Daily readings appear as **contiguous, full-day-width horizontal colour marks** whose stroke does not exceed the corresponding day column/fading fill. Remove vertical date grid lines; keep horizontal reference lines and an explicitly labelled left axis for the currently focused metric.
- Weight is displayed as actual recorded weigh-ins (no invented missing readings), plus a shaded high/low envelope. Calories show recorded values plus a shaded automatically calculated maintenance budget range. Steps and water show their goals and recorded daily values. Optional nutrient series show values only for now.
- The **current day's daily mark is still developing**. Indicate this with a subtly tinted last-day column, a broken/lighter current-day mark, a Today tick, and an 'In progress' date tooltip. The user's actual individual weight reading, once made, remains a measured entry.
- Date selector has **no forward/back arrows**. Periods are Last 7, 30, 60, 90 Days; Last 6 Months; Last Year; Last 2, 3, 5 Years; All History. Windows end today. The redundant Today navigation button was omitted in this experiment because every period already ends today.
- For windows **up to 90 days**, plot actual daily records. For longer windows, group completed days into 3-, 7-, 14-, or 28-day periods to preserve legibility, with true date-relative column widths; show clear 'Average over N days' inspection labels. Grouped weight readings are averages of actual weigh-ins only, labelled accordingly; today's partial day remains separately recorded and never averaged into completed days. Large-span display details remain experimental.
- Dummy data now spans ~3.2 years with plausible long-run variations: calorie budget varies relatively smoothly, step-based adjustments remain modest, measured weights are intermittent and noisy, and per-day energy from macros/fibre reconciles exactly with logged calories (4 kcal/g protein and carbohydrate, 9 kcal/g fat, 2 kcal/g fibre as a model simplification). Calories consumed can still vary day-to-day. Today's intake, water, steps, and nutrients are partial amounts while its full-day budget remains visible.
- All data are fictional. This prototype intentionally does **not** implement real data entry, Health Connect, Google login, Firebase, automatic backups, or nutritional lookups. The selected approach to plotting remains subject to user review.


## v0.1.008 — renamed PieChart, range and axis refinement (landscape only)

App's *full visible name*: **Joules Burn's Pie Chart**. All published ZIP and source file names use **PieChart**. Continue versioning `YYYYMMDDHHMM-v#.#.###-PieChart-update-descriptor.zip` in NZ local time.

- The right controls are **Steps, Water, Weight, Calories, Protein, Fibre, Carbs, Fats**. Nutrients are optional and initially off. Targets **Protein 125 g/day** and **Fibre 30 g/day** are **fictional placeholder goals for the prototype**, not final personal recommendations, and appear as native-scale dashed lines when selected. Carbs/fats do not receive imposed goal lines yet.
- **Do not show a Today button.** Date picker still selects most recent 7, 30, 60, 90 days; 6 months; 1, 2, 3, 5 years; or all history.
- There is **no universal Y-axis**: each active series has an independent native-unit Y transform, so a shared numerical axis is misleading. The former three numeric left-side ticks and the 'Left scale' banner were removed entirely. Inspect real units by tapping a date; no mouse hover interaction.
- **Weight** is shown as actual horizontal daily weigh-in marks and a shaded envelope. Envelope bounds join actual *local maxima and minima* using the **two nearest recorded measurements on either side** as an experimental extremum neighbourhood. The band is anchored at the **left and right edges of the measured day columns**, NOT at centres, with no fabricated missing weigh-ins. Need a further design discussion about the preferred neighbourhood and treatment of extrema: **not finalized**. Long-view grouped periods use recorded measured min/max within each aggregate bucket.
- **Steps/Water/Protein/Fibre** when visible have their own dashed goal lines. **Calories** retain their budget-range ribbon. Day-wide marks with downward fade remain; the fade was shortened to approximately **20% of its previous length**.
- **Today** is visibly incomplete, its column approximately **2.25–2.4 times the width of an ordinary plotted column**, its marks are dashed/fainter, and its column has a faint dashed boundary. For grouped long periods, today's larger visual width is deliberately illustrative and not an exact equal-duration time axis.
- The **right-hand statistic pills attempt to follow the current record's line height**, with collision avoidance so visible/off controls remain accessible in the constrained screen height. Exact correspondence may be limited when many buttons are visible; continue iterating using live phone feedback.
- Demo calories now vary primarily in longer-duration waves with smaller day-to-day noise. Macronutrient/fibre energies reconcile exactly to the calorie totals (4 kcal/g protein, 4 carbs, 9 fat, 2 fibre simplification); recorded weight is noisy and sometimes missing, and today's intake/steps/water are partial. Demo history ~3.2 years. No real food, medical, exercise, Android, or Firebase integration in this prototype.


## Visual / interaction decisions for v0.1.009 (2026-11-16)

**Reference:** latest hand-drawn daily-band chart and v0.1.008 colour palette. The sketch's purple/blue/yellow/orange colours do NOT replace the existing app palette; preserve existing series-specific colours.

- **Landscape-first full-screen:** The installed app should open in landscape and use the full screen. Manifest `display: fullscreen`, `orientation: landscape`. A normal GitHub Pages browser tab cannot force fullscreen or orientation on load; the web prototype attempts fullscreen and orientation lock on its first supported touchscreen user gesture. Native Android package can set orientation and immersive mode at launch. No new full-screen UI button or dashboard added.
- **Right-side labels are controls:** Tap once to show/hide the associated graph series. Double-tap Water to open the water recording screen. Double-tap Weight to open weight recording. Double-tap Calories, Protein, Fibre, Carbs, or Fats to open the shared Food Item / Dish / Meal search-and-record flow; this may also include water. Steps remain automatically recorded, so no manual Steps input.
- **Reorder:** A sustained ~900 ms long-long press followed by a vertical drag reorders the right-hand metric labels AND their corresponding preferred vertical graph bands. Save metric order locally across reloads. One active series stays centred and visible series expand vertically as previously specified.
- **Weight envelope:** A 7-calendar-day-centred window of *actual* recorded weights identifies local highs and lows; boundaries connect the end edges of the selected daily observations. Shading fills the interval. The window remains a tunable provisional parameter, not a moving average. Missing weight data remains missing.
- **Demo forms only in v0.1.009:** Entry sheets are deliberately limited to proof-of-interaction. Water and weight can update the displayed demo day; food search uses a tiny fictional demonstration library and records macros/calories into today's demo values. These changes are not yet persistent or synced. The full food library, editable nested dishes/meals, proper weight scroll wheel, Firebase sync/backup, and Health Connect are still requirements for real development and are NOT built yet.
- **Prototypes only:** The design and interaction work has not yet validated on physical Xiaomi devices; browser fullscreen/orientation support varies. Continue to preserve the primary chart layout with a single right-hand metric stack and no extraneous panels.


## Landscape interactions and value-anchored labels (v0.1.010 — 16 November 2026)

These user changes supersede the v0.1.009 implementation details where they differ, without changing the agreed colour palette, core graph-first home layout, or the food/weight/step/backups architecture:

- **Use the user's latest line-extension reference** (illustrated in their 16 Nov sketch): labels directly continue the corresponding latest-day reading via a **matching coloured horizontal top rule and downward-fading fill**. Do not show them as floating, evenly spaced rounded pills. Keep the same colours as the existing app, not the hand-drawn sketch's colours. Positions follow the actual plotted value whenever collision-free, with collision avoidance when necessary. Hidden series are accessible through one compact explicit `+ N hidden` control, rather than displacing the active labels from their plotted lines. Optional display controls remain intentionally minimal.
- **Weight envelope must open at the left edge**, not visibly pinch or close because the selected history begins. Look beyond the visible date range at real measured weights; calculate high/low values from a provisional **seven-calendar-day-centred window**, and extend the upper/lower boundary paths beyond the clip edge. Shading only between upper and lower bounds; preserve actual weigh-ins as individual marks. The 7-day extremum window remains a trial parameter; historical data may be missing and must never be fabricated. On long grouped views, grouped measurements have defined min/max based on recorded measurements.
- **Weight entry is an inertial wheel**, not an ordinary number spinner. Provide separate vertically draggable/scrolled whole-kilogram and hundredth-kilogram wheels, both beginning at the previously recorded weight, preserving **0.01 kg**. Faster flicks carry further via momentum. Weight entry shows current date, days since previous record, and previous recorded weight. The graph remains separate from this entry screen.
- **Water entry** shows the five most recently used water amounts for **single-tap record**, plus a sixth **New amount** option. Remember actual later choices, de-duplicate entries, keep most recent five; the prototype seeds illustrative demo recents until actual amounts have been recorded. This is still a local demonstration, not backed up or synchronised yet.
- **Reorder metric bands:** Long-press a metric label (~620 ms in this prototype), then drag it vertically. Dropping computes insertion relative to **visible labels only**, not hidden zero-height entries; preserve hidden labels' relative order. Order persists locally. Each plotted series uses a preferred vertical position derived from that order. Full portrait version is out of scope for now.
- **Avoid accidental visibility toggles:** Plain single-tap on the label does nothing. A small explicit eye control hides a visible metric. To restore hidden series, tap `+ N hidden` and select it. Double-tap Water opens Water; double-tap Weight opens Weight; double-tap Calories, Protein, Fibre, Carbs or Fats opens food search/record. No manual steps form.
- **Remove the period selector entirely.** The date readout is non-interactive. Drag/swipe the chart **from left to right** to expand how much earlier history is displayed, or **from right to left** to reduce the visible date span, anchored on today. Start with 30 days; clamp from 7 days to all available history. In the prototype, the new range is committed on gesture completion, to avoid browser pointer-capture interruption. Longer spans still summarise completed dates into appropriately labelled multi-day means; today remains incomplete and separate.
- **Rendering:** A day-wide horizontal coloured mark and a very short downward fade for daily steps, water, calories, and optional nutrient values; weight retains true measured marks and the band. Targets for Steps, Water, Protein, Fibre; budget range for Calories; separate weight target. In-progress today's data are explicitly incomplete, and its day column remains wider.
- **State of prototype:** All history, weight, food, and water values are fictional or locally amended for demonstration. Only demo-day values and recent-water favourites change in browser memory/storage. There is still no real Firebase sync, off-phone backup, Health Connect, Google authentication, or production food library. Browser screenshots and simulated pointer gestures have been checked; physical touchscreen UX on Xiaomi has **not** been verified. Installed PWA manifest requests `fullscreen` and `landscape`, subject to Android installation/browser support.

## Current landscape graph corrections (v0.1.011 — 16 November 2026)

The following **supersedes conflicting prototype details** above. Keep all previously agreed non-graph requirements intact.

- **No period control or readout in the header.** The static 'Last 30 days' text was also removed. Direct horizontal swipe is the only date-range control in this prototype, initially showing 30 days. As a swipe progresses, the **date labels themselves redraw live to show the historical span being revealed or contracted**. The plotted series may remain unchanged until release; on release it redraws for the selected range. Swipe right increases history; swipe left returns towards today. For very long histories, completed days aggregate into multi-day mean markers with honest tooltip descriptions. No grey shaded full-height Today block.
- **Today is unfinished**, so its lower partial totals must **not** be positioned far beneath comparable completed-day values or used to widen Y-axis ranges. The current-day data marks appear **at yesterday's most recent completed value height**, with a partly filled horizontal stroke representing progress; the actual current values and target-percentage appear in the right-side readouts. Today is still visually wider than a historical day. Do not mistake the provisional marker position for a claim that today's total equals yesterday's. For missing weigh-ins, use the last actual measurement as the reference.
- Right-side labels use the **same Y-coordinate as their corresponding completed reference marks**, with a horizontal coloured top border and the recorded numerical figure immediately **above** the border. The goal/budget and percentage-fulfilled text appears underneath in the fading region. No floating rounded card. Colours remain those already established in PieChart, not those from the user's sketch. The user may still request more exact alignment if the phone render differs.
- **Weight readings are actual circular dots again** (never daily dashes). Never display a grouped/multi-day *average* as if it were an actual weigh-in. The shaded rolling high/low envelope uses a **seven-calendar-day window** of real recorded measurements, including history before the viewport. Upper/lower limits are joined with smooth monotone cubic curves that pass through local daily extrema without introducing spline overshoot; the shaded region is clipped at the plot boundaries, with its left-hand closure deliberately beyond the visible canvas. The window width remains experimental and adjustable in code, not user-set yet.
- **Weight entry is ONE horizontal speed-sensitive slider/ruler**, not two vertical wheels. It starts at the last entry, uses genuine 0.01 kg steps for slow swipes, increases displacement nonlinearly for faster movement, and has momentum after release. Vaguely traditional analogue scale styling with major ticks and a central indicator. The reading and the 0.01 kg recording precision are always maintained. Real Xiaomi touch behaviour must still be tested.
- No mouse-over as primary interaction. Tapping may inspect a date. Long-press metric labels to reorder both labels and series vertical positions; a small explicit visibility control prevents accidental hide/show. Double-tap Water, Weight, and Calories/nutrients opens their respective demo entry forms, as previously agreed.
- **Editable dummy data:** Separate `dummy-data.csv` contains one dated row per day for 1,160 dates and all 18 required columns, with blank weight cells for missing weigh-ins, and `partial=true` for the last date. The GitHub Pages app loads the CSV at start (no repeated online nutrition lookups); the source HTML also includes generated fallback demo data to remain self-contained. For immediate local testing use the existing settings gear to import a CSV; on hosted pages this import can be stored locally until reset. Editing the CSV alone is insufficient when there is a local import override; use 'Use bundled data' to reset to the newly uploaded file. No Firebase data persistence or actual user data yet.
- **Scope:** Landscape-only HTML visualization and demonstration record screens; it does not yet perform real Health Connect step counting, Firebase authentication, online backup, or a production food/recipe library. Installed PWA manifest continues to request automatic landscape fullscreen from its home-screen icon, while opening ordinary tab will still follow browser security restrictions.


## v0.1.013 — portrait orientation decision (2026-11-16)
- Abandon the rotated portrait timeline from v0.1.012.
- Keep the **same upright, left-to-right graph** in portrait and landscape, with time on the horizontal axis and live data labels to the right. Adapt only to available portrait width.
- Do **not** restore the old separate seven-day/four-metric portrait design; keep current series/selection and date-swipe model in both orientations.
- In both orientations, long-press label sorting is vertical and timeline swipe is horizontal.


## v0.1.015 — fictional historical demo data (17 November 2026)
- This is **fictional demo history only**, not Noom export or the user's personal data. No UI/layout/interaction changes intended.
- 1,160 daily entries, through 2026-11-17 (the final row is marked partial). The latest recorded weigh-in is 64.60 kg, with a gradual noisy change from 70.00 kg across three years; target weight 60 kg.
- Step goal 10,000; all days over 5,000, most near 10,000, and occasional 13,000–16,000.
- Water goal 2.0 litres; historical full days predominantly 1.9–2.5 L.
- Calories predominantly within the historical maintenance budget band, with occasional over/under days. Protein (125 g goal), fibre (30 g goal), fats, and carbs are fictional but consistent with calorie totals (4/4/9/2 coefficients).
- Dataset fields and CSV column structure unchanged. `dummy-data.csv` and the HTML fallback are exact matches.
- Previously imported CSV overrides stored in device localStorage can mask updated bundled data; the gear menu's **Use bundled data** action restores the packaged CSV.
- Default graph order remains Weight, Steps, Water, Calories, Fibre, Protein, Fats, Carbs, all initially visible, with 100-day initial view.


## v0.1.016 — Visual selection (17 Nov 2026)
- Chosen design: option 4 graph treatments (stronger coloured daily bars/fades, clear goal lines, light weight envelope), option 1 label treatment mirrored to RIGHT.
- Labels: each coloured vertical-edge label presents metric name, prominent percentage (when meaningful), actual intake, and target/budget. No invented goals for fats or carbs; weight percentage is percent of target weight, NOT weight-loss completion.
- Faint horizontal separators span the graph and right labels between visible series. All eight initially on; dynamically rearranged via existing interactions.
- Fix to the >90-day history grouping: aggregate ONLY the selected time window, not the entire archived dataset; when grouped, plot actual recorded weigh-ins.
- Keep same demo CSV, app shell, order, interactions, and responsive portrait/landscape layout.
- This remains a visual prototype for user evaluation.

## v0.1.018 graph styling trial (17 November 2026)
- Based on user's selected option 4 chart styling and option 1 label styling on the RIGHT.
- All eight metrics remain visible by default and retain user-defined drag order.
- No multi-day aggregation: original daily readings at every timeline scale.
- Each active metric now occupies an independently scaled, explicitly bounded vertical plotting strip; columns, faded fills, goal lines, budget ribbon, and weight envelope clip within its own band. Thin full-width separators mark boundaries.
- Right-hand labels use white/transparent background, name/icon, large colour-coded percentage where a target exists, readable actuals and goal/budget, with a thin coloured stripe at far RIGHT. No invented targets for fat or carbohydrate intake.
- Current prototype retains the existing 7-day rolling measured weight high/low rule and plots actual weigh-in dots, now using smoothed paths through the centre of unchanged extrema runs. Weight target remains separate from scale.
- User-requested task is purely visual; original recording controls, timeline gesture, CSV import, and fullscreen PWA behaviour preserved.


## v0.1.019 — Reference fidelity
- Selected left-hand illustration in `image(7).png` is the pixel-level visual specification, not inspiration.
- All eight graphs have separate rows, fine high-opacity daily readings, a shorter saturated-to-transparent vertical fade, thin horizontal dividers, and narrow right readouts with a 4 px colour accent at the far right.
- No multi-day data summaries; show all daily records as given.
- Weight uses actual recorded dots with the 7-day measured high/low ribbon, and original out-of-view context.
- Default 100-day view, prior colour scheme, same user-chosen order, no newly invented fat/carb goals.

## Visual acceptance, 17 Nov 2026
- The **left-hand** image in the user's `image(7).png` is the styling reference, including fine vivid lines, short soft fades, clean separated rows, dense daily data, and a narrow integrated white label panel on the right.
- Template-style extra cards, chart summaries, coloured panel backgrounds, and introducing unrequested features are prohibited.
- Fats and Carbs still have no agreed daily targets; their large values display accurate grams rather than fictitious percentages used in concept artwork.
- All eight rows and all 100 individual days are drawn on initial load. Touch recording and graph reordering are retained.

## v0.1.020 — Clean visual-system rebuild (17 November 2026)
- Replaced the accumulated multi-version CSS (~43 KB) with one coherent ~9 KB stylesheet, retaining the existing interactive HTML/JS and recording functionality.
- Visual authority remains the selected concept art (left image in the user's comparison); a browser screenshot must be inspected before packaging. Portrait is the same graph and timeline orientation as landscape, not a distinct design.
- Keep eight independent non-overlapping chart rows in order Weight, Steps, Water, Calories, Fibre, Protein, Fats, Carbs, with dividing lines across the chart and legend and 4 px right-edge coloured strips.
- Right labels are vertically centred in their allocated rows, with dark metric titles, prominent coloured percentage where a valid goal exists, actual reading, and target or budget text. Fats and carbs show gram intake without invented percentages or targets.
- Retain individual daily records at every history span, with 100 days initially and all eight rows visible. No multi-day summaries.
- The 7-day rolling measured weight high/low envelope, circle measurements, and its source calculations are preserved verbatim from v0.1.019. Do not alter this without discussing it with the user.
- Other series use coloured day-wide caps over layered luminous tails: a separate soft continuous atmospheric field, graded individual plumes, and fine translucent vertical threads. Tails stay clipped within the same graph band.
- Goal and calorie-budget boundaries use a saturated dashed stroke with a wider translucent under-stroke, drawn above columns so the line is never obscured. Budget boundary rendering uses a small local visual smoothing of original budget values; underlying targets/CSV are unchanged.
- Colours and date gestures remain consistent. Installed PWA requests fullscreen and supports portrait and landscape; Chrome preview cannot hide its own controls.
- Version packaging remains YYYYMMDDHHMM-v#.#.###-PieChart-description.zip, NZ local time. ZIP root contains index.html, manifest.webmanifest, dummy-data.csv, icons, README, and PROJECT_SPEC.


## v0.1.021 — Date axis and ratio bars (17 November 2026)
- The full-width bottom axis continues across the chart and label panel to the frame edge. The latest completed date (yesterday in the current demo) appears at the far right.
- Historical ticks mark actual calendar month starts, not evenly spaced arbitrary intervals. When a long span is dragged into view (over ~450 days) the tick labels switch to years, anchored to 1 January. During touch swipes, calendar labels move immediately; data redraws when the gesture ends.
- The per-metric right-edge accent is now 12px instead of 4px. Its full-height background is a 30% mix of the metric colour and white; an opaque, metric-coloured foreground rises from the bottom to the target achievement percentage, capped at 100% visually. Numeric percentages may exceed 100%.
- No invented targets: Fats and Carbs show the muted colour strip without a foreground progress fill until a target is explicitly configured.
- The wider bars gain space by modestly expanding the right legend column and reducing the chart width. Chart series, weight envelope, demo data, gestures, labels, and independent daily readings are unchanged.
