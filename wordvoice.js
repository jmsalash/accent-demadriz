// The coach's example of a word in the coach's own voice, when the speech service cannot make it: one short Gemini Live
// session with the same voice, told only to say the text once, which is closed as soon as it has spoken.
import { startLive as realStartLive } from './live.js';

export function sayWithCoachVoice({ getPass, text, startLive = realStartLive, loadSdk, timeoutMs = 15000 }) {
  return new Promise((resolve) => {
    const audio = [];
    let done = false, live = null;
    const finish = (out) => { if (done) return; done = true; clearTimeout(timer); try { live?.end(); } catch { /* closed */ } resolve(out); };
    const timer = setTimeout(() => finish(audio.length ? audio : null), timeoutMs);
    live = startLive({
      getPass,
      ...(loadSdk ? { loadSdk } : {}),
      on: (m) => {
        if (m.type === 'ready') live.start(text);
        else if (m.type === 'audio') audio.push(m.data);
        else if (m.type === 'turnDone') finish(audio.length ? audio : null);
        else if (m.type === 'closed') finish(audio.length ? audio : null);
      },
    });
  });
}
