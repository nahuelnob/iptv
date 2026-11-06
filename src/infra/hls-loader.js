// hls.js plays HLS in browsers. The Android app plays every stream in ExoPlayer, so it never needs
// hls.js: loading it from the page head made every app launch download it anyway. It now loads on
// demand, and browsers start it as soon as the player is created so the first channel is not slower.
const HLS_URL = 'https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';

let loading = null;

// Resolves with window.Hls, or null when the script cannot load (the player then tries the
// browser's own HLS support).
export function loadHls() {
  if (window.Hls) return Promise.resolve(window.Hls);

  if (!loading) {
    loading = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = HLS_URL;
      script.async = true;
      script.onload = () => resolve(window.Hls || null);
      script.onerror = () => {
        loading = null;
        script.remove();
        resolve(null);
      };
      document.head.append(script);
    });
  }

  return loading;
}
