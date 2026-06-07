package app.derstandard.commentranker.patches.webview

import app.morphe.patcher.Fingerprint
import app.morphe.patcher.InstructionLocation.MatchAfterWithin
import app.morphe.patcher.methodCall
import com.android.tools.smali.dexlib2.Opcode

internal object DerStandardWebViewPageFinishedFingerprint : Fingerprint(
    definingClass = "Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel\$webViewClient\$1;",
    name = "onPageFinished",
    returnType = "V",
    parameters = listOf("Landroid/webkit/WebView;", "Ljava/lang/String;"),
    filters = listOf(
        methodCall(
            opcode = Opcode.INVOKE_STATIC,
            smali = "Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;->access\$loadOpenType(Lderstandard/at/istandardx/features/webview/fragment/WebViewViewModel;Ljava/lang/String;)V",
            location = MatchAfterWithin(40)
        ),
        methodCall(
            opcode = Opcode.INVOKE_VIRTUAL,
            smali = "Landroid/webkit/WebView;->sendAccessibilityEvent(I)V"
        )
    )
)
