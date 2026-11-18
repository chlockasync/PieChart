# PieChart v0.1.053 — companion steps bridge (delta patch)

**Apply over v0.1.052** on GitHub Pages. Replace only `index.html`, `piechart-db.js`, `PROJECT_SPEC.md`, and `README.md`; retain all other files. The cache version of `piechart-db.js` is updated to 0.1.053.

The web app now listens to private Firestore `users/{uid}/dailyTotals` records produced by the new Android companion project. Steps appear on the Steps chart and feed the existing calorie-range calculation. Missing days are unknown, not zero. The record schema and validation are documented in `PROJECT_SPEC.md`. No Firestore rule changes are required because `dailyTotals` was already owner-only and allowed.

The separately delivered `PieChartCompanion` source archive contains the Android Studio application. It needs an Android app registration in the same Firebase project, SHA-1/SHA-256 fingerprint(s), `google-services.json`, a local Android build, and tests on both phones before an APK can be distributed. No secret keys or machine-specific credentials are embedded in the source distribution.
