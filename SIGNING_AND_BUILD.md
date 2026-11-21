# Private signing and building — browser-only process

Source ZIPs contain **no keystore or signing passwords**. The existing private repo should retain its configured signing secrets. Keep using the original signing key so updates install over the current app; do not generate a new key for an ordinary update.

## GitHub repository

Use the existing **private** `PieChartCompanion` repository. For a versioned **delta ZIP**, upload only its changed files over the existing repository and keep all unchanged files. Preserve `.github/workflows/`; it defines the manual build. Use a complete-repository ZIP only when explicitly restoring an empty repository. Do not paste secrets in commits, code, issues, or Actions logs.

## Signing material

The companion was originally signed with a PKCS12 keystore (RSA 3072), alias `piechart-steps`. Its private key and password are not present in source ZIPs. Keep them secure as your app-update identity; do not upload either to the GitHub repository. The GitHub Actions secrets must be:

- `PRIVATE_KEYSTORE_B64`: base64-encoded contents of the **private** keystore (single line).
- `PRIVATE_STORE_PASSWORD`: its long, unique store password.
- `PRIVATE_KEY_PASSWORD`: the corresponding key password (it may equal the store password).

The ZIP contains no signing material. If a signing kit is supplied separately, **never** upload it to the repository or send the private key back into the conversation. GitHub Secrets are configured under repository Settings → Secrets and variables → Actions → New repository secret. Only GitHub Actions can access them when building.

## Firebase Google sign-in

After the signing certificate is created, retrieve its public SHA-1 and SHA-256 fingerprint and register both in Firebase project's Android app `nz.piechart.companion` (Project settings → Your apps → the Android app → SHA certificate fingerprints). If Firebase offers an updated `google-services.json`, update the file in your **private** repository before building. This is necessary for Android Google sign-in and does not give the companion access to your Google password.

## Build

In the private repository, open Actions → Build private PieChart Steps APK → Run workflow. It is configured for *manual builds only*. The run must pass the scanner source check, unit tests, package signing, signature verification, and signed APK package/version verification. **For v0.2.012**, download the newest artifact named `PieChartCompanion-v0.2.012-<NZ-build-time>-NZ-run<run-number>-private-APK`. Inside it, install the **versioned** signed `PieChartCompanion-v0.2.012-<NZ-build-time>-NZ-run<run-number>.apk`, not an old `app-release.apk`. The ZIP also includes an equally named `.apk.sha256` file. The unique build ID is embedded in the APK and displayed on the home, camera, and handoff screens. Android's app info should show version `0.2.012` (versionCode `212`). Check the included SHA-256 value before installing. Never install an unrecognised APK from messages, emails, or public download sites. Android Play Protect should remain enabled.

We can walk through setup **one action at a time**. You do not need Android Studio or other development software on your computer.

### Public signing certificate fingerprints for Firebase (not secrets)

- SHA-1: `A1:38:15:02:73:CD:2D:AC:46:2B:BD:8F:7C:69:D1:30:2A:85:79:C4`
- SHA-256: `9C:DD:0B:DF:E0:6F:3A:C9:D4:30:C1:42:46:E2:BC:CD:6B:59:53:3A:10:BF:F8:A4:77:FD:A3:73:FD:EE:D9:C1`

The Gradle build receives **no signing secrets**. Only a later `apksigner` step has access to the keystore and passwords. Keep the original keystore file offline as a backup, so updates can use the same certificate.
