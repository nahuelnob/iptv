// Android app (Capacitor): the App plugin receives the remote's Back key. Without a listener it only
// steps WebView history back and, at the first entry, does nothing, so the app could never be left.
// Mirror a browser instead: step history back while there is history (the back guard, the player and
// open dialogs handle it as usual); at the first screen, ask before leaving (onExitRequest), since a
// few extra Back presses used to close the app by mistake. In a plain browser there is no Capacitor:
// no-op.
export function connectNativeBack({ onExitRequest = exitApp } = {}) {
  const App = appPlugin();
  if (!App?.addListener) return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) history.back();
    else onExitRequest();
  });
}

export function exitApp() {
  appPlugin()?.exitApp?.();
}

function appPlugin() {
  const capacitor = window.Capacitor;
  if (!capacitor?.isNativePlatform?.()) return null;
  return capacitor.Plugins?.App ?? capacitor.registerPlugin?.('App');
}
