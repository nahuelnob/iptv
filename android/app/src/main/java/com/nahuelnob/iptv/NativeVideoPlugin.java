package com.nahuelnob.iptv;

import android.graphics.Color;
import android.net.Uri;
import android.view.Display;
import android.view.LayoutInflater;
import android.view.Surface;
import android.view.SurfaceView;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebView;

import androidx.annotation.NonNull;
import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.Format;
import androidx.media3.exoplayer.DecoderReuseEvaluation;
import androidx.media3.exoplayer.analytics.AnalyticsListener;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.Tracks;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.source.LoadEventInfo;
import androidx.media3.exoplayer.source.MediaLoadData;
import androidx.media3.ui.PlayerView;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.IOException;
import java.util.Locale;

/**
 * Plays streams with ExoPlayer in a view placed under the (transparent) WebView, so the web
 * player's controls stay on top while the device's own decoders handle the video. The WebView's
 * MediaSource path cannot decode MPEG-2 at all, and hls.js drops HEVC carried in MPEG-TS.
 *
 * play({ url, id, surface }): surface is "texture" (default, works on every device) or "surface"
 * (cheaper, but black on TV boxes whose compositor hides a SurfaceView under the WebView). The page
 * chooses, so switching needs only a web deploy.
 *
 * Events, each carrying the {@code id} given to {@link #play}, so the page can ignore a stream it
 * already left: "buffering", "playing", "tracks" ({@code video}: a decodable video track exists),
 * "firstFrame" (a video frame reached the view) and "error" ({@code status}: HTTP status when the
 * server answered with one).
 */
@CapacitorPlugin(name = "NativeVideo")
@OptIn(markerClass = UnstableApi.class)
public class NativeVideoPlugin extends Plugin {

    // Same identity the Cloudflare and dev proxies present: several origins only answer to players.
    private static final String USER_AGENT = "VLC/3.0.18 LibVLC/3.0.18";
    private static final int TIMEOUT_MS = 15_000;
    // Consecutive network failures rejoined before giving up; reset whenever playback resumes.
    private static final int MAX_REJOINS = 3;
    // How long a channel waits for its video surface before loading anyway, and how often it checks.
    private static final long SURFACE_WAIT_MS = 1_000;
    private static final long SURFACE_POLL_MS = 16;
    // Media buffered before playback starts, and before it resumes after a stall. ExoPlayer's defaults
    // (2.5 s and 5 s) made every channel start feel slow; VLC-based IPTV apps start with about 1 s
    // (--live-caching=1000). A shorter start may stall more on a bad stream, which then rejoins.
    private static final int START_BUFFER_MS = 1_000;
    private static final int RESUME_BUFFER_MS = 2_000;

    private ExoPlayer player;
    private PlayerView view;
    private String viewSurface;
    private String url;
    private int id;
    private boolean forcedHls;
    private int rejoins;
    private boolean resumeOnForeground;
    // Bumped by every play() and stop(): a load still waiting for its surface runs only if it is the latest.
    private int loadToken;
    // The current stream reached READY once: buffering from then on is a freeze ("stall").
    private boolean wasReady;

    @PluginMethod
    public void play(PluginCall call) {
        String requested = call.getString("url");
        if (requested == null || requested.isEmpty()) {
            call.reject("Missing url");
            return;
        }
        int requestedId = call.getInt("id", 0);
        String surface = "surface".equals(call.getString("surface")) ? "surface" : "texture";

        getActivity().runOnUiThread(() -> {
            ensurePlayer();
            ensureView(surface);
            // A play() without stop() in between is the page reconnecting the same channel: the last
            // frame stays on screen instead of going black until the new stream draws. stop() clears it.
            view.setKeepContentOnPlayerReset(true);
            url = requested;
            id = requestedId;
            forcedHls = false;
            rejoins = 0;
            // The view first, then the stream once its surface exists. Loading first let some decoders
            // (an Android 11 Flow deco) configure before the surface arrived: green, garbled video until
            // the channel was switched away and back.
            view.setVisibility(View.VISIBLE);
            int token = ++loadToken;
            boolean asHls = isHlsPath(requested);
            whenSurfaceReady(token, 0, () -> load(asHls));
            call.resolve();
        });
    }

