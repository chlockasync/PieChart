# Jules Berne’s Pie Chart — v0.1.051

**Change-only patch over v0.1.050.** Replace these **four files** in the existing GitHub Pages repository; leave all other files, including your `firebase-config.js`, unchanged:

- `index.html` — Steps-label double-tap opens Activity log; entry, editing, deletion, and Steps-band activity markers.
- `piechart-db.js` — Firestore real-time owner-private activity log and write/delete validation, offline-queue compatible.
- `PROJECT_SPEC.md` — authoritative current requirements and implementation status.
- `README.md` — installation notes and data model.

`calorie-budget.js` remains **unchanged from v0.1.050**; do not replace it. The HTML continues to load `calorie-budget.js?v=0.1.050` and now loads `piechart-db.js?v=0.1.051` to avoid stale cached API versions.

No Firebase Security Rules, project configuration, permissions, or data migration are required **if your deployed rules still match the previously supplied rules**, which already permit the owner-private `exerciseEntries` collection. The two member accounts remain separate. No manual steps or sample exercises are created.

## Using the Activity log

Double-tap **Steps** in the right-hand graph labels (or focus Steps and press Enter). Choose **Date**, **Duration (minutes)**, **Activity**, and **Effort** (Light, Moderate, Vigorous), then **Record**. Use the Recorded activities list to Edit or Delete. Multiple records on one day are supported, including past dates. No calorie amount or future/planned activity is requested.

The checkbox **“Steps from this activity are included in automatic step counting”** indicates whether the exercise would otherwise be counted in steps. It defaults on for Walking, Running, and Hiking, and off for other activities; you can change it. For step-based exercise, an estimated step count from duration/cadence is recorded to limit double-counting **when automatic step data eventually arrives**; those estimates are NOT recorded as daily step totals. Other checked activities use the calculator's conservative overlap behaviour.

The activity/effort MET examples are approximate (drawing on the [2024 Adult Compendium](https://pacompendium.com/adult-compendium/)), not individual energy measurements. The energy engine uses **net MET expenditure above resting**. Yesterday’s exercise cannot be added a second time to today’s calorie estimate. The calorie range remains provisional because Health Connect steps are not integrated yet.

## Graph presentation

Days with recorded activities receive a distinct **coral vertical capsule** over the purple Steps graph. All activities recorded for a single date combine into one marker, whose length follows total **net MET-minutes** (duration × intensity), with a square-root display scaling to avoid very large markers. Each capsule stays within its own day column and is clipped to the Steps band, normally centred on the steps goal line, otherwise at band centre. Today's unfinished day is not displayed as a completed chart column; its recorded exercise still feeds today's calorie estimate.

## Quick verification

1. Install the four replacement files and refresh GitHub Pages. Ensure saved Details & Targets can still be edited.
2. Double-tap **Steps**, record a 30-minute activity for **yesterday**, and check that a single coral marker appears on yesterday's column. Record a second activity that same date; its marker should get longer, not multiply into two columns.
3. Edit the duration, then delete one record; confirm the history list and graph update. Test Back and the close button.
4. Confirm the Calories target for **today** responds to an activity logged today, but *not* to yesterday's activity alone. Exercise cannot create an invented daily step count.
5. Check a second account sees none of the first account's private exercises. Check offline recording and subsequent sync on actual devices.

**Local verification:** JavaScript syntax and browser interaction tests pass for record, edit, delete, Steps-band geometry, and calendar-day recalculation, using a local simulated private-state adapter. Actual Firebase/phone/offline synchronisation remains untested and must be verified before production use.
