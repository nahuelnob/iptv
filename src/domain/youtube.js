// YouTube links in playlists point at a video, a channel ID, or a channel *name*
// (/c/name, /user/name, /@name). The official embed only accepts video and channel IDs,
// so named channels must be mapped to their channel ID first.

const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIDEO_ID = /^[\w-]{11}$/;
const CHANNEL_ID = /^UC[\w-]{22}$/;
// Clean TV-style player: no control bar, no annotations, related videos from the same channel only.
// The YouTube logo and the title/"More videos" hover overlays cannot be disabled by parameters.
const PLAYER_PARAMS = 'autoplay=1&controls=0&rel=0&iv_load_policy=3&playsinline=1';

export function parseYouTubeUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!HOSTS.has(parsed.hostname)) return null;

  const segments = parsed.pathname.split('/').filter(Boolean);

  if (parsed.hostname === 'youtu.be') return videoRef(segments[0]);
  if (segments[0] === 'watch') return videoRef(parsed.searchParams.get('v'));
  if (segments[0] === 'live' || segments[0] === 'embed') return videoRef(segments[1]);
  if (segments[0] === 'channel' && CHANNEL_ID.test(segments[1] ?? '')) {
    return { kind: 'channel', id: segments[1] };
  }
  if ((segments[0] === 'c' || segments[0] === 'user') && segments[1]) {
    return { kind: 'named', key: `${segments[0]}/${segments[1].toLowerCase()}` };
  }
  if (segments[0]?.startsWith('@')) return { kind: 'named', key: segments[0].toLowerCase() };
  return null;
}

export function youtubeEmbedUrl(url, knownChannels) {
  const ref = parseYouTubeUrl(url);
  if (!ref) return null;
  if (ref.kind === 'video') return `https://www.youtube.com/embed/${ref.id}?${PLAYER_PARAMS}`;

  const channelId = ref.kind === 'channel' ? ref.id : knownChannels[ref.key];
  return channelId ? `https://www.youtube.com/embed/live_stream?channel=${channelId}&${PLAYER_PARAMS}` : null;
}

function videoRef(id) {
  return id && VIDEO_ID.test(id) ? { kind: 'video', id } : null;
}
