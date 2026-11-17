# Jules Berne’s Pie Chart — v0.1.043

Phone-first nutrition, weight, water, and activity tracker for GitHub Pages. The two-member Firebase project is now configured, and the user has verified shared food-library synchronisation across phone and computer.

## Version 0.1.043 — Water allocation, weight goal line, and interface cleanup

- **Food Item water contribution:** The review/edit form has an optional *Counts towards water intake* checkbox immediately after Scan nutrition panel. Enabled items allocate a chosen 0–100% of mass remaining after macronutrients and fibre to water (approximate mL equivalent, with USDA carbohydrate/fibre overlap accounted for). Existing non-water items default to zero; an item named Water defaults to 100% until deliberately changed. Drinks, Dishes, and Meals sum their eligible ingredients' contributions and snapshot the result when recorded. The Water shortcut respects Water's configured contribution; older records are unchanged.
- **Weight graph:** Show its dashed target line only if the goal lies within the original visible weight band (never rescale to force it). Remove the white outline from individual weigh-in dots.
- **Chart tap:** Completely remove the daily popup/tooltip for now; chart swipe and date-axis navigation remain.
- **Food search:** Reserve a right-hand scrollbar gutter instead of wrapping labels to hide scrollbar overlap.

**Install:** Apply this change-only patch over v0.1.042: replace `index.html`, `piechart-db.js`, `PROJECT_SPEC.md`, and `README.md`. Keep your existing `dummy-data.csv`, source reference data, `firebase-config.js`, Firestore rules, icons, and all other files. No Firebase Console or security-rule changes required. No existing foods or diary records are overwritten.

---

## Version 0.1.042 — water as food, history, and clearer library labels

- **Water is a Food Item:** Create one Food Item named **Water**, normally with nutrients per 100 mL. Existing Water shortcuts now log this item into the account-private `foodEntries` collection; until Water exists, the shortcut explains what to add. Older standalone water records are still included in daily totals, avoiding data loss or double-counting.
- **Water in recipes:** A Dish or Meal can contain Water like any other ingredient, including through nested recipes. **Record serving** on an existing Food Item/Dish/Meal records a quantity, a nutrition snapshot, and its proportional Water amount. Example: a saved 200 mL Water + 50 mL milk cup of tea contributes 200 mL of Water when a whole cup is recorded. Milk alone contributes zero water. A full chronological food diary is still to be built.
- **Food search:** Long names and source tags wrap inside the screen rather than causing horizontal overflow. The live barcode scanner preview is at the top of the Food Library card.
- **Historical graph:** The bundled 1,160-day CSV shows as historical sample data only on days **before the first live entry** in an authenticated account; later dates use private Firebase events. The CSV has **114 supplied weigh-ins from 13 February to 16 November 2026**, with missing weigh-ins blank. The same updates are in the HTML sample fallback. The other CSV columns remain fictional.
- **Clearer labels:** Library results show their type (Food Item/Dish/Meal), and external suggestions show their source. The UI no longer badges library items as “approved”; the external review confirmation now says **Add to library**. The internal Firebase `approvedFoods` collection and approval flag remain unchanged for compatibility.

**Install:** This patch supersedes the previous v0.1.041 patch (which may not have been installed yet). Upload **`index.html`, `piechart-db.js`, `dummy-data.csv`, `PROJECT_SPEC.md`, and `README.md`**. Retain your working `firebase-config.js`, Firestore rules, reference datasets, icons, and all other files. Do not redo Firebase setup. Cloud Food Items and personal records are not migrated or changed automatically.

**Privacy note:** The CSV is a file in a public GitHub Pages deployment. Its historical weights can be downloaded by anyone who can access the website, and, while used as a sample history, are shown on both accounts. The data are **not private Firestore weight records**. Move them into the intended account's Firestore history when historical import is built.

**Manual checks on your actual devices:** Create Water with per-100-mL values, record 250 mL using the Water shortcut, then create a Dish containing 200 mL Water + 50 mL another ingredient and use **Record serving**. Confirm the Water label grows by 450 mL and remains correct after refresh. Check a long food search result, the scanner's preview position, CSV history in the chart before new entries, and the absence of “approved” badges or wording. Live Firestore writes and mobile camera/keyboard behaviour were not verified against your real Firebase project in this environment.

