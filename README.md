# Jules Berne’s Pie Chart — v0.1.041

Phone-first nutrition, weight, water, and activity tracker for GitHub Pages. The two-member Firebase project is now configured, and the user has verified shared food-library synchronisation across phone and computer.

## Version 0.1.041 — entry usability, precision, and food creation

- **Targets:** Save now closes the Targets dialogue once the write is queued. Invalid inputs and immediate storage errors keep the form open.
- **On-screen keyboard:** Entry sheets follow the visible mobile viewport, remain scrollable, and keep their close control accessible. Form scrolling is simplified, with a single scrolling area for food-search results while typing.
- **Weight:** The ruler, arrow keys, wheel, and recorded values now snap to **0.05 kg** increments (matching the scales), not 0.01 kg.
- **Food Item creation:** Search results have **Create new Food Item**, prefilled with the typed name or barcode, just after the first direct matches and before weaker matches. Dish/Meal creation remains available.
- **Nutrition precision:** Calories, kJ, protein, carbs, fats, and fibre values display and save at a maximum of two decimals. Existing approved foods are shown at two-decimal precision without silently rewriting old cloud documents; they are normalised when explicitly saved. Reference datasets are not modified.

All other v0.1.040 database behaviour remains: the shared library is preserved, and personal Weight, Water, and targets remain private to their account. These are interface and data-validation fixes, with no changes to the Firestore rules or configuration.

## Applying this delta ZIP

Upload **only the files contained in this patch** over the corresponding files in your existing GitHub Pages repository, keeping all other files. This patch changes `index.html`, `piechart-db.js`, `PROJECT_SPEC.md`, and this `README.md`. **Do not replace your working `firebase-config.js`**, re-register your Google accounts, or republish Firestore rules; those are unchanged and the existing rules already permit owner-private `settings/targets` documents.

Refresh the installed app or website after publishing. If the page appears unchanged, reload it fully to clear the older cached HTML/JavaScript.

## Testing

1. Save any change in **Settings → Personal targets**. The dialogue should close and reopening it should show the saved value.
2. On a phone, open Targets or a Food Item, focus a field near the bottom, and check that you can scroll to the remaining fields and buttons with the keyboard open.
3. Double-tap Weight, use a gentle swipe or arrow key, and confirm values jump in **0.05 kg** steps (e.g. 72.40, 72.45, 72.50).
4. Search for a food name not yet in the library. Choose **Create new Food Item: [typed name]**, enter the required nutrition values, and approve it. Check the record appears on the other authorised account, and that every nutritional value has at most two decimals.

**Limitations:** Mobile keyboard layout was checked in Chromium with a reduced visible viewport, not on the owner's physical phone. Firebase synchronisation of this patch needs confirmation against the live project. Firestore sync/cache is still **not a historical backup**. Historical editing, food diary, activity imports, and calorie budgets are unfinished. See `PROJECT_SPEC.md` for the current requirements and outstanding work.
