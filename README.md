# derStandard Comment Ranker Patches

Morphe patch bundle for injecting the derStandard comment ranking script directly into the Android app WebView.

This repository does not contain or distribute any derStandard APK. Users must provide their own installed APK or APK bundle.

## Patch

### Comment ranker

Injects the bundled ranker JavaScript into article WebViews after a page finishes loading.

Target app:

- App: `DER STANDARD Nachrichten`
- Package: `derstandard.at.istandardx`
- APK type: regular APK plus split APKs when present

## Use In Morphe Manager

After the repository is published, add it as a custom patch source:

```text
https://github.com/Stellanis/derstandard-comment-ranker-patches
```

Or use:

```text
https://morphe.software/add-source?github=Stellanis/derstandard-comment-ranker-patches
```

Then select the `Comment ranker` patch for `DER STANDARD Nachrichten`.

## Build Locally

Morphe dependencies are hosted through GitHub Packages. Configure a GitHub token as described in Morphe's setup docs, then run:

```powershell
cd patch-bundle
.\gradlew.bat build
.\gradlew.bat generatePatchesList
```

Expected output:

- `patches/build/libs/*.mpp`
- `extensions/extension/build/outputs/mpe/extensions/extension.mpe`
- updated `patches-list.json`

## Manual Proof Patch

The repository root also contains scripts that were used to prove the same hook against a locally pulled APK:

```powershell
.\scripts\pull-derstandard-apk.ps1
.\scripts\decode-apk.ps1
.\scripts\apply-webview-injection-patch.ps1
```

Those scripts are for local research and validation only. Do not commit pulled APKs, decompiled app code, build outputs, keystores, or signed APKs.

## License

GPLv3. See [LICENSE](LICENSE).
