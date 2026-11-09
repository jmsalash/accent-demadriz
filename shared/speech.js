// A clear recording of one word or sentence in the chosen accent, made with Gemini's speech model, so the learner can
// compare it with their own try. Plain fetch: works in the browser and in Node. Answers are 24 kHz PCM16, base64.
import { accentById } from './sentences.js';
import { DEFAULT_VOICE } from './gemini.js';

export const TTS_MODELS = ['gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts'];
export const MAX_SPEAK_CHARS = 200;
const url = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

export function speechPrompt(accent, text) {
  const a = accentById(accent);
  if (!a) throw new Error('unknown accent');
  const t = String(text || '').trim();
  if (!t || t.length > MAX_SPEAK_CHARS) throw new Error('bad text');
  const one = !/\s/.test(t);
  return `${a.voiceNote} Say ${one ? 'this single word, once, clearly and at a slightly slow, natural pace, with nothing before or after it' : 'this sentence once, clearly and at a natural pace'}: ${t}`;
}

export async function speak({ apiKey, accent, text, voice = DEFAULT_VOICE, fetchImpl = (...a) => fetch(...a) }) {
  const body = JSON.stringify({
    contents: [{ parts: [{ text: speechPrompt(accent, text) }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } },
  });
  let last;
  for (const model of TTS_MODELS) {
    const res = await fetchImpl(url(model), {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey }, body, signal: AbortSignal.timeout(30000),
    });
    const data = await res.json().catch(() => ({}));
    const audio = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData.data;
    if (res.ok && audio) return audio;
    last = Object.assign(new Error(data?.error?.message || `Gemini answered ${res.status}`), { status: res.status });
    // A missing, busy or used-up model (or an answer without sound) is worth trying the next one for; a bad key or text is not.
    if (!res.ok && ![404, 429, 500, 503].includes(res.status)) break;
  }
  throw last;
}
