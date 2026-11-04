package com.nahuelnob.iptv;

import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.Tracks;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.ui.AspectRatioFrameLayout;
import androidx.media3.ui.PlayerView;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;

/**
 * Plays streams with ExoPlayer in a view placed under the (transparent) WebView, so the web
 * player's controls stay on top while the device's own decoders handle the video. The WebView's
 * MediaSource path cannot decode MPEG-2 at all, and hls.js drops HEVC carried in MPEG-TS.
 *
 * Events, each carrying the {@code id} given to {@link #play}, so the page can ignore a stream it
 * already left: "buffering", "playing", "tracks" ({@code video}: a decodable video track exists)
 * and "error" ({@code status}: HTTP status when the server answered with one).
 */
@CapacitorPlugin(name = "NativeVideo")
@OptIn(markerClass = UnstableApi.class)
public class NativeVideoPlugin extends Plugin {

    // Same identity the Cloudflare and dev proxies present: several origins only answer to players.
    private static final String USER_AGENT = "VLC/3.0.18 LibVLC/3.0.18";
    private static final int TIMEOUT_MS = 15_000;
    // Consecutive network failures rejoined before giving up; reset whenever playback resumes.
    private static final int MAX_REJOINS = 3;

    private ExoPlayer player;
    private PlayerView view;
    private String url;
    private int id;
    private boolean forcedHls;
    private int rejoins;
    private boolean resumeOnForeground;

    @PluginMethod
    public void play(PluginCall call) {
        String requested = call.getString("url");
        if (requested == null || requested.isEmpty()) {
            call.reject("Missing url");
            return;
        }
        int requestedId = call.getInt("id", 0);

        getActivity().runOnUiThread(() -> {
            ensurePlayer();
            url = requested;
            id = requestedId;
            forcedHls = false;
            rejoins = 0;
            load(isHlsPath(requested));
            view.setVisibility(View.VISIBLE);
            call.resolve();
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            url = null;
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
            if (view != null) view.setVisibility(View.GONE);
            call.resolve();
        });
    }

    @Override
    protected void handleOnPause() {
        if (player == null) return;
        resumeOnForeground = player.getPlayWhenReady();
        player.pause();
    }

    @Override
    protected void handleOnResume() {
        if (player != null && resumeOnForeground && url != null) player.play();
    }

    @Override
    protected void handleOnDestroy() {
        if (player == null) return;
        player.release();
        player = null;
    }

    private void ensurePlayer() {
        if (player != null) return;

        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setUserAgent(USER_AGENT)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(TIMEOUT_MS)
            .setReadTimeoutMs(TIMEOUT_MS);

        player = new ExoPlayer.Builder(getContext())
            .setMediaSourceFactory(new DefaultMediaSourceFactory(http))
            .build();
        player.addListener(listener);

        view = new PlayerView(getContext());
        view.setUseController(false);
        view.setFocusable(false);
        view.setResizeMode(AspectRatioFrameLayout.RESIZE_MODE_FIT);
        view.setShutterBackgroundColor(Color.BLACK);
        view.setBackgroundColor(Color.BLACK);
        view.setPlayer(player);
        view.setVisibility(View.GONE);

        // Index 0: under the WebView. The WebView turns transparent so the video shows through
        // wherever the page paints nothing; the page decides that with its data-native-video state.
        WebView webView = getBridge().getWebView();
        ViewGroup parent = (ViewGroup) webView.getParent();
        parent.addView(view, 0, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        webView.setBackgroundColor(Color.TRANSPARENT);
    }

    private void load(boolean asHls) {
        MediaItem.Builder item = new MediaItem.Builder().setUri(Uri.parse(url));
        if (asHls) item.setMimeType(MimeTypes.APPLICATION_M3U8);
        player.setMediaItem(item.build());
        player.prepare();
        player.setPlayWhenReady(true);
    }

    private static boolean isHlsPath(String url) {
        String path = Uri.parse(url).getPath();
        return path != null && path.toLowerCase(Locale.ROOT).endsWith(".m3u8");
    }

    private void emit(String event, JSObject data) {
        data.put("id", id);
        notifyListeners(event, data);
    }

    private final Player.Listener listener = new Player.Listener() {
        @Override
        public void onPlaybackStateChanged(int state) {
            if (state == Player.STATE_BUFFERING && url != null) emit("buffering", new JSObject());
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            if (!isPlaying) return;
            rejoins = 0;
            emit("playing", new JSObject());
        }

        @Override
        public void onTracksChanged(@NonNull Tracks tracks) {
            if (tracks.isEmpty() || url == null) return;
            JSObject data = new JSObject();
            data.put("video", tracks.isTypeSupported(C.TRACK_TYPE_VIDEO, false));
            emit("tracks", data);
        }

        @Override
        public void onPlayerError(@NonNull PlaybackException error) {
            if (url == null) return;

            Integer status = httpStatusOf(error);

            // IPTV servers drop segments mid-transfer, and ExoPlayer's default policy treats some of
            // those cuts (a short body read as "position out of range") as fatal at once. Rejoin the
            // live edge instead, like hls.js retries. A 4xx answer is final and is not retried.
            boolean finalAnswer = status != null && status >= 400 && status < 500;
            boolean network = error.errorCode >= 2000 && error.errorCode < 3000;
            boolean behindLive = error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW;
            if ((behindLive || (network && !finalAnswer)) && rejoins < MAX_REJOINS) {
                rejoins++;
                player.seekToDefaultPosition();
                player.prepare();
                return;
            }

            // Lists carry HLS streams whose URL has no .m3u8 (a path or a worker URL): try once as HLS.
            if (!forcedHls && !isHlsPath(url)
                && error.errorCode == PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED) {
                forcedHls = true;
                load(true);
                return;
            }

            JSObject data = new JSObject();
            data.put("message", error.getErrorCodeName());
            if (status != null) data.put("status", status);
            emit("error", data);
        }
    };

    private static Integer httpStatusOf(Throwable error) {
        for (Throwable cause = error; cause != null; cause = cause.getCause()) {
            if (cause instanceof HttpDataSource.InvalidResponseCodeException) {
                return ((HttpDataSource.InvalidResponseCodeException) cause).responseCode;
            }
        }
        return null;
    }
}
