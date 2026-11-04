// Polyfills for old Android TV WebViews (the Claro B866V2 deco ships Chrome 66 and cannot update it).
// Only APIs the app uses; each is skipped where the browser already has it. The build
// (scripts/build-web.mjs) lowers the syntax; this file covers the runtime APIs it cannot.

if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

if (typeof queueMicrotask !== 'function') {
  window.queueMicrotask = (callback) => {
    Promise.resolve().then(callback).catch((error) => setTimeout(() => { throw error; }));
  };
}

if (!Element.prototype.replaceChildren) {
  Element.prototype.replaceChildren = function replaceChildren(...nodes) {
    while (this.lastChild) this.removeChild(this.lastChild);
    this.append(...nodes);
  };
}

if (!Element.prototype.toggleAttribute) {
  Element.prototype.toggleAttribute = function toggleAttribute(name, force) {
    const present = this.hasAttribute(name);
    const next = force === undefined ? !present : Boolean(force);
    if (next && !present) this.setAttribute(name, '');
    if (!next && present) this.removeAttribute(name);
    return next;
  };
}

if (!String.prototype.matchAll) {
  String.prototype.matchAll = function matchAll(regexp) {
    const flags = regexp.flags.includes('g') ? regexp.flags : `${regexp.flags}g`;
    const pattern = new RegExp(regexp.source, flags);
    const matches = [];
    let match;
    while ((match = pattern.exec(this)) !== null) {
      matches.push(match);
      if (match[0] === '') pattern.lastIndex += 1;
    }
    return matches[Symbol.iterator]();
  };
}
