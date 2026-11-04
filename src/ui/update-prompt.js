// "There is a new version" dialog of the Android app. Driven by the remote: focus stays inside it
// ([data-nav-scope]) and Back closes it (main.js backAction). Installing opens Android's installer,
// which asks the user to confirm; if they cancel, they come back here and can try again.
import { focusElement } from './spatial-nav.js';
import { installUpdate } from '../infra/app-update.js';

export function createUpdatePrompt(root, { onChange = () => {} } = {}) {
  const text = root.querySelector('[data-update-text]');
  const status = root.querySelector('[data-update-status]');
  const accept = root.querySelector('[data-update-accept]');
  const dismiss = root.querySelector('[data-update-dismiss]');

  let update = null;
  let returnFocusTo = null;
  let busy = false;

  accept.addEventListener('click', install);
  dismiss.addEventListener('click', close);

  function open(next) {
    update = next;
    returnFocusTo = document.activeElement;
    text.textContent = `La versión ${next.version} de Nodo ya está disponible. Al actualizar se abre el instalador de Android: confirmá con el control.`;
    setStatus(null);
    root.hidden = false;
    focusElement(accept);
    onChange();
  }

  function close() {
    if (root.hidden) return;
    root.hidden = true;
    if (returnFocusTo?.isConnected) focusElement(returnFocusTo);
    onChange();
  }

  async function install() {
    if (busy || !update) return;
    busy = true;
    setStatus('Descargando la actualización…');

    try {
      await installUpdate(update, (percent) => setStatus(`Descargando la actualización… ${percent}%`));
      setStatus('Se abrió el instalador. Si lo cancelaste, elegí Actualizar para intentar de nuevo.');
    } catch (error) {
      setStatus(error?.code === 'INSTALL_PERMISSION_REQUIRED'
        ? 'Android pide permiso: en la pantalla que se abrió, permití que Nodo instale apps. Después volvé y elegí Actualizar otra vez.'
        : 'No se pudo descargar la actualización. Revisá la conexión y probá de nuevo.');
    } finally {
      busy = false;
    }
  }

  function setStatus(message) {
    status.hidden = !message;
    status.textContent = message ?? '';
  }

  return {
    open,
    close,
    isOpen: () => !root.hidden,
  };
}
