# Jules Berne’s Pie Chart — v0.1.040

Phone-first nutrition, weight, water, and activity tracker for GitHub Pages. The two-member Firebase project is now configured, and the user has verified shared food-library synchronisation across phone and computer.

## Version 0.1.040 — private Weight, Water, and Targets

When **signed into an approved account**, Weight and Water recording now creates **private Firestore records** under that account. Daily water is the sum of actual drink records; a day with no recorded drinks is unknown rather than a false zero. Weight uses each actual weigh-in, with the most recent entry of the date determining the chart point. **Today's incomplete entries appear in the right-hand readouts, not as today's plotted graph column**; they become part of the plotted history tomorrow. Signed-in charts contain no invented values for other metrics. When signed out, the CSV-backed **fictional demo chart** remains available for interface testing.

**Settings → Personal targets** is one page for optional Weight (kg), Water (litres), Steps, Protein (g), and Fibre (g). Blank means no target. Targets are saved per account and synchronised between that person's devices, never the other member's account. Calories are still to be calculated rather than manually targeted, and no fat/carbohydrate targets are added.

The old temporary food-item snapshot no longer seeds either library. The two new live Food Items already created in Firestore are not changed by this patch. Previous browser-local foods are not deleted, and no transfer into Firebase happens automatically.

## Applying this delta ZIP

Upload **only the files contained in this patch** over the corresponding files in your existing GitHub Pages repository, keeping all other files. This patch changes `index.html`, `piechart-db.js`, `PROJECT_SPEC.md`, and this `README.md`. **Do not replace your working `firebase-config.js`**, re-register your Google accounts, or republish Firestore rules; those are unchanged and the existing rules already permit owner-private `settings/targets` documents.

Refresh the installed app or website after publishing. If the page appears unchanged, reload it fully to clear the older cached HTML/JavaScript.

## Testing

1. In **Settings → Personal targets**, set Weight and Water goals and save. Reopen the form and confirm they were retained. The first target load needs a successful server connection before editing.
2. Double-tap Weight and record a weigh-in. The current weight label should update and persist after a refresh; it will appear as an actual chart point when that date is complete.
3. Double-tap Water and record two quantities. The current day's total should be the sum, and should persist after a refresh.
4. Sign into the **same account** on another device to confirm the same weight, water, and target values. Sign into the **other account** and confirm that those private values do not appear there. The approved Food Item library remains shared.

**Limitations:** Live Firestore writes have not been tested against the owner's actual project from this environment; local UI tests use simulated database updates. Historical record editing/deletion, automatic independently recoverable backups, food diary, activity imports, and calorie-budget calculations are still to be developed. Firestore cache/sync alone is **not** a backup. Do not enter irreplaceable data without a separate recovery plan. See `PROJECT_SPEC.md` for agreed behaviour and remaining work.
