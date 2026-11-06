package com.nahuelnob.iptv;

import android.media.MediaFormat;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.Format;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.exoplayer.video.VideoFrameMetadataListener;

import java.util.Arrays;

/**
 * Measures a stream's real frame rate from the timestamps of the frames about to be shown, because
 * MPEG-TS restreams rarely declare it (Format.frameRate is unknown). Uses the median gap between
 * consecutive frames: frames the player drops leave bigger gaps, and an average would read a 25 fps
 * channel that drops frames as 23.98 fps. Reports once per stream; reset() starts over.
 * Runs on the playback thread.
 */
@OptIn(markerClass = UnstableApi.class)
final class FrameRateMeter implements VideoFrameMetadataListener {

    interface Listener {
        void onFrameRate(double fps);
    }

    private static final int SAMPLES = 90;
    // Gaps outside these bounds are timestamp jumps (restreams have them), not frame spacing.
    private static final long MIN_GAP_US = 1_000_000 / 121;
    private static final long MAX_GAP_US = 1_000_000 / 9;

    private final Listener listener;
    private final long[] gaps = new long[SAMPLES];
    private volatile boolean resetRequested = true;
    private long lastUs;
    private int count;
    private boolean reported;

    FrameRateMeter(Listener listener) {
        this.listener = listener;
    }

    // Called on the main thread when a new stream loads; applied on the playback thread.
    void reset() {
        resetRequested = true;
    }

    @Override
    public void onVideoFrameAboutToBeRendered(
        long presentationTimeUs, long releaseTimeNs, @NonNull Format format, @Nullable MediaFormat mediaFormat) {
        if (resetRequested) {
            resetRequested = false;
            reported = false;
            count = 0;
            lastUs = presentationTimeUs;
            return;
        }
        if (reported) return;

        long gap = presentationTimeUs - lastUs;
        lastUs = presentationTimeUs;
        if (gap < MIN_GAP_US || gap > MAX_GAP_US) return;

        gaps[count++] = gap;
        if (count < SAMPLES) return;

        long[] sorted = Arrays.copyOf(gaps, SAMPLES);
        Arrays.sort(sorted);
        reported = true;
        listener.onFrameRate(1_000_000.0 / sorted[SAMPLES / 2]);
    }
}
