package app.derstandard.commentranker.patches.webview

import app.derstandard.commentranker.patches.shared.Constants.COMPATIBILITY_DERSTANDARD
import app.morphe.patcher.extensions.InstructionExtensions.addInstructions
import app.morphe.patcher.patch.bytecodePatch

private const val EXTENSION_INJECTOR =
    "Lapp/derstandard/commentranker/extension/CommentRankerInjector;"

@Suppress("unused")
val commentRankerPatch = bytecodePatch(
    name = "Comment ranker",
    description = "Injects the comment ranking userscript into DER STANDARD article WebViews."
) {
    compatibleWith(COMPATIBILITY_DERSTANDARD)

    execute {
        DerStandardWebViewPageFinishedFingerprint.method.addInstructions(
            0,
            """
                invoke-static { p1, p2 }, $EXTENSION_INJECTOR->inject(Landroid/webkit/WebView;Ljava/lang/String;)V
            """
        )
    }
}
