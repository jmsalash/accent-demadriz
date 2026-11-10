// The page: the password screen, the start screen (choose languages) and the practice screen (the eye, the reading test or sentence, the
// recordings to play, an optional Next, the transcript, Settings).
import { ACCENTS, NATIVE_LANGUAGES, accentById, sentencesFor, readingFor, pinyinOf } from './shared/sentences.js';
import { practiceOrder } from './shared/coach.js';
import { createProgress } from './progress.js';
import { getPass, getSpeech, getWordPass, checkPassword, releasePass, checkIn } from './pass.js';
import { sayWithCoachVoice } from './wordvoice.js';
import { messageFor } from './messages.js';
import { createTranscript, domSink } from './transcript.js';
import { createClips } from './clips.js';
import { createCoachState } from './coachstate.js';
import { startConversation } from './conversation.js';

const $ = (id) => document.getElementById(id);
const body = document.body;
const testing = new URLSearchParams(location.search).has('test');
const LABELS = {
  idle: 'Click the eye to start practising', connecting: 'Connecting…', intro: 'Your coach is starting',
  listening: 'Your turn · click the eye to stop', thinking: 'Listening…', speaking: 'Coach speaking', paused: 'Playing a recording',
};
const progress = createProgress();
const transcript = createTranscript(domSink($('transcript')));
const clips = createClips();
let conversation = null;
let coach = null;
let playing = null; // { source, ctx, button }
const asked = new Set(); // words whose clear recording was already requested
const failed = new Set(); // words whose clear recording could not be made (the learner can ask again)
// The sounds this visit's reading test found. Kept only while the page is open: every visit starts with the reading
// test, so the coach never judges from an earlier session.
const visitFocus = {};

// In the page's own checks, a stand-in for Gemini Live.
const testSdk = () => (testing && window.__fakeSdk ? async () => window.__fakeSdk : undefined);

