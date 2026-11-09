// What the page remembers. Every visit is a new session: the chosen languages and the sentences done are kept only
// while the page is open. Only the practice password and the learner's own key stay in this browser.
const KEY = 'acOwnKey', PASSWORD = 'acPassword';
const OLD = ['acChoice', 'acDone:']; // kept by older versions of the page: removed

export function createProgress(storage = globalThis.localStorage) {
  const get = (k) => { try { return storage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { if (v === null) storage.removeItem(k); else storage.setItem(k, v); } catch { /* private mode */ } };
  try { for (let i = storage.length - 1; i >= 0; i--) { const k = storage.key(i); if (OLD.some((o) => k?.startsWith(o))) storage.removeItem(k); } } catch { /* nothing kept */ }
  let choice = null;
  const done = new Map(); // accent -> [sentence ids]
  return {
    getChoice() { return choice ? { ...choice } : null; },
    setChoice({ native, accent }) { choice = native && accent ? { native, accent } : null; },
    getDone(accent) { return [...(done.get(accent) || [])]; },
    markDone(accent, id) { const d = done.get(accent) || []; if (!d.includes(id)) done.set(accent, [...d, id]); },
    // Back to the start screen, with every accent's progress forgotten. The own key and the password stay.
    startOver() { choice = null; done.clear(); },
    getOwnKey() { return get(KEY) || ''; },
    setOwnKey(k) { const v = String(k || '').trim(); set(KEY, v || null); },
    forgetOwnKey() { set(KEY, null); },
    getPassword() { return get(PASSWORD) || ''; },
    setPassword(p) { const v = String(p || '').trim(); set(PASSWORD, v || null); },
    forgetPassword() { set(PASSWORD, null); },
  };
}
