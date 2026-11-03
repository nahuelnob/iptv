// Container: wires playlist loading, the channel rows and the player together.
import { parseM3U, groupChannels } from './domain/playlist.js';
import { loadFromUrl, loadFromFile, rememberUrl, lastUrl } from './infra/playlist-source.js';
import { renderRows } from './ui/channel-rows.js';
import { createPlayer } from './ui/player.js';
import { enableSpatialNav, focusElement } from './ui/spatial-nav.js';

const form = document.querySelector('[data-source-form]');
const urlInput = form.querySelector('input[type="url"]');
const fileInput = document.querySelector('[data-source-file]');
const feedback = document.querySelector('[data-source-feedback]');
const rowsContainer = document.querySelector('[data-rows]');
const emptyState = document.querySelector('[data-empty]');
const player = createPlayer(document.querySelector('[data-player]'));

enableSpatialNav();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;
  await load(() => loadFromUrl(url), url);
});

// The "Open file" control is a <label>, which ignores Enter: open the picker for remote users.
fileInput.closest('label').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;
  if (file) await load(() => loadFromFile(file), file.name);
  fileInput.value = '';
});

async function load(readText, sourceLabel) {
  setFeedback(`Loading ${sourceLabel}…`);
  try {
    const channels = parseM3U(await readText());
    if (!channels.length) {
      setFeedback('No channels found. Check that the file is an M3U playlist.', true);
      return;
    }
    if (sourceLabel.includes('://')) rememberUrl(sourceLabel);
    showChannels(channels);
    setFeedback(`${channels.length} channels loaded.`);
  } catch (error) {
    setFeedback(error.message, true);
  }
}

function showChannels(channels) {
  emptyState.hidden = true;
  renderRows(rowsContainer, groupChannels(channels), { onSelect: player.open });
  const firstCard = rowsContainer.querySelector('[data-nav]');
  if (firstCard) focusElement(firstCard);
}

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle('source__feedback--error', isError);
}

const saved = lastUrl();
if (saved) urlInput.value = saved;