const letters = (s) => s.toLowerCase().replace(/[^\p{L}'-]/gu, '');

function setState(state) {
  body.dataset.state = state;
  $('status').textContent = body.dataset.screen !== 'practice' ? '' : (LABELS[state] || '');
  $('eye').setAttribute('aria-label', conversation ? 'Stop practising' : 'Start practising');
}

function showScreen(screen) {
  body.dataset.screen = screen;
  setState('idle');
}

// The password screen, first on every browser that has not entered the right password (or after it changed).
function showGate(code = '') {
  stopTalking('user');
  progress.forgetPassword();
  $('gate-msg').textContent = code ? messageFor(code).text : '';
  if ($('settings').open) $('settings').close();
  showScreen('password');
  $('gate-password').value = '';
}

// After the password: the practice screen if languages were chosen before, else the start screen.
function enterSite() {
  const choice = currentChoice();
  if (choice && accentById(choice.accent) && NATIVE_LANGUAGES.includes(choice.native)) {
    showScreen('practice');
    renderPractice();
  } else {
    showScreen('start');
  }
}

function showMessage(code) {
  if (code === 'user' || code === 'hidden') return;
  if (code === 'password') { showGate('password'); return; }
  const m = messageFor(code, { ownKey: Boolean(progress.getOwnKey()) });
  $('message-text').textContent = m.text;
  $('message-settings').hidden = !m.settings;
  $('message-link').hidden = !m.link;
  $('message').hidden = false;
}
const hideMessage = () => { $('message').hidden = true; };

function fillSelect(select, items, placeholder) {
  select.replaceChildren(...(placeholder ? [new Option(placeholder, '')] : []), ...items.map(([value, label]) => new Option(label, value)));
}

// The sentence on screen, with the word being practised highlighted (or the part of a word, like "country").
function renderSentence(text, word, lines = false) {
  const el = $('sentence');
  el.replaceChildren();
  if (lines) {
    for (const line of text.split('\n')) {
      const span = document.createElement('span');
      span.className = 'line-of-text';
      el.append(span);
      highlight(span, line, word);
    }
    return;
  }
  highlight(el, text, word);
}

function highlight(el, text, word) {
  const want = word ? letters(word) : '';
  let marked = false;
  // Mandarin: the pinyin of each word sits above its characters.
  const pinyin = pinyinOf(text).split(/\s+/).filter(Boolean);
  let n = 0;
  const into = (token) => {
    if (!pinyin.length || !token.trim()) return el;
    const ruby = document.createElement('ruby');
    el.append(ruby);
    return ruby;
  };
  const above = (to) => { if (to === el) return; const rt = document.createElement('rt'); rt.textContent = pinyin[n++] || ''; to.append(rt); };
  for (const token of text.split(/(\s+)/)) {
    const to = into(token);
    if (!want || marked || !token.trim() || !letters(token).includes(want)) { to.append(token); above(to); continue; }
    marked = true;
    const at = token.toLowerCase().indexOf(want);
    const start = at >= 0 ? at : 0;
    const end = at >= 0 ? at + want.length : token.length;
    const mark = document.createElement('mark');
    mark.textContent = token.slice(start, end);
    to.append(token.slice(0, start), mark, token.slice(end));
    above(to);
  }
}

function currentChoice() { return progress.getChoice(); }

// What is on screen: the coach's current reading test or sentence, or else what comes next.
function renderPractice() {
  const choice = currentChoice();
  if (!choice) return;
  const list = sentencesFor(choice.accent);
  const focus = (visitFocus[choice.accent] || []);
  const done = progress.getDone(choice.accent);
  const shown = coach?.current;
  const reading = shown ? Boolean(shown.reading) : !focus.length;
  const next = !shown && !reading ? practiceOrder(choice.accent, { focus, done })[0] : null;
  const s = shown && !shown.reading ? list.find((x) => x.id === shown.id) : next;
  const allDone = !shown && !practiceOrder(choice.accent, { focus, done }).length;
  // Nothing to read until the coach has greeted the learner and put it on screen.
  const waiting = !shown && !allDone;
  $('all-done').hidden = !allDone;
  $('sentence-card').hidden = allDone || waiting;
  $('welcome').hidden = !waiting;
  $('welcome-text').textContent = reading
    ? 'Click the eye to begin. Your coach will greet you, explain what to do and show you a short text to read aloud.'
    : 'Click the eye to carry on. Your coach will greet you and show you the next sentence to practise.';
  $('focus').textContent = focus.length ? `Your focus: ${focus.join(' · ')}` : '';
  $('counter').textContent = allDone ? `${list.length} of ${list.length} sentences done`
    : waiting ? (reading ? 'First: a short reading test' : `${done.length} of ${list.length} sentences done`)
      : reading ? 'Reading test · read the whole text aloud' : `Sentence ${done.includes(s.id) ? done.indexOf(s.id) + 1 : done.length + 1} of ${list.length} · ${done.length} done`;
  if (!allDone && !waiting) {
    $('sentence-card').classList.toggle('reading', reading);
    if (reading) {
      renderSentence(readingFor(choice.accent).join('\n'), '', true);
      if (shown?.word) renderSentence(shown.text, shown.word, true);
      $('sound').textContent = 'The coach listens to every sound, then picks the ones to practise.';
    } else {
      renderSentence(s.text, shown?.word || '');
      $('sound').textContent = `Trains: ${s.sound}`;
    }
    $('sentence').lang = accentById(choice.accent).id;
  }
  askCoachRecording(choice.accent);
  renderAttempts();
}

// The coach's clear recording of the word (or sentence) being practised, made once and kept with the tries.
function askCoachRecording(accent) {
  const cur = coach?.current;
  if (!cur || cur.reading) return;
  const key = coach.key;
  if (asked.has(key) || failed.has(key)) return;
  asked.add(key);
  const text = cur.word || cur.text;
  const ownKey = progress.getOwnKey(), password = progress.getPassword();
  getSpeech({ accent, text, ownKey, password, onPassword: () => showGate('password') })
    // When the speech service cannot make it (its free allowance is used up, for example), the coach's own Live voice
    // says it: the same voice as the conversation.
    .then((audio) => (audio ? [audio] : sayWithCoachVoice({ getPass: () => getWordPass({ accent, ownKey, password }), text, loadSdk: testSdk() })))
    .then((chunks) => {
      asked.delete(key);
      if (chunks?.length) clips.addGemini(chunks, key); else failed.add(key);
      if (coach?.key === key) renderAttempts();
    });
}

function retryCoachRecording() {
  const choice = currentChoice();
  if (!choice || !coach?.key) return;
  failed.delete(coach.key);
  askCoachRecording(choice.accent);
  renderAttempts();
}

function renderAttempts() {
  const box = $('attempts');
  box.replaceChildren();
  const key = coach?.key;
  const list = key ? clips.list(key) : [];
  // Next is optional: the coach moves on by itself. It shows while a word or sentence is being practised.
  $('review').hidden = !(conversation && coach?.current && !coach.current.reading);
  if (!coach?.current) return;
  const label = document.createElement('p');
  label.className = 'label';
  label.textContent = coach.current.reading ? 'Your reading' : coach.current.word ? `Recordings of "${coach.current.word}"` : 'Recordings of this sentence';
  box.append(label);
  // The coach's button is always there for a word or sentence: playing, still being made, or to ask again.
  const hasCoach = list.some((c) => c.kind === 'gemini');
  const waiting = !coach.current.reading && !hasCoach && asked.has(key);
  if (!coach.current.reading && !hasCoach) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'clip gemini';
    if (waiting) { b.disabled = true; b.textContent = 'Coach…'; }
    else { b.textContent = 'Coach: tap to load'; b.title = "The coach's recording could not be made; tap to try again"; b.addEventListener('click', retryCoachRecording); }
    box.append(b);
  }
  for (const clip of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `clip ${clip.kind}`;
    b.textContent = clip.kind === 'gemini' ? 'Play coach' : (coach.current.reading ? 'Your reading' : `Play mine ${clip.n}`);
    if (clip.heard && clip.kind === 'you' && !coach.current.reading) { const h = document.createElement('span'); h.className = 'heard'; h.textContent = `“${clip.heard.slice(0, 24)}”`; b.append(h); b.title = `Heard: ${clip.heard}`; }
    if (playing?.clip === clip) { b.classList.add('playing'); b.setAttribute('aria-label', `Stop ${b.textContent}`); }
    b.addEventListener('click', () => playClip(clip));
    box.append(b);
  }
  if (!list.some((c) => c.kind === 'you')) label.textContent += ': your tries will appear here';
}

function stopPlayback() {
  if (!playing) return;
  const p = playing;
  playing = null;
  if (p.stop) { try { p.stop(); } catch { /* gone */ } } else {
    try { p.source.onended = null; p.source.stop(); } catch { /* already ended */ }
    p.ctx.close().catch(() => {});
  }
  conversation?.resume();
  renderAttempts();
}

// Plays a recording with the conversation paused, so the coach does not hear it or talk over it. Clicking the
// recording that is playing stops it.
function playClip(clip) {
  if (playing?.clip === clip) { stopPlayback(); return; }
  stopPlayback();
  const AC = window.AudioContext || window.webkitAudioContext;
  const ctx = new AC();
  const buffer = ctx.createBuffer(1, clip.samples.length, clip.rate);
  buffer.getChannelData(0).set(clip.samples);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  conversation?.pause();
  playing = { source, ctx, clip };
  source.onended = () => { if (playing?.source === source) stopPlayback(); };
  source.start();
  renderAttempts();
}

function stopTalking(reason) { stopPlayback(); conversation?.stop(reason); }

function talk() {
  if (body.dataset.screen !== 'practice') return;
  if (conversation) { stopTalking('user'); return; }
  const choice = currentChoice();
  if (!choice) { showScreen('start'); return; }
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) { showMessage('insecure'); return; }
  hideMessage();
  const done = progress.getDone(choice.accent);
  const focus = (visitFocus[choice.accent] || []);
  coach = createCoachState({ accent: choice.accent, done, focus });
  let passId = '';
  // Every 30 s the page checks in, so its place stays held and it stops if the owner ended the session.
  const alive = setInterval(async () => {
    if (!passId || !conversation) return;
    if ((await checkIn({ passId, password: progress.getPassword() })) === 'ended') stopTalking('ended');
  }, testing && window.__aliveMs ? window.__aliveMs : 30_000);
  const ownKey = progress.getOwnKey();
  const loadSdk = testSdk();
  conversation = startConversation({
    // The pass's id, so its place on the site's key is given back as soon as this conversation ends.
    getPass: async () => { const p = await getPass({ ...choice, focus, done, ownKey, password: progress.getPassword() }); passId = p?.passId || ''; return p; },
    transcript,
    coach,
    clips,
    loadSdk,
    onState: setState,
    onScreen: renderPractice,
    onDone: (id) => progress.markDone(choice.accent, id),
    onFocus: (sounds) => { visitFocus[choice.accent] = sounds; },
    onLevel: (l) => body.style.setProperty('--level', Number(l).toFixed(3)),
    onEnd: (reason) => {
      clearInterval(alive);
      if (reason !== 'ended') releasePass({ passId, password: progress.getPassword() });
      passId = '';
      conversation = null;
      stopPlayback();
      setState('idle');
      renderAttempts();
      showMessage(reason);
    },
  });
  setState(conversation.state);
}

