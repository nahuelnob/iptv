// Android app (Capacitor): streams play in ExoPlayer, drawn under the transparent WebView, so the
// device's own decoders handle what the WebView cannot (MPEG-2 video, HEVC inside MPEG-TS) and
// requests go out from the device itself, without the stream proxies.
// In a plain browser there is no such plugin: returns null and the web player is used.
export function nativeVideo() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  if (capacitor.isPluginAvailable && !capacitor.isPluginAvailable('NativeVideo')) return null;
  return capacitor.Plugins?.NativeVideo ?? capacitor.registerPlugin?.('NativeVideo') ?? null;
}
