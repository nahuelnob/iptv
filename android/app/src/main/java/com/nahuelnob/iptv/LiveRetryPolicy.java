package com.nahuelnob.iptv;

import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSourceException;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy;

import java.io.IOException;

/**
 * Retries failed playlist and segment loads quickly. IPTV restreams publish a live window of only
 * about four 3 s segments, so the player can never buffer more than ~9 s; ExoPlayer's default
 * policy waits 0, 1 and 2 s between tries of a failed segment and then fails the whole stream,
 * which the plugin answers with a rejoin. On these servers that wait is the freeze the viewer sees.
 * Here an HTTP error (a 404 for a segment the server has not published yet, a 5xx, a dropped
 * connection) or a read position past the end of the response (a 416, or a resumed range longer
 * than the new body) is tried again after 250 ms, 500 ms, 750 ms and then every second, up to
 * MIN_RETRIES times, before the stream fails. Timeouts keep the default policy: each try already
 * waited the full connect/read timeout, and fast retries would only make a dead server fail later.
 * A refused cleartext connection keeps failing at once, as by default.
 */
@OptIn(markerClass = UnstableApi.class)
final class LiveRetryPolicy extends DefaultLoadErrorHandlingPolicy {

    static final int MIN_RETRIES = 6;
    private static final long STEP_MS = 250;
    private static final long MAX_DELAY_MS = 1_000;

    @Override
    public long getRetryDelayMsFor(LoadErrorInfo info) {
        if (fastRetry(info.exception)) return Math.min(STEP_MS * info.errorCount, MAX_DELAY_MS);
        return super.getRetryDelayMsFor(info);
    }

    private static boolean fastRetry(IOException error) {
        if (error instanceof HttpDataSource.CleartextNotPermittedException) return false;
        if (error instanceof HttpDataSource.HttpDataSourceException) {
            int reason = ((HttpDataSource.HttpDataSourceException) error).reason;
            return reason != PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT;
        }
        return DataSourceException.isCausedByPositionOutOfRange(error);
    }

    @Override
    public int getMinimumLoadableRetryCount(int dataType) {
        return dataType == C.DATA_TYPE_MEDIA || dataType == C.DATA_TYPE_MANIFEST
            ? MIN_RETRIES
            : super.getMinimumLoadableRetryCount(dataType);
    }
}
