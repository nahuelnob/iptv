// Back for the browse layer (drawer → header → section → category, design/PLAN.md section 3).
// Android TV browsers and Capacitor's WebView turn the remote's Back key into a history step, never a
// key event. So while Back has something to undo, one guard history entry is kept on top: Back pops
// it and the app undoes one step instead of leaving. The player keeps its own entry (player.js).
export function createBackGuard({ hasWork, onBack, isSuspended }) {
  // After a reload the browser restores our entry: adopt it instead of stacking another one.
  let guarded = Boolean(history.state?.backGuard);
  let dropping = false;

  window.addEventListener('popstate', () => {
    if (dropping) {
      dropping = false;
      guarded = false;
      // Something to undo may have appeared while the drop was in flight (sync skipped it): re-check.
      sync();
      return;
    }
    // Landing on our guard means an entry above it (the player's) was popped: not ours to handle.
    if (!guarded || history.state?.backGuard) return;
    guarded = false;
    onBack();
    sync();
  });

  // Called after every state or focus change.
  function sync() {
    if (isSuspended() || dropping) return;
    const needed = hasWork();
    if (needed && !guarded) {
      history.pushState({ backGuard: true }, '');
      guarded = true;
    } else if (!needed && guarded && history.state?.backGuard) {
      // Nothing left to undo: drop the guard so the next Back leaves the app as usual.
      dropping = true;
      history.back();
    }
  }

  // Esc and TV Back key codes go through history too, so both paths stay in step.
  function back() {
    if (guarded && history.state?.backGuard) history.back();
    else {
      onBack();
      sync();
    }
  }

  return { sync, back };
}
