# Jules Berne’s Pie Chart — v0.1.049

**Change-only patch over v0.1.048.** Upload these **four files** into the same GitHub Pages repository paths, replacing the files of the same names, and keep every other file unchanged:

- `index.html` — displays the daily calorie aim in the signed-in Calories band and the completed-day graph.
- `calorie-budget.js` — **new** small, standalone calorie estimate calculator, loaded by `index.html`.
- `PROJECT_SPEC.md` — updated, authoritative current requirements and caveats.
- `README.md` — these upgrade notes.

**No Firebase rules, data migration, credentials, or settings changes.** Keep the existing and working `piechart-db.js` from v0.1.048; `index.html` intentionally retains `piechart-db.js?v=0.1.048` so the already-fixed Details & Targets validator is used. Ensure **all four files** are uploaded, particularly the *new* `calorie-budget.js`.

## What the initial calculation does

With a signed-in user's private actual weight recording, a weight target, birth date, height, and equation sex, the Calories chart displays **Aim x–y kcal/day**. Mifflin–St Jeor estimates resting expenditure, a provisional **×1.2 low-activity assumption** estimates maintenance (includes food processing), and the stored intensity applies a Gentle/Moderate/Strong goal adjustment. The range is a fixed **±150 kcal** before rounding and safety limits, independent of intensity; the adjustment tapers as the goal approaches. The personal weight budget recalculates when real weight or settings change. Public sample weights never generate the signed-in calorie budget.

**Important limitations:** Steps and non-step exercise are **not yet connected**. The resulting calorie range is a provisional *low-activity estimate*, not a measurement, guaranteed weight trajectory, or validated dynamic-weight model. The adjustment tiers are application defaults, not individually validated prescriptions. Adult-only BMI/intake guardrails suppress unsafe-looking loss targets; the app cannot yet screen for pregnancy, breastfeeding, medical conditions, or other special nutritional needs. Update the algorithm when actual activity tracking and longer-term calibration are available. Do not use the estimate as clinical dietary advice.

## Quick test after uploading

Sign in, enter Date of birth, Height, Sex, and a Weight goal under **Details & Targets**, and record a private weigh-in if none exists. The **Calories** row should show an **Aim** range; change Goal intensity to confirm the range shifts but normally stays the same width. On the chart, completed days **after** the first actual weigh-in show the estimated range; today's incomplete consumption does not create a plotted day. Sign out to confirm the demo chart remains separate. Check phone layout and live Firebase updates.

**Local verification:** Node tests covered the formula, age, goals, tier ordering, tapering, range width, and incomplete/unsafe states. A 390 px mobile Chromium test covered page integration, login-mode data separation, target updates, and intake readouts. Live Firebase/Android/Health Connect behaviour is unverified.
