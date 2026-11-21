# PieChart Companion — v0.2.012 (Android)

Optional Android 14+ companion to PieChart. Health Connect step synchronisation remains unchanged. The separate **Test nutrition panel scanner** uses on-device Google ML Kit. No cloud OCR, images uploaded, or companion-side nutrient calculations.

## What is new in v0.2.012

- **Repair the v0.2.011 matching regression:** Visible nutrient values are associated primarily using their actual OCR row in the current frame, restoring the more successful v0.2.010 behaviour. A geometrically predicted value must not steal a nearby subrow's number (e.g. gluten `0 g` instead of fat `1.4 g`).
- **Both checks remain:** Measured geometry and independent row counting corroborate each other when sufficient observations are visible. Missing rows remain unresolved; map-only cross-frame hypotheses may be displayed as tentative but can never lock without a direct observed-row match.
- **Retain safe locks:** Once a value passes confirmation it stays locked until the user taps it for rescan. Competing decimals and contradictory macronutrient totals remain reasons to withhold confirmation. Per-serving values are never substitutes.
- **Version identification:** Android version **0.2.012** (code **212**); GitHub adds an NZ timestamp and run number to the APK filename and artifact ZIP, with the build identity shown in the scanner.

**Status:** Seven pure Kotlin synthetic/regression checks passed, including a label with intermediate gluten/trans rows; the Android build and live-phone behaviour have **not** been tested. The six screenshots inform the regression cases but were not processed through the actual phone OCR engine here. Review any scanning results before relying on them.

## How to install and prove the version

1. Apply this **v0.2.012** delta over your existing **v0.2.011** GitHub repository (which already includes earlier patches). Each patch contains **only changed files**; retain unchanged files. Verify `app/build.gradle.kts` says `versionCode = 212`, `companionVersion = "0.2.012"`. Also check `app/src/main/java/nz/piechart/companion/LiveLabelInterpreter.kt` exists.
2. Commit/upload the changed files; the already-updated `.github/workflows/build-apk.yml` is retained unchanged. Then open **Actions → Build private PieChart Steps APK → Run workflow**. Use the **newest successful run** on the branch with your commit.
3. Download the artifact ZIP named something like `PieChartCompanion-v0.2.012-202611211735-NZ-run42-private-APK.zip`. The timestamp and run number will reflect **the actual GitHub build**, not that example. Its contents should include a signed `PieChartCompanion-v0.2.012-202611211735-NZ-run42.apk` and matching `.apk.sha256`; the exact names must correspond.
4. Install **that versioned APK**, not an older `app-release.apk`. Keep the existing app installed during the update to preserve its Health Connect and Google account settings. Android may prompt for confirmation of an update, which is expected.
5. Open Android **Settings → Apps → PieChart Companion** and check the installed version is **0.2.012**. Launch the companion from its own icon, then open **Test nutrition panel scanner**. The camera screen's top-left header must show **Scanner v0.2.012** and the **same build ID** as the APK name. The home screen also shows that build ID. If the screen does not, stop: the new APK is not the one you are running. Do not infer the version from a downloaded ZIP alone.

If GitHub's build reports `Require readable-overlay scanner source` failure, it means v0.2.009 was not fully applied to the repository: restore the missing v0.2.009+ source files, then apply v0.2.012 again. A download may acquire a Windows `(2)` suffix, which is not an Android version.

## Which scanner screen should you see?

- **Companion icon → Test nutrition panel scanner:** the current experimental **readable, target-only reconstruction overlay**. It highlights just Energy, Protein, Fat, Carbohydrate, Fibre, the verified per-100 heading, and matched per-100 values. The overlay is intended to be readable over the camera. Tap a coloured interpretation to reject it. Screenshot saves a version-labelled PNG under `Pictures/PieChart`. Debug is optional.
- **PieChart PWA → Food Item → Scan nutrition panel:** the **separate, successfully phone-tested Stage 1 connection screen**. It still returns five clearly labelled **dummy test values**; this is intentional. The experimental camera has **not** yet been connected to the PWA return workflow.

Both use the same installed companion APK and now display its actual version/build identity. The screenshot builds remain private and are **not** sent to Firebase.

**Verification status:** APK build/signing and on-phone camera/overlay behaviour for v0.2.012 are not verified here; the private GitHub Actions run and phone test remain necessary. The app package, signing identity, and step-sync implementation were not deliberately changed. Browser-tab duplication on return to the PWA remains a separate issue.

For signing and certificate details see `SIGNING_AND_BUILD.md`. For current scanner requirements, see `PROJECT_SPEC.md`.
