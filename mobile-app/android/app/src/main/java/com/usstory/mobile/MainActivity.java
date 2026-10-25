package com.usstory.mobile;

import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    private static final long MINIMUM_BRANDED_SPLASH_MS = 900L;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private long launchSplashShownAt;
    private View launchSplash;
    private boolean launchSplashDismissScheduled;

    @Override
    protected void load() {
        launchSplashShownAt = SystemClock.elapsedRealtime();
        launchSplash = getLayoutInflater().inflate(R.layout.launch_splash, null);
        FrameLayout.LayoutParams layoutParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
            Gravity.FILL
        );
        addContentView(launchSplash, layoutParams);

        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView webView, String url) {
                runOnUiThread(MainActivity.this::scheduleLaunchSplashDismiss);
            }
        });

        super.load();
    }

    private void scheduleLaunchSplashDismiss() {
        if (launchSplashDismissScheduled) return;
        launchSplashDismissScheduled = true;

        long elapsed = SystemClock.elapsedRealtime() - launchSplashShownAt;
        long remaining = Math.max(0L, MINIMUM_BRANDED_SPLASH_MS - elapsed);
        mainHandler.postDelayed(this::dismissLaunchSplash, remaining);
    }

    private void dismissLaunchSplash() {
        if (launchSplash == null) return;

        View splash = launchSplash;
        launchSplash = null;
        splash.animate()
            .alpha(0f)
            .setDuration(240L)
            .withEndAction(() -> {
                ViewGroup parent = (ViewGroup) splash.getParent();
                if (parent != null) parent.removeView(splash);
            })
            .start();
    }
}
