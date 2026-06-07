package app.derstandard.commentranker.extension;

import android.content.Context;
import android.text.TextUtils;
import android.util.Log;
import android.webkit.WebView;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

public final class CommentRankerInjector {
    private static final String TAG = "DstCommentRanker";
    private static final String DERSTANDARD_HOST = "derstandard.at";
    private static volatile String script;

    private CommentRankerInjector() {
    }

    public static void inject(WebView webView, String url) {
        if (webView == null || TextUtils.isEmpty(url) || !url.contains(DERSTANDARD_HOST)) {
            return;
        }

        Context context = webView.getContext();
        if (context == null) {
            return;
        }

        try {
            webView.evaluateJavascript(getScript(context), null);
        } catch (Throwable throwable) {
            Log.w(TAG, "Failed to inject comment ranker", throwable);
        }
    }

    private static String getScript(Context context) throws IOException {
        String cached = script;
        if (cached != null) {
            return cached;
        }

        synchronized (CommentRankerInjector.class) {
            if (script == null) {
                script = readAsset(context, "dst-ranker/bootstrap.js") + "\n"
                        + readAsset(context, "dst-ranker/rating.js") + "\n"
                        + readAsset(context, "dst-ranker/content.js");
            }

            return script;
        }
    }

    private static String readAsset(Context context, String path) throws IOException {
        InputStream inputStream = context.getAssets().open(path);
        try {
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(inputStream, StandardCharsets.UTF_8)
            );
            StringBuilder builder = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                builder.append(line).append('\n');
            }
            return builder.toString();
        } finally {
            inputStream.close();
        }
    }
}
