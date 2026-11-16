# Joules Burn's Pie Chart — v0.1.009

This is a **landscape-only HTML visual/interaction prototype** with ~3 years of synthetic records. Upload the contents of this folder to a GitHub Pages repository (or open `index.html` directly to see the visual prototype).

- Tap a right-hand label: toggle graph series.
- Double-tap Water or Weight: respective recording sheet.
- Double-tap Calories, Protein, Fibre, Carbs, or Fats: Food Item/Dish/Meal demo search.
- Hold a label ~0.9 s, then drag vertically: reorder the series and graph bands. Order is saved on the device.
- Tap the graph: inspect one date's exact values.
- Select date range in the centre of the header.

Fullscreen: When installed as an eligible PWA, the supplied manifest requests fullscreen landscape. In a regular browser tab, fullscreen normally needs a user gesture and orientation lock may not work. The prototype tries on the first touchscreen gesture. The eventual Android APK can launch immersive landscape automatically.

**Prototype limits:** Recording affects only the current demo session; it is not saved or synced. No real food database, Health Connect, auth, or off-device backups yet. These are retained in `PROJECT_SPEC.md`.
