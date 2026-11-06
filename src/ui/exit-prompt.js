// "Exit Nodo?" dialog of the Android app: Back on the first screen asked Android to close the app at
// once, and a few extra Back presses closed it by mistake. Focus starts on "Quedarme" so a stray OK
// keeps the app open; Back closes the dialog (main.js backAction), like the update dialog.
import { focusElement } from './spatial-nav.js';

export function createExitPrompt(root, { onExit = () => {}, onChange = () => {} } = {}) {
  const stay = root.querySelector('[data-exit-stay]');
  const leave = root.querySelector('[data-exit-leave]');

  let returnFocusTo = null;

  stay.addEventListener('click', close);
  leave.addEventListener('click', () => onExit());

  function open() {
    if (!root.hidden) return;
    returnFocusTo = document.activeElement;
    root.hidden = false;
    focusElement(stay);
    onChange();
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    if (returnFocusTo?.isConnected) focusElement(returnFocusTo);
    onChange();
  }

  return {
    open,
    close,
    isOpen: () => !root.hidden,
  };
}
