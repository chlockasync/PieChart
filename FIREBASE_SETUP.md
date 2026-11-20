# PieChart — Firebase configuration (v0.1.075)

The shared Firebase project for PieChart is `julesvernespiechart`. The app runs on GitHub Pages, not Firebase Hosting, and uses the public web-app config in `firebase-config.js`. Do not commit private keys, OAuth client secrets, or service-account credentials.

## Current access model

1. **Google Authentication:** enable Google sign-in, and authorise the actual GitHub Pages domain.
2. **Members:** add the two authorised user UIDs as `members/{uid}` documents with `{active:true}` in Firestore. Authentication alone does not confer membership.
3. **Security rules:** publish `firestore.rules` in Firebase Console → Firestore Database → Rules. Uploading a `.rules` file to GitHub does **not** publish it. Retain the active `approvedActivities` rule, introduced in v0.1.067, as well as the Food Library and owner-only account rules.
4. **Shared libraries:** `approvedFoods/{foodId}` stores Food Items, Dishes, and Meals; `approvedActivities/{activityId}` stores Activity Library items. Both members can use these libraries.
5. **Personal selections:** `users/{uid}/settings/favorites` stores each member's own FDM and Activity favourites; do not store personal favourites in shared items.
6. **Personal history:** under each `users/{uid}` are `weightEntries`, `waterEntries`, `foodEntries`, `exerciseEntries`, `dailyTotals` (Health Connect steps), and `settings` (including targets). These records must be accessible only to their owner.

## Deployment and recovery

Use GitHub Pages over HTTPS, and deploy delta ZIPs by replacing only the supplied changed files. v0.1.075 requires **no rules changes** or data migration. Keep the currently published rules in Firebase; they remain authoritative unless specifically updated.

Google sign-in can open a popup. First online use loads the Firebase SDK; offline operation depends on the browser's cache. Shared Firestore changes can overwrite one another if both people edit the same item concurrently. Firestore synchronisation and browser caching are **not historical backups**. An automatic, off-device, versioned backup mechanism is still outstanding.

No unused code cleanup should erase existing Firestore data or delete the IndexedDB reference store from a browser.
