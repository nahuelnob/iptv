package com.nahuelnob.iptv;

import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSourceException;
import androidx.media3.datasource.HttpDataSource;
import androidx.media3.exoplayer.upstream.DefaultLoadErrorHandlingPolicy;

/**
 * Retries failed playlist and segment loads quickly. IPTV restreams publish a live window of only
 * about four 3 s segments, so the player can never buffer more than ~9 s; ExoPlayer's default
 * policy waits 0, 1 and 2 s between tries of a failed segment and then fails the whole stream,
 * which the plugin answers with a rejoin. On these servers that wait is the freeze the viewer sees.
 * Here an HTTP error (a 404 for a segment the server has not published yet, a 5xx, a dropped
 * connection) or a body cut short is tried again after 250 ms, 500 ms, 750 ms and then every
 * second, up to MIN_RETRIES times, before the stream fails.
 */
@OptIn(markerClass = UnstableApi.class)
final class LiveRetryPolicy extends DefaultLoadErrorHandlingPolicy {

    static final int MIN_RETRIES = 6;
    private static final long STEP_MS = 250;
    private static final long MAX_DELAY_MS = 1_000;

    @Override
    public long getRetryDelayMsFor(LoadErrorInfo info) {
        boolean http = info.exception instanceof HttpDataSource.HttpDataSourceException;
        boolean cutShort = DataSourceException.isCausedByPositionOutOfRange(info.exception);
        if (http || cutShort) return Math.min(STEP_MS * info.errorCount, MAX_DELAY_MS);
        return super.getRetryDelayMsFor(info);
    }

    @Override
    public int getMinimumLoadableRetryCount(int dataType) {
        return dataType == C.DATA_TYPE_MEDIA || dataType == C.DATA_TYPE_MANIFEST
            ? MIN_RETRIES
            : super.getMinimumLoadableRetryCount(dataType);
    }
}
