// The practice password check, a one-use practice pass, and clear recordings of words. Every request to the service
// carries the password. With the learner's own key the browser asks Gemini itself and the service is never called.
import { mintToken, geminiError } from './shared/gemini.js';
import { buildCoachInstructions, COACH_TOOLS } from './shared/coach.js';
import { speak } from './shared/speech.js';
import { OWN_KEY_MINUTES } from './shared/settings.js';
import { SERVICE_URL } from './config.js';

const headers = (password) => ({ 'content-type': 'application/json', 'x-practice-password': String(password || '').trim() });

// 'ok', 'password' (wrong), 'rate' (too many wrong tries) or 'offline'.
export async function checkPassword({ password, base = SERVICE_URL, fetchImpl = (...a) => fetch(...a) }) {
  if (!String(password || '').trim()) return 'password';
  try {
    const res = await fetchImpl(`${base}/check`, { method: 'POST', headers: headers(password), body: '{}' });
    if (res.ok) return 'ok';
    if (res.status === 401) return 'password';
    if (res.status === 429) return 'rate';
    return 'offline';
  } catch {
    return 'offline';
  }
}

export async function getPass({ native, accent, focus = [], done = [], ownKey = '', password = '', base = SERVICE_URL, fetchImpl = (...a) => fetch(...a) }) {
  if (ownKey) {
    try {
      const minutes = OWN_KEY_MINUTES;
      const { token, model } = await mintToken({
        apiKey: ownKey, instructions: buildCoachInstructions({ native, accent, focus, done }), tools: COACH_TOOLS, sessionMinutes: minutes, fetchImpl,
      });
      return { token, model, minutes };
    } catch (e) {
      return { error: e?.name === 'TimeoutError' || e instanceof TypeError ? 'offline' : geminiError(e) };
    }
  }
  try {
    const res = await fetchImpl(`${base}/token`, {
      method: 'POST', headers: headers(password), body: JSON.stringify({ native, accent, focus, done }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) return { token: data.token, model: data.model, minutes: data.minutes || 10 };
    return { error: data.error || 'offline' };
  } catch {
    return { error: 'offline' };
  }
}

// The coach's clear recording of a word or sentence (base64 24 kHz PCM16), or '' when it cannot be made.
export async function getSpeech({ accent, text, ownKey = '', password = '', onPassword = () => {}, base = SERVICE_URL, fetchImpl = (...a) => fetch(...a) }) {
  try {
    if (ownKey) return await speak({ apiKey: ownKey, accent, text, fetchImpl });
    const res = await fetchImpl(`${base}/speak`, { method: 'POST', headers: headers(password), body: JSON.stringify({ accent, text }) });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) onPassword();
    return res.ok && data.audio ? data.audio : '';
  } catch {
    return '';
  }
}
