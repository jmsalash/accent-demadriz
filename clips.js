// The recordings of a practice: the learner's tries and Gemini's latest version, per sentence-and-word key.
import { pcm16B64ToF32 } from './audio.js';

const GEMINI_RATE = 24000;
const join = (chunks) => {
  const n = chunks.reduce((t, c) => t + c.length, 0);
  const out = new Float32Array(n);
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
};

export function createClips({ perWord = 8, total = 30 } = {}) {
  let clips = []; // oldest first: { kind, key, n, samples, rate }
  const tries = new Map(); // key -> last try number
  const trim = () => {
    for (const key of new Set(clips.map((c) => c.key))) {
      const mine = clips.filter((c) => c.key === key && c.kind === 'you');
      if (mine.length > perWord) { const drop = new Set(mine.slice(0, mine.length - perWord)); clips = clips.filter((c) => !drop.has(c)); }
    }
    if (clips.length > total) clips = clips.slice(clips.length - total);
  };
  return {
    addYou(chunks, rate, key) {
      const samples = join(chunks);
      if (!samples.length) return null;
      const n = (tries.get(key) || 0) + 1;
      tries.set(key, n);
      const clip = { kind: 'you', key, n, samples, rate };
      clips.push(clip);
      trim();
      return clip;
    },
    addGemini(b64Chunks, key) {
      const samples = join(b64Chunks.map(pcm16B64ToF32));
      if (!samples.length) return null;
      clips = clips.filter((c) => !(c.key === key && c.kind === 'gemini'));
      const clip = { kind: 'gemini', key, n: 0, samples, rate: GEMINI_RATE };
      clips.push(clip);
      trim();
      return clip;
    },
    list(key) {
      const mine = clips.filter((c) => c.key === key);
      return [...mine.filter((c) => c.kind === 'gemini'), ...mine.filter((c) => c.kind === 'you')];
    },
    get size() { return clips.length; },
    clear() { clips = []; tries.clear(); },
  };
}
