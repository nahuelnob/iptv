// Persists the viewer's library (favorites, last watched) in localStorage.
// Storage can throw (private mode, full quota, some TV webviews): the app keeps working in memory.
import { emptyLibrary, parseLibrary } from '../domain/library.js';

const LIBRARY_KEY = 'iptv.library.v1';

export function loadLibrary() {
  try {
    return parseLibrary(localStorage.getItem(LIBRARY_KEY));
  } catch {
    return emptyLibrary();
  }
}

export function saveLibrary(library) {
  try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(library)); } catch { /* in memory only */ }
}
