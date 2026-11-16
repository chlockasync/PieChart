# MyHealthTrack v0.1.007 — landscape graph prototype

Open `index.html` directly or upload the contents of this folder to GitHub Pages. HTML/CSS/JavaScript are self-contained with no external dependencies.

Changes since v0.1.006:
- Reordered right-side controls: Steps, Water, Weight, Calories, Protein, Fibre, Carbs, Fats.
- Dynamically allocate all plot height among **selected** metrics, including a centred single-metric view.
- Daily horizontal marks stay inside their full-width day/fading columns; no gaps or vertical date grid lines.
- Today's column and marks are subtly marked 'in progress'.
- Removed date navigation arrows; periods are 7/30/60/90 days, 6 months, 1/2/3/5 years, and all demo history.
- Rebuilt and extended fictional dataset to roughly 3.2 years, with coherent energy/nutrient arithmetic, slower calorie-budget variation, irregular weigh-ins, and a partial current day.
- Dates up to 90 days display daily values. Larger windows display labelled 3/7/14/28-day aggregates for legibility, with today's partial data kept separate.

**Important:** This is a design/interaction prototype using synthetic numbers only. It does not track steps or calories from a phone, store real entries, or connect to accounts. Calorie and weight data are illustrative, not personalised health guidance.

The `PROJECT_SPEC.md` file is our living record of the agreed product requirements and choices. Update it with future iterations.
