// When a stream fails, the player starts the channel over from scratch, as switching channels and
// back does. A channel that was playing gets several tries with growing waits (live servers drop
// segments or briefly answer 404 while rotating them); one that never started gets a single retry,
// so a dead channel does not keep loading. One try at a time: the player stops the failed stream
// before waiting.

export const RECONNECT_DELAYS_MS = [1_000, 3_000, 6_000, 10_000];
const NEVER_PLAYED_LIMIT = 1;

// Playing this long without failing means the stream recovered: the next drop counts from zero.
export const STABLE_MS = 30_000;

export function startSession() {
  return { played: false, failures: 0, playingSince: null };
}

// Playback (re)started at `now`. A buffering pause does not move the start of the run.
export function markPlaying(session, now) {
  return {
    played: true,
    failures: session.failures,
    playingSince: session.playingSince ?? now,
  };
}

// The stream failed at `now`: how long to wait before starting it over, or null to give up.
export function nextReconnect(session, now) {
  const stable = session.playingSince !== null && now - session.playingSince >= STABLE_MS;
  const failures = stable ? 0 : session.failures;
  const limit = session.played ? RECONNECT_DELAYS_MS.length : NEVER_PLAYED_LIMIT;
  const giveUp = failures >= limit;

  return {
    session: {
      played: session.played,
      failures: giveUp ? failures : failures + 1,
      playingSince: null,
    },
    delay: giveUp ? null : RECONNECT_DELAYS_MS[failures],
    attempt: failures + 1,
    limit,
  };
}
