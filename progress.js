// What this browser remembers: the practice password, the chosen languages, which sentences are done, and the
// learner's own key.
const CHOICE = 'acChoice', DONE = 'acDone:', KEY = 'acOwnKey', PASSWORD = 'acPassword';

export function createProgress(storage = globalThis.localStorage) {
  const get = (k) => { try { return storage.getItem(k); } catch { return null; } };
  const set = (k, v) => { try { if (v === null) storage.removeItem(k); else storage.setItem(k, v); } catch { /* private mode */ } };
  const parse = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  return {
    getChoice() { const c = parse(get(CHOICE), null); return c && c.native && c.accent ? { native: c.native, accent: c.accent } : null; },
    setChoice({ native, accent }) { set(CHOICE, JSON.stringify({ native, accent })); },
    getDone(accent) { const d = parse(get(DONE + accent), []); return Array.isArray(d) ? d.filter((x) => typeof x === 'string') : []; },
    markDone(accent, id) { const d = this.getDone(accent); if (!d.includes(id)) set(DONE + accent, JSON.stringify([...d, id])); },
    // Back to the start screen, with every accent's progress forgotten. The own key and the password stay.
    startOver() {
      set(CHOICE, null);
      try { for (let i = storage.length - 1; i >= 0; i--) { const k = storage.key(i); if (k?.startsWith(DONE)) storage.removeItem(k); } } catch { /* nothing kept */ }
    },
    getOwnKey() { return get(KEY) || ''; },
    setOwnKey(k) { const v = String(k || '').trim(); set(KEY, v || null); },
    forgetOwnKey() { set(KEY, null); },
    getPassword() { return get(PASSWORD) || ''; },
    setPassword(p) { const v = String(p || '').trim(); set(PASSWORD, v || null); },
    forgetPassword() { set(PASSWORD, null); },
  };
}
