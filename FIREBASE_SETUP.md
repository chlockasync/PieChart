# PieChart v0.1.039 — Firebase setup

This patch **prepares** the Firebase connection; it cannot activate your database without a Firebase project and its web-app configuration. The app remains usable as a local prototype until configured. The graph is still **fictional demo data** in this version.

## Create the project (no billing required to start)

1. In [Firebase Console](https://console.firebase.google.com/), create a **separate** Firebase project for PieChart, for example `PieChart`, on the **Spark (no-cost)** plan. **Do not reuse the Firebase project for ListsForTheShop:** replacing its Firestore rules with PieChart’s rules would break that app’s access. Google Analytics is optional and not needed.
2. In **Project settings → Your apps**, register a **Web** app. Hosting remains on **GitHub Pages**; do not enable Firebase Hosting. Copy the web app's configuration into `firebase-config.js`, preserving the exported object. The four fields required here are `apiKey`, `authDomain`, `projectId`, and `appId`. These values are public app identifiers; **never** put a service-account JSON, API secret, private key, OAuth client secret, or credential in GitHub.
3. In **Build → Authentication → Sign-in method**, enable **Google**. In **Authentication → Settings → Authorized domains**, add the hostname that actually serves PieChart (for GitHub Pages, `USERNAME.github.io` without `https://`, path, or slash; for a custom domain, use that hostname). Do not add unnecessary domains.
4. In **Build → Firestore Database**, create the **default database**, in **Production mode**. Choose an appropriate nearby region; the database location cannot be changed later. Do not enable permissive Test mode for real personal records.
5. In **Firestore Database → Rules**, replace the rules with the entire contents of `firestore.rules`, then **Publish**. These rules prevent signed-in strangers from reading or changing the data; creating a Google login alone does not make someone a member.
6. Commit/deploy the changed `index.html` and the three files `piechart-db.js`, `firebase-config.js`, and `firestore.rules` plus `PROJECT_SPEC.md` and this guide as desired. Only the HTML and JavaScript files need to be web-served. Keep all your existing files.
7. Open the deployed PieChart URL over HTTPS, then **Settings → Sign in with Google**. Google uses a pop-up, not redirect, because redirect authentication has known third-party-storage problems on GitHub Pages. Allow pop-ups if the browser blocks them. The account will initially show as **not authorised**. Copy the **User ID** shown in Settings.
8. In **Firestore Database → Data**, create a top-level collection `members`, and a document whose **document ID exactly matches that User ID**, with a Boolean field `active` set to `true`. Do **not** create a field named `uid` as a substitute for the document ID. Reopen/refresh the app. It will now show Connected. Repeat sign-in and membership creation for the second Google account. **Only add the two approved users.** To revoke an account, change `active` to `false` or delete its member document.
9. On the device containing the approved local food records, use **Settings → Transfer local approved foods** **once** while connected. Existing matches are skipped; cloud records are never automatically overwritten. Local records remain in the old device-local storage as a safety copy. If the app reports any blocked linked recipes, resolve those individually before treating migration as complete.

## Database structure

- `members/{uid}` — **admin-created** access allowlist; `{active: true}`. Each person can read only their own member status. No browser can create a membership.
- `approvedFoods/{foodId}` — shared approved Food Items, Dishes, and Meals. Existing item IDs, source/provenance, measures, ingredient IDs, and link/variation fields are preserved. All active members can read and edit the shared library.
- `users/{uid}/weightEntries/{entryId}` — reserved for private weigh-in events, for example `{id, date, kg, createdAt}`.
- `users/{uid}/waterEntries/{entryId}` — reserved for private individual drink events, for example `{id, date, ml, createdAt}`.
- `users/{uid}/foodEntries/{entryId}`, `exerciseEntries`, `dailyTotals`, and `settings` — reserved for the next stages. Each member can access only their own UID branch.

The app uses Firebase JavaScript SDK **13.3.0**, loading signed modular modules from `gstatic.com` after configuration. A first online load is required before the offline cache works. Subsequent cached reads and writes should work on supported browsers, and pending changes sync when reconnected. Shared edits to **the same** Firestore document are last-write-wins; this is not conflict-free multi-user editing. Avoid editing the same recipe simultaneously from both devices.

## Important limitations

- **This version connects and synchronises the shared Food/Dish/Meal library. It does not yet record weight or water to Firestore from the existing entry sheets, or replace the fictional graph with actual records.** The adapter includes private weight/water entry paths for that next milestone.
- Firestore sync and browser cache are **not historical backups**. Accidentally deleting a document will synchronise the deletion. Keep the existing local-approved-food export until recovery and migration are verified. Native Firestore backup/restore operations require billing; we have **not** enabled a paid backup service or claimed that backups are solved. We must agree a reliable, no-cost, automatic off-device backup design before treating data as irreplaceable.
- The app currently loads the Firebase SDK from the internet; after a first successful page load, a browser may cache it, but this is not a guarantee of full offline app startup. Offline-first installation and browser testing remain required.
- The Firebase client configuration is **not** a security mechanism. The `firestore.rules` and membership allowlist protect data. After any changes to those rules, publish the new rules in Firebase Console; merely uploading the `.rules` file to GitHub Pages does nothing.
- On an untrusted or shared device, sign out when finished. Firestore persistent browser cache can remain on disk even after signing out; do not enable a personal account on a device you do not control.
- The Firestore Spark tier currently provides free quotas (including 1 GiB stored, 50,000 reads/day, and 20,000 writes/day). Usage may vary; stay on Spark and monitor usage. The Firebase Console and source documentation are authoritative for current free limits.

## Quick connection checks

1. Unconfigured app: Settings says “Firebase is not configured”; local approved foods remain editable and none are automatically uploaded.
2. Sign in as an unauthorised Google account: Settings shows not authorised; Firestore reads/writes are blocked by rules.
3. Add that user's `members/{uid}` document and refresh: Settings shows Connected. Its private records live only under `users/{uid}`.
4. Add or edit an approved food, then open PieChart as the other authorised member: the shared library should update automatically. Both users must have their membership documents.
5. Turn off network after at least one successful authenticated online session, edit a shared food, and reconnect: a cached/offline or pending state appears, then synchronises after reconnection. Check that unsynced changes are not lost.
6. Check an unauthorised account can neither read `approvedFoods` nor read `users/{anyUid}/...`. Check one authorised user cannot read the other user's private data. A browser login does **not** grant Firebase Console access.