function showKey() {
  const k = progress.getOwnKey();
  $('settings-key').textContent = k ? `Using your own key (…${k.slice(-4)}).` : "Using this site's free key.";
  $('forget-key').hidden = !k;
  $('key').value = k;
  if (k) $('advanced').open = true; // a key in use is never hidden
}

function startOver() {
  stopTalking('user');
  progress.startOver();
  coach = null;
  clips.clear();
  asked.clear();
  failed.clear();
  for (const k of Object.keys(visitFocus)) delete visitFocus[k];
  transcript.clear();
  $('native').value = ''; $('accent').value = ''; $('feedback-native').checked = false;
  $('advanced').open = Boolean(progress.getOwnKey());
  $('begin').disabled = true;
  if ($('settings').open) $('settings').close();
  showScreen('start');
}

function init() {
  const natives = NATIVE_LANGUAGES.map((n) => [n, n]);
  const accents = ACCENTS.map((a) => [a.id, a.label]);
  fillSelect($('native'), natives, 'Choose your language');
  fillSelect($('accent'), accents, 'Choose an accent');
  fillSelect($('s-native'), natives);
  fillSelect($('s-accent'), accents);
  const ready = () => { $('begin').disabled = !($('native').value && $('accent').value); };
  $('native').addEventListener('change', ready);
  $('accent').addEventListener('change', ready);

  $('start-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!$('native').value || !$('accent').value) return;
    progress.setChoice({ native: $('native').value, accent: $('accent').value, feedbackNative: $('feedback-native').checked });
    progress.setOwnKey($('key').value);
    showKey();
    coach = null;
    transcript.clear();
    showScreen('practice');
    renderPractice();
  });
  $('eye').addEventListener('click', talk);

  const dialog = $('settings');
  const openSettings = () => {
    hideMessage(); showKey();
    const c = currentChoice();
    if (c) { $('s-native').value = c.native; $('s-accent').value = c.accent; $('s-feedback-native').checked = Boolean(c.feedbackNative); }
    $('s-key').value = ''; $('settings-msg').textContent = '';
    dialog.showModal();
  };
  $('open-settings').addEventListener('click', openSettings);
  $('message-settings').addEventListener('click', openSettings);
  $('message-close').addEventListener('click', hideMessage);

  $('settings-lang-form').addEventListener('submit', (e) => {
    e.preventDefault();
    stopTalking('user');
    progress.setChoice({ native: $('s-native').value, accent: $('s-accent').value, feedbackNative: $('s-feedback-native').checked });
    coach = null;
    transcript.clear();
    renderPractice();
    $('settings-msg').textContent = 'Saved. Close Settings and click the eye to practise.';
  });
  $('settings-key-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const k = $('s-key').value.trim();
    if (!k) { $('settings-msg').textContent = 'Paste a key first.'; return; }
    stopTalking('user');
    progress.setOwnKey(k); showKey(); $('s-key').value = '';
    $('settings-msg').textContent = 'Key saved in this browser. Your next practice uses it.';
  });
  $('forget-key').addEventListener('click', () => {
    stopTalking('user');
    progress.forgetOwnKey(); showKey();
    $('settings-msg').textContent = "Your key was forgotten. This site's free key is used again.";
  });
  $('start-over').addEventListener('click', startOver);
  $('retake').addEventListener('click', () => {
    stopTalking('user');
    const c = currentChoice();
    if (c) delete visitFocus[c.accent];
    coach = null;
    renderPractice();
    $('settings-msg').textContent = 'Done. Close Settings and click the eye to take the reading test.';
  });
  $('next').addEventListener('click', () => { stopPlayback(); conversation?.next(); });
  $('done-start-over').addEventListener('click', startOver);

  // Switching to another window or tab keeps the practice going; only leaving the page ends it.
  addEventListener('pagehide', () => stopTalking('hidden'));

  $('gate-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = $('gate-password').value.trim();
    if (!password) { $('gate-msg').textContent = 'Type the password first.'; return; }
    $('gate-enter').disabled = true;
    $('gate-msg').textContent = '';
    const verdict = await checkPassword({ password });
    $('gate-enter').disabled = false;
    if (verdict === 'ok') { progress.setPassword(password); enterSite(); return; }
    $('gate-msg').textContent = verdict === 'password' ? messageFor('password').text
      : verdict === 'rate' ? 'Too many wrong tries. Please wait an hour and try again.'
        : 'The website cannot be reached right now. Please try again in a moment.';
  });

  showKey();
  if (progress.getPassword()) enterSite(); else showGate();
  if (testing) window.__ac = { transcript, clips, progress, get coach() { return coach; }, get conversation() { return conversation; }, renderPractice, showMessage };
}

init();
