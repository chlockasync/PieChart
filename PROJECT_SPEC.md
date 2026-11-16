# MyHealthTrack — Living project specification

**Status:** requirements agreed in discussion, not all implemented. **Prototype:** v0.1.007 landscape-only chart with dynamically separated vertical ranges and a right-side metric stack. Update this specification alongside each significant decision and each release. Do not infer that visible concept-art elements not expressly accepted are requirements.

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

Landscape-first, soft rounded friendly palette in spirit of later ListsForTheShop design. **The home screen IS the graph**. The original chosen visual reference, supplied in the conversation 16 Nov 2026, had a compact MyHealthTrack/logo/date-range/Today/settings header, graph filling the main area, and one bottom row of pastel metric cells. Subsequent agreed revisions replace that bottom row with a right-hand vertical stack; see below. No added sidebars, dashboard cards, second data rows, reporting panels, or bulky controls. Graph can display raw points/lines, smooth trends and historical comparisons, and eventually scenario projections; keep first HTML pass faithful to selected image.

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
