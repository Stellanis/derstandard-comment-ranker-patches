package app.template.patches.shared

import app.morphe.patcher.patch.ApkFileType
import app.morphe.patcher.patch.AppTarget
import app.morphe.patcher.patch.Compatibility

object Constants {
    val COMPATIBILITY_DERSTANDARD = Compatibility(
        name = "DER STANDARD Nachrichten",
        packageName = "derstandard.at.istandardx",
        apkFileType = ApkFileType.APK,
        appIconColor = 0xB7CCA3,
        targets = listOf(
            AppTarget(
                version = null,
            )
        )
    )
}
