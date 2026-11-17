# Joules Burn's Pie Chart — v0.1.021

Upload **the contents of this ZIP** directly into the root of the PieChart GitHub Pages repository.
Open `index.html`, or install the hosted website as a PWA to use its fullscreen display.

This is the single-stylesheet visual rebuild of the approved concept. Graphs retain one record per day (100 days on initial display), the previous weight envelope calculations, and the touch interactions from the previous prototype. Demo records are fictional and editable in `dummy-data.csv`; the HTML embeds the same data for standalone previews.

Data recording in this build is for interactive demonstration and does not yet persist to Firebase. All eight data series remain available in portrait and landscape. Fats and carbs have no established daily targets, so their readouts are grams, not percentages.

## v0.1.021 — Timeline and ratio bars

The baseline spans the whole graph and legend, with the latest completed date at the far right. Calendar-month ticks are used in short-to-medium ranges, switching to year markers for long history. Labels slide as the historical span is changed. Right-side coloured strips are three times wider (12 px) and show progress as a bottom-up full-colour fill against a 30% colour wash. Weight values above target fill to 100% while retaining the accurate numeric percentage. Fats and Carbs have no agreed targets and therefore have no progress fill. The historical charts and weight envelope are unchanged.
