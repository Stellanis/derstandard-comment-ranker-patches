# derStandard Comment Ranker Morphe Patch

Morphe patch source for adding comment sorting to the Android app `DER STANDARD Nachrichten`.

This repository does not distribute the derStandard app. You need to provide your own APK in Morphe.

## Installation

1. Install Morphe Manager on your Android device.
2. Open Morphe Manager and add this custom patch source:

```text
https://raw.githubusercontent.com/Stellanis/derstandard-comment-ranker-patches/main/patches-bundle.json
```

3. Refresh the source and confirm it shows the latest bundle version.
4. Select the app `DER STANDARD Nachrichten` / package `derstandard.at.istandardx`.
5. Enable the patch `Comment ranker`.
6. Patch the APK and install the patched app.

If Morphe still shows an older version or zero patches, remove the source, force stop Morphe Manager, and add the source again.

## Notes

- The patch targets package `derstandard.at.istandardx`.
- The patch injects the bundled comment ranker into article WebViews.
- No derStandard APKs, signed APKs, keystores, or app build outputs are stored in this repository.

## License

GPLv3. See [LICENSE](LICENSE).
