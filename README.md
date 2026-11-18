# Jules Berne’s Pie Chart — v0.1.052

**Change-only patch over v0.1.051.** Replace these **three files** in your existing GitHub Pages repository; keep all other files unchanged:

- `index.html` — The large right-hand Fats and Carbs values now use whole grams and have no space before `g` (for example, `74g` rather than `74.25 g`). Both signed-in and sample views use the same format. Underlying nutrient data, food-entry precision, and calculations are unchanged.
- `PROJECT_SPEC.md` — Current specification reflects the display rule and release version.
- `README.md` — These patch instructions.

Keep the existing `piechart-db.js`, `calorie-budget.js`, `firebase-config.js`, and all other files; no Firebase changes or migrations. `index.html` continues to request the **unchanged** `piechart-db.js?v=0.1.051` and `calorie-budget.js?v=0.1.050` because their contents did not change.

**Check:** After deploying and refreshing, show Fats and Carbs in the graph legend: labels should read, for example, `74g` and `230g`. Food review/edit values should still permit up to two decimal places.