    // Runs start once the video surface can take frames, or after SURFACE_WAIT_MS at most, unless a
    // newer play() or a stop() came in meanwhile.
    private void whenSurfaceReady(int token, long waited, Runnable start) {
        if (token != loadToken || player == null || url == null) return;
        if (surfaceReady() || waited >= SURFACE_WAIT_MS) {
            start.run();
            return;
        }
        view.postDelayed(() -> whenSurfaceReady(token, waited + SURFACE_POLL_MS, start), SURFACE_POLL_MS);
    }

    private boolean surfaceReady() {
        View surface = view.getVideoSurfaceView();
        if (surface instanceof TextureView) return ((TextureView) surface).isAvailable();
        if (surface instanceof SurfaceView) {
            Surface holder = ((SurfaceView) surface).getHolder().getSurface();
            return holder != null && holder.isValid();
        }
        return true;
    }

    // Frame-rate matching (src/domain/display-mode.js decides): the screen's modes and the current one.
    @PluginMethod
    public void displayModes(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Display display = display();
            JSArray modes = new JSArray();
            for (Display.Mode mode : display.getSupportedModes()) {
                JSObject item = new JSObject();
                item.put("id", mode.getModeId());
                item.put("width", mode.getPhysicalWidth());
                item.put("height", mode.getPhysicalHeight());
                item.put("refreshRate", mode.getRefreshRate());
                modes.put(item);
            }
            JSObject data = new JSObject();
            data.put("current", display.getMode().getModeId());
            data.put("refreshRate", display.getRefreshRate());
            data.put("modes", modes);
            call.resolve(data);
        });
    }

    // Asks the system for a display mode (the TV may blank for a moment while it switches). The
    // preference belongs to this window: leaving the app returns the screen to its usual mode.
    @PluginMethod
    public void setDisplayMode(PluginCall call) {
        int modeId = call.getInt("modeId", 0);
        getActivity().runOnUiThread(() -> {
            Window window = getActivity().getWindow();
            WindowManager.LayoutParams attributes = window.getAttributes();
            if (attributes.preferredDisplayModeId != modeId) {
                attributes.preferredDisplayModeId = modeId;
                window.setAttributes(attributes);
            }
            call.resolve();
        });
    }

    @SuppressWarnings("deprecation")
    private Display display() {
        return getActivity().getWindowManager().getDefaultDisplay();
    }

    // For the diagnostics panel: media buffered ahead and, on a live stream, how far behind the live
    // edge it plays (-1 otherwise). The live window caps the buffer: a freeze is the buffer at zero.
    @PluginMethod
    public void stats(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            JSObject data = new JSObject();
            boolean playing = player != null && url != null;
            data.put("bufferedMs", playing ? player.getTotalBufferedDuration() : 0);
            data.put("liveOffsetMs", playing && player.isCurrentMediaItemLive() ? player.getCurrentLiveOffset() : -1);
            data.put("refreshRate", display().getRefreshRate());
            call.resolve(data);
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            url = null;
            loadToken++;
            // Leaving the channel: its last frame must not show under the next one.
            if (view != null) view.setKeepContentOnPlayerReset(false);
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
        loadToken++;
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

        // The device's decoders first; the FFmpeg extension only for formats it has none for (MP2
        // audio on the B866V2, which otherwise plays the picture without sound).
        DefaultRenderersFactory renderers = new DefaultRenderersFactory(getContext())
            .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_ON);

        DefaultLoadControl buffers = new DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                DefaultLoadControl.DEFAULT_MIN_BUFFER_MS,
                DefaultLoadControl.DEFAULT_MAX_BUFFER_MS,
                START_BUFFER_MS,
                RESUME_BUFFER_MS)
            .build();

        player = new ExoPlayer.Builder(getContext(), renderers)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(http).setLoadErrorHandlingPolicy(new LiveRetryPolicy()))
            .setLoadControl(buffers)
            .build();
        player.addListener(listener);
        player.addAnalyticsListener(diagnostics);
        player.setVideoFrameMetadataListener(frameRateMeter);

        // The WebView turns transparent so the video shows through wherever the page paints
        // nothing; the page decides that with its data-native-video state.
        getBridge().getWebView().setBackgroundColor(Color.TRANSPARENT);
    }

    // One PlayerView at a time, of the requested surface type, at index 0: under the WebView.
    private void ensureView(String surface) {
        if (view != null && surface.equals(viewSurface)) return;

        WebView webView = getBridge().getWebView();
        ViewGroup parent = (ViewGroup) webView.getParent();
        if (view != null) {
            view.setPlayer(null);
            parent.removeView(view);
        }

        int layout = "surface".equals(surface) ? R.layout.native_video_surface : R.layout.native_video_texture;
        view = (PlayerView) LayoutInflater.from(getContext()).inflate(layout, parent, false);
        view.setPlayer(player);
        view.setVisibility(View.GONE);
        parent.addView(view, 0);
        viewSurface = surface;
    }

    private void load(boolean asHls) {
        wasReady = false;
        frameRateMeter.reset();
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
            if (state == Player.STATE_READY) wasReady = true;
            if (state == Player.STATE_BUFFERING && url != null) {
                // Buffering after the stream was ready is a freeze the viewer sees (the buffer ran dry).
                if (wasReady) emit("stall", new JSObject());
                emit("buffering", new JSObject());
            }
        }

        @Override
        public void onIsPlayingChanged(boolean isPlaying) {
            if (!isPlaying) return;
            rejoins = 0;
            emit("playing", new JSObject());
        }

        @Override
        public void onRenderedFirstFrame() {
            if (url != null) emit("firstFrame", new JSObject());
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

            // Reached only once LiveRetryPolicy's retries ran out (or for errors it leaves to the
            // default policy, such as timeouts): rejoin the live edge, like hls.js does. A 4xx
            // answer is final and goes to the page, which reconnects or reports it.
            boolean finalAnswer = status != null && status >= 400 && status < 500;
            boolean network = error.errorCode >= 2000 && error.errorCode < 3000;
            boolean behindLive = error.errorCode == PlaybackException.ERROR_CODE_BEHIND_LIVE_WINDOW;
            if ((behindLive || (network && !finalAnswer)) && rejoins < MAX_REJOINS) {
                rejoins++;
                JSObject rejoin = new JSObject();
                rejoin.put("message", error.getErrorCodeName());
                if (status != null) rejoin.put("status", status);
                emit("rejoin", rejoin);
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

    // Diagnostics for "sound but no picture" on TV boxes: which decoder runs, the stream's real
    // format, and how many frames are dropped (late frames are discarded while the audio goes on).
    // The real frame rate, measured once per stream, for frame-rate matching and the panel.
    private final FrameRateMeter frameRateMeter = new FrameRateMeter(fps -> getActivity().runOnUiThread(() -> {
        if (url == null) return;
        JSObject data = new JSObject();
        data.put("fps", fps);
        emit("frameRate", data);
    }));

    private final AnalyticsListener diagnostics = new AnalyticsListener() {
        @Override
        public void onVideoDecoderInitialized(
            @NonNull EventTime eventTime, @NonNull String decoderName, long initializedTimestampMs, long initializationDurationMs) {
            if (url == null) return;
            JSObject data = new JSObject();
            data.put("decoder", decoderName);
            emit("decoder", data);
        }

        @Override
        public void onVideoInputFormatChanged(
            @NonNull EventTime eventTime, @NonNull Format format, DecoderReuseEvaluation decoderReuseEvaluation) {
            if (url == null) return;
            JSObject data = new JSObject();
            data.put("width", format.width);
            data.put("height", format.height);
            data.put("frameRate", format.frameRate);
            data.put("codecs", format.codecs);
            data.put("mime", format.sampleMimeType);
            emit("format", data);
        }

        @Override
        public void onDroppedVideoFrames(@NonNull EventTime eventTime, int droppedFrames, long elapsedMs) {
            if (url == null) return;
            JSObject data = new JSObject();
            data.put("count", droppedFrames);
            data.put("elapsedMs", elapsedMs);
            emit("dropped", data);
        }

        // A playlist or segment load that failed and will be retried (LiveRetryPolicy): the 404s and
        // cut connections behind most freezes on IPTV restreams.
        @Override
        public void onLoadError(
            @NonNull EventTime eventTime, @NonNull LoadEventInfo loadEventInfo, @NonNull MediaLoadData mediaLoadData,
            @NonNull IOException error, boolean wasCanceled) {
            if (url == null || wasCanceled) return;
            JSObject data = new JSObject();
            Integer status = httpStatusOf(error);
            if (status != null) data.put("status", status);
            data.put("message", error.getClass().getSimpleName());
            emit("loadError", data);
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
