package com.nahuelnob.iptv;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugins must be registered before the bridge starts.
        registerPlugin(NativeVideoPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);

        // The app loads from GitHub Pages (server.url). Without internet, Capacitor's own handler calls
        // loadUrl(errorPath) inside onReceivedError, and Chromium's error page then wins that race, so
        // the bundled offline.html never shows. Navigating on the next loop turn lets it through.
        Bridge bridge = getBridge();
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                super.onReceivedError(view, request, error);
                String offline = bridge.getErrorUrl();
                if (offline != null && request.isForMainFrame()) view.post(() -> view.loadUrl(offline));
            }
        });
    }
}
