# Jules Berne’s Pie Chart — v0.1.050

**Change-only patch over v0.1.049.** Upload and replace these **four files only** in the GitHub Pages repository (keep all unchanged files and configured Firebase files):

- `index.html` — connects the updated calorie engine to the Calories chart and future private activity feed.
- `calorie-budget.js` — replaces v0.1.049's formula with the evidence-based, activity-ready daily calculation.
- `PROJECT_SPEC.md` — authoritative current methods, choices, boundaries, and work still outstanding.
- `README.md` — patch instructions and integration contract.

No Firebase rules, configuration, credentials, or data migrations. `index.html` deliberately still loads `piechart-db.js?v=0.1.048`, the working version of the saved-details validator.

## What changes in calculations

The **2023 National Academies adult EER equations** (as published by Health Canada) replace Mifflin–St Jeor ×1.2. These estimate *total* energy requirements, including activity of daily living and digestion. Calories are adjusted by your **Goal intensity**, without a target date or near-goal calorie/kg taper:

| Direction | Gentle | Moderate | Strong |
|---|---|---|---|
| Loss | 5–10% below maintenance | 10–15% below | 15–20% below |
| Gain | 2–5% above maintenance | 5–8% above | 8–11% above |
| At goal (±0.25 kg) | ±2.5% maintenance | ±2.5% | ±2.5% |

The *width* varies with the uncertainty and variability of activity. With **no private step data**, it spans an inactive-to-low-active EER scenario and remains prominently provisional. With at least three completed recent days, the calculator uses actual recorded activity from today plus a 21-day lookback to estimate the unknown remainder, not an input for planned activity. Once today's steps are marked complete, it stops extrapolating those steps. Previously recorded exercise is never added again today. The engine uses ACSM-inspired **net** walking energy above a 3,000-step reference and **net** MET activity expenditure; step-overlapping exercise is explicitly offset so it is not counted twice. The conversion thresholds, intensity bands, and flexible-width logic are product heuristics, **not individually validated predictions or statistical confidence intervals**.

**Safety:** Adult estimator age 19+. No automatic loss goal if actual/target BMI is below 18.5. If the calculated lower target would be below 1,200 kcal/day, display a review message instead of silently clipping the target. These rules are not personal clinical safety assessments; this app does not screen for pregnancy, breastfeeding, or medical conditions. No automatic calibration or NIH dynamic-weight model is claimed.

## Plugging in real activity later

The existing signed-in chart adapter reads optional private account-state arrays. The upcoming steps/exercise provider should deliver:

```js
state.stepDays = [
  { date: '2026-11-16', steps: 8500, complete: true },
  { date: '2026-11-18', steps: 3650, complete: false }
];
state.activityDays = [
  { date: '2026-11-18', minutes: 40, mets: 6.8, stepOverlap: false }, // cycling
  { date: '2026-11-18', minutes: 30, mets: 8, stepOverlap: true, stepsIncluded: 4000 } // running
];
```

A private step record is *not* a public CSV value. Missing days are unknown, **never zero**. Include `complete:true` only for a genuinely completed day; include step overlap information for exercises. If overlap is unknown, the engine omits that exercise rather than risk double-counting. The module can be tested directly in Node or the browser with `PieChartCalorieBudget.calculate({date,dateOfBirth,heightCm,sex,weightKg,goalWeightKg,goalIntensity,stepDays,activities,weightHistory,dayProgress})`.

The current `piechart-db.js` does **not** yet fetch or save these arrays. No new activity forms or permissions were introduced. Today’s visible range will therefore change to the new EER baseline immediately, but will only respond to steps once the actual private activity source is added.

## Smoke checks

After replacing the four files, sign in with your existing account and open **Details & Targets**. A private weight entry, date of birth, height, sex, and weight goal are required for a calculated calorie range; demo weights cannot supply them. Check Gentle, Moderate, and Strong; saved details and food records must remain unchanged. Make sure the Calories label now says a range based on the new equation. No steps should appear without actual private step records. Continue to test on your own devices.

**Local verification:** Node regression tests covered NASEM coefficients, age, all goal directions, partial/completed/historical step histories, exercise overlap, weight trend, and low-intake suppression; a mobile Chromium browser integration test covered private-data isolation, step-feed injection, input/display, and intensity changes. Live Firebase/Health Connect tests remain outstanding.
