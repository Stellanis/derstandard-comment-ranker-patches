package app.derstandard.commentranker.patches.webview

import app.derstandard.commentranker.patches.shared.Constants.COMPATIBILITY_DERSTANDARD
import app.morphe.patcher.extensions.InstructionExtensions.addInstructions
import app.morphe.patcher.patch.PatchException
import app.morphe.patcher.patch.ResourcePatchContext
import app.morphe.patcher.patch.bytecodePatch
import app.morphe.patcher.patch.resourcePatch

private const val EXTENSION_INJECTOR =
    "Lapp/derstandard/commentranker/extension/CommentRankerInjector;"

private val commentRankerAssetsPatch = resourcePatch(
    name = "Comment ranker assets",
    description = "Copies the comment ranker JavaScript assets into DER STANDARD."
) {
    compatibleWith(COMPATIBILITY_DERSTANDARD)

    execute {
        copyAsset("dst-ranker/bootstrap.js")
        copyAsset("dst-ranker/content.js")
        copyAsset("dst-ranker/rating.js")
    }
}

@Suppress("unused")
val commentRankerPatch = bytecodePatch(
    name = "Comment ranker",
    description = "Injects the comment ranking userscript into DER STANDARD article WebViews."
) {
    compatibleWith(COMPATIBILITY_DERSTANDARD)
    dependsOn(commentRankerAssetsPatch)
    extendWith("extensions/extension.mpe")

    execute {
        DerStandardWebViewPageFinishedFingerprint.method.addInstructions(
            0,
            """
                invoke-static { p1, p2 }, $EXTENSION_INJECTOR->inject(Landroid/webkit/WebView;Ljava/lang/String;)V
            """
        )
    }
}

private fun ResourcePatchContext.copyAsset(path: String) {
    val input = object {}.javaClass.classLoader.getResourceAsStream(path)
        ?: throw PatchException("Missing patch resource: $path")
    val target = get("assets/$path", true)

    target.parentFile.mkdirs()
    input.use { source ->
        target.outputStream().use { destination ->
            source.copyTo(destination)
        }
    }
}
