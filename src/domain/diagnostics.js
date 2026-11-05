// Video diagnostics shown in the player while the developer options are on: what each device does
// with a channel (decoder, format, dropped frames), readable on the TV itself where adb is locked.

export const SURFACES = { texture: 'TextureView', surface: 'SurfaceView' };

// "Android 11" in the WebView user-agent; null outside Android.
export function androidVersionOf(userAgent) {
  return userAgent.match(/Android (\d+(?:\.\d+)?)/)?.[1] ?? null;
}

// ExoPlayer's format report: codec, resolution and frame rate, leaving out unknown values (-1).
export function describeFormat(format) {
  if (!format) return '—';
  const parts = [format.codecs || format.mime];
  if (format.width > 0 && format.height > 0) parts.push(`${format.width}×${format.height}`);
  if (format.frameRate > 0) parts.push(`${Math.round(format.frameRate * 100) / 100} fps`);
  return parts.filter(Boolean).join(' · ') || '—';
}

export function describeDropped(count) {
  if (!count) return 'ninguno';
  return count === 1 ? '1 cuadro' : `${count} cuadros`;
}

// TextureView is the default (SurfaceView left the B866V2 black); the switch tries the other one.
export function nextSurface(current) {
  return current === 'surface' ? 'texture' : 'surface';
}
