# Joules Burn's Pie Chart — v0.1.010

Landscape graph-first interactive HTML/CSS/JS prototype for GitHub Pages.

## Run / install
Upload the **contents** of this folder to your repository root and enable GitHub Pages. Open the HTTPS URL. Install it to the Android home screen using the browser's **Add to Home screen / Install** option. The PWA manifest requests fullscreen landscape when launched as an installed app; a normal Chrome tab cannot automatically force fullscreen on page load.

## Touch gestures
- **Graph swipe right:** reveal more historical days (zoom out from today). **Swipe left:** zoom back towards today. Initially 30 days; 7 days minimum.
- **Graph tap:** inspect a date and all visible measurements; tap again to close.
- **Label double-tap:** Water records water, Weight records weight, Calories/Protein/Fibre/Carbs/Fats open the sample food search. Steps cannot be entered manually.
- **Label long-press (about 0.6 seconds) and drag vertically:** reorder metric labels **and** their graph bands. Reordering persists locally.
- **Eye icon:** explicitly hide a visible series; to show it again use the small **+ N hidden** control on the right.
- **Water entry:** tap any of the five recent amounts to record it immediately, or select **New amount**. Prototype prepopulates demo recent amounts.
- **Weight entry:** flick the whole-kilogram and hundredths wheels; momentum allows faster travel. Press Record.

## Scope
Includes a long fictional history, current in-progress day, actual/missing demo weigh-ins and a seven-day high/low measured-weight envelope that continues beyond the visible history boundary. Graph positioning is still experimental. No real data sync/backup or Android sensor integration yet. See `PROJECT_SPEC.md` for the authoritative project scope and decisions.
