// Android app (Capacitor): the App plugin receives the remote's Back key. Without a listener it only
// steps WebView history back and, at the first entry, does nothing, so the app could never be left.
// Mirror a browser instead: step history back while there is history (the back guard and the player
// handle it as usual), otherwise exit the app. In a plain browser there is no Capacitor: no-op.
export function connectNativeBack() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return;
  const App = capacitor.Plugins?.App ?? capacitor.registerPlugin?.('App');
  if (!App?.addListener) return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back();
    else App.exitApp();
  });
}