## Version 0.1.041 — entry usability and food-library improvements

- **Personal targets:** Save now closes the form and returns to the graph. Back still returns to Settings without saving. Firestore saves continue syncing in the background as before.
- **Keyboard navigation:** The entry/dialog system follows the visible mobile viewport. Settings, Targets, food search, food review, and Dish/Meal forms use one scrollable content area, keeping the active input in view while the keyboard is open and the close control accessible.
- **Nutrients:** Nutritional and energy figures appear with no more than two decimal places, including values from external sources and saved recipes. New approvals/edits round stored nutrient figures to two decimals; the bundled source files remain unchanged.
- **Weight:** The existing ruler, markings, and acceleration are unchanged. The selected reading, keyboard steps, and stored weigh-in snap to 0.05 kg increments.
- **Food lookup:** Once search text is entered, a standard result row offers **Add new Food Item**, prefilling the food name or barcode from the typeahead text. The option appears after direct matches and before looser external matches. It remains absent before searching. Approval is still required to save.

**Apply this change-only patch:** Upload `index.html`, `PROJECT_SPEC.md`, and `README.md` over the existing GitHub Pages repository files. Keep `piechart-db.js`, `firebase-config.js`, `firestore.rules`, all reference files, and icons unchanged. This update does not modify or migrate live Firebase data.

**Quick checks:** Save personal targets and verify the form closes; open and scroll a long Food Item form with the phone keyboard visible; open an external food with many decimal places; use the weight ruler and record a multiple of 0.05 kg; search for an unmatched food and use the new manual result.

## Version 0.1.040 — private Weight, Water, and Targets

When **signed into an approved account**, Weight and Water recording now creates **private Firestore records** under that account. Daily water is the sum of actual drink records; a day with no recorded drinks is unknown rather than a false zero. Weight uses each actual weigh-in, with the most recent entry of the date determining the chart point. **Today's incomplete entries appear in the right-hand readouts, not as today's plotted graph column**; they become part of the plotted history tomorrow. Signed-in charts contain no invented values for other metrics. When signed out, the CSV-backed **fictional demo chart** remains available for interface testing.

**Settings → Personal targets** is one page for optional Weight (kg), Water (litres), Steps, Protein (g), and Fibre (g). Blank means no target. Targets are saved per account and synchronised between that person's devices, never the other member's account. Calories are still to be calculated rather than manually targeted, and no fat/carbohydrate targets are added.

The old temporary food-item snapshot no longer seeds either library. The two new live Food Items already created in Firestore are not changed by this patch. Previous browser-local foods are not deleted, and no transfer into Firebase happens automatically.

## Applying the earlier v0.1.040 patch

Upload **only the files contained in this patch** over the corresponding files in your existing GitHub Pages repository, keeping all other files. This patch changes `index.html`, `piechart-db.js`, `PROJECT_SPEC.md`, and this `README.md`. **Do not replace your working `firebase-config.js`**, re-register your Google accounts, or republish Firestore rules; those are unchanged and the existing rules already permit owner-private `settings/targets` documents.

Refresh the installed app or website after publishing. If the page appears unchanged, reload it fully to clear the older cached HTML/JavaScript.

## Testing

1. In **Settings → Personal targets**, set Weight and Water goals and save. Reopen the form and confirm they were retained. The first target load needs a successful server connection before editing.
2. Double-tap Weight and record a weigh-in. The current weight label should update and persist after a refresh; it will appear as an actual chart point when that date is complete.
3. Double-tap Water and record two quantities. The current day's total should be the sum, and should persist after a refresh.
4. Sign into the **same account** on another device to confirm the same weight, water, and target values. Sign into the **other account** and confirm that those private values do not appear there. The approved Food Item library remains shared.

**Limitations:** Live Firestore writes have not been tested against the owner's actual project from this environment; local UI tests use simulated database updates. Historical record editing/deletion, automatic independently recoverable backups, food diary, activity imports, and calorie-budget calculations are still to be developed. Firestore cache/sync alone is **not** a backup. Do not enter irreplaceable data without a separate recovery plan. See `PROJECT_SPEC.md` for agreed behaviour and remaining work.
