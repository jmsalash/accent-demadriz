// One practice conversation: microphone, Gemini's voice, the eye's states, the transcript, the tool calls that drive
// the screen, and the recordings of each try.
// onState(state): connecting, intro, listening, thinking, speaking, paused.
// onScreen(change): sentence, word, focus, done, clips, turn.
// After the coach's feedback it is straight away the learner's turn again: no buttons to press. The recordings stay
// on screen to play whenever they like, and next() (an optional button) asks the coach to move on.
// onEnd(reason): user, mic, quota, busy, rate, daily, badkey, offline, limit, dropped.
import { Player, rms, downsampleTo16k } from './audio.js';
import { startLive as realStartLive } from './live.js';
import { soundsLike } from './shared/similar.js';


const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 };
const CONNECT_TIMEOUT_MS = 15000;
const VOICE_LEVEL = 0.006;   // a frame louder than this counts as the learner speaking (quiet microphones too)
const ECHO_MS = 400;         // after the coach stops talking, its voice can still reach the microphone
const READ_ENOUGH = 0.6;     // share of the reading text's words heard that means the learner has read it
const MAX_TRY_FRAMES = 450;  // about 45 seconds of one try (the reading test is the longest)
const CLIP_RATE = 16000;     // recordings are kept at 16 kHz to save memory
const MOVE_GRACE_MS = 1500; // how long the coach has to make a move it announced, after its voice ends
const WORKLET_URL = new URL('./mic-worklet.js', import.meta.url).href;

async function workletMic(ctx, stream, onFrame) {
  await ctx.audioWorklet.addModule(WORKLET_URL);
  const src = ctx.createMediaStreamSource(stream);
  const node = new AudioWorkletNode(ctx, 'cva-mic-frames');
  src.connect(node);
  node.port.onmessage = (ev) => onFrame(ev.data);
  return { disconnect: () => { try { node.disconnect(); } catch { /* gone */ } } };
}

const browserDeps = () => ({
  startLive: realStartLive,
  getUserMedia: (c) => navigator.mediaDevices.getUserMedia(c),
  AudioContext: window.AudioContext || window.webkitAudioContext,
  makePlayer: (ctx) => new Player(ctx),
  connectMic: workletMic,
  raf: (fn) => requestAnimationFrame(fn),
  cancelRaf: (id) => cancelAnimationFrame(id),
});

// Must be called inside the click: iOS only unlocks audio there.
export function startConversation({ getPass, transcript, coach, clips, onState, onScreen = () => {}, onDone = () => {}, onFocus = () => {}, onLevel = () => {}, onEnd, loadSdk, deps = {} }) {
  const d = { ...(deps.startLive ? {} : browserDeps()), ...deps };
  const MOVE_GRACE = d.moveGraceMs ?? MOVE_GRACE_MS;
  const ctx = new d.AudioContext();
  ctx.resume?.();
  const player = d.makePlayer(ctx);
  const c = { ready: false, introDone: false, ended: false, paused: false, tried: false, raf: 0, state: 'connecting', minutes: 10,
    you: [], youVoice: false, youKey: '', youText: '', answering: false, queued: [] };
  const passWithMinutes = async () => { const p = await getPass(); if (p?.minutes) c.minutes = p.minutes; return p; };
  const setState = (s) => { c.state = s; onState(s); };
  setState('connecting');

  const stopTracks = (stream) => stream?.getTracks().forEach((t) => t.stop());
  const levelLoop = () => { if (c.ended) return; onLevel(player.level); c.raf = d.raf(levelLoop); };
  const afterDrain = (fn) => {
    const tick = () => { if (c.ended) return; if (player.playing || c.paused) { d.raf(tick); return; } fn(); };
    tick();
  };

  // The learner's try ends when Gemini starts answering: keep it with the word it was for.
  const keepTry = () => {
    if (c.youVoice && c.you.length) {
      const clip = clips.addYou(c.you.map((f) => downsampleTo16k(f, ctx.sampleRate)), CLIP_RATE, c.youKey);
      c.lastClip = clip;
      c.tried = true;
      c.triedKey = c.youKey;
      c.checked = false;
      if (c.youKey === coach.key) coach.noteTry();
      onScreen('clips');
    }
    c.you = []; c.youVoice = false;
  };
  // The reading test: once most of the text has been heard, the coach must give its verdict and move on to sentences.
  // If its answer ends without doing that, it is reminded once.
  const words = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').match(/\p{L}+/gu) || [];
  const checkReading = () => {
    const cur = coach.current;
    if (!cur?.reading) { c.readHeard = ''; c.nudged = false; return false; }
    c.readHeard = `${c.readHeard || ''} ${c.youText}`;
    if (c.nudged) return false;
    const heard = new Set(words(c.readHeard));
    const want = [...new Set(words(cur.text))];
    if (!want.length || want.filter((w) => heard.has(w)).length / want.length < READ_ENOUGH) return false;
    c.nudged = true;
    c.live.say('[Note from the website: the learner has finished reading the text. If you have not given your feedback yet, give it now, once. Then call set_focus with the sounds that need the most work and show_sentence, and ask them to read it. Do not repeat feedback you already gave.]');
    return true;
  };
  // Only a clearly different word counts (like "window" for "through"): an accent error the recogniser wrote
  // differently ("true" for "through", "terror" for "there") is the coach's to judge, once.
  const clearlyDifferent = (heard, word) => {
    const w = words(word).join('');
    const said = words(heard);
    if (!w || !said.length) return false;
    return said.every((t) => soundsLike(t, w) < 0.4);
  };
  // The speech recogniser's text of the try: when it does not contain the word being drilled, the coach is told, so a
  // different word is not taken for a good try.
  const checkWord = () => {
    if (c.checked) return false;
    c.checked = true;
    const word = coach.current?.word;
    const heard = c.youText.trim();
    if (c.lastClip && heard) c.lastClip.heard = heard;
    if (!word || c.triedKey !== coach.key || !heard) return false;
    if (!clearlyDifferent(heard, word)) return false;
    c.live.say(`[Note from the website: the speech recogniser heard "${heard.slice(0, 80)}", a different word from "${word}". If you have not already said so, tell the learner briefly that it was not "${word}" and ask them to say "${word}". Do not repeat any other feedback.]`);
    return true;
  };

  // The coach saying it moves on ("let's move on to the next word") without calling the tool leaves the old word on
  // screen and the learner stuck. The website keeps track of each answer: what the coach said, whether it moved the
  // screen, and whether it finished a sentence without showing the next one. If it did not move, it is told once.
  const MOVING = /\b(let'?s move on|let us move on|moving on|move on to|on to the next|the next (word|sentence))|\b(pasemos|pasamos a|vamos (a|con) la siguiente|siguiente (palabra|frase|oraci))|\b(passons|on passe|mot suivant|phrase suivante)|\b(volgende (woord|zin)|we gaan verder|laten we doorgaan)|\b(passiamo|prossima (parola|frase)|andiamo avanti)/i;
  // Gemini often says "let's move on" in one message and calls the tool in the next, so the website first waits a
  // moment (after the coach's voice has finished) and only reminds it if the screen still has not changed.
  const checkMove = () => {
    const said = c.turnSaid || '', moved = c.turnMoved, finished = c.turnFinished;
    c.turnSaid = ''; c.turnMoved = false; c.turnFinished = false;
    const cur = coach.current;
    if (moved || !cur || cur.reading || c.moveNudged === coach.key) return false;
    if (!finished && !MOVING.test(said)) return false;
    const key = coach.key;
    c.moveWait = key;
    afterDrain(() => {
      clearTimeout(c.moveTimer);
      c.moveTimer = setTimeout(() => {
        if (c.ended || c.moveWait !== key) return;
        c.moveWait = '';
        if (coach.key !== key) return;
        remindMove(finished);
      }, MOVE_GRACE);
    });
    return true;
  };
  // Anything new from the coach (a move, or more speech) means it is not stuck: stop waiting.
  const stopWaitingForMove = () => { c.moveWait = ''; clearTimeout(c.moveTimer); };
  const remindMove = (finished) => {
    const cur = coach.current;
    c.moveNudged = coach.key;
    c.live.say(finished
      ? '[Note from the website: you marked the sentence as done, but the next one is not on screen yet. Call show_sentence with the next sentence now and ask the learner to read it.]'
      : `[Note from the website: you said you are moving on, but the screen still shows "${cur.word || cur.text}". Do it now: call focus_word with the next word that needs work, or sentence_done and show_sentence. Do not repeat your feedback.]`);
  };

  // The coach praising a try that the speech recogniser wrote as another word ("tree" for "three"): it is told, once
  // per try, so it corrects itself instead of letting a wrong sound pass.
  const PRAISE = /\b(right|correct|well done|good|great|perfect|excellent|nice|exactly|bien|correcto|perfecto|muy bien|bravo|parfait|très bien|goed|prima|uitstekend|giusto|esatto|perfetto|bene)\b/i;
  const DOUBT = /\b(not|no|isn'?t|wasn'?t|still|almost|closer|nearly|quite|todavía|casi|pas|encore|presque|niet|nog|bijna|non|ancora|quasi)\b/i;
  const checkPraise = () => {
    const word = coach.current?.word, heard = coach.heardOther;
    if (!word || !heard || c.praiseNoted || !c.tried) return false;
    const said = c.turnSaid || '';
    if (!PRAISE.test(said) || DOUBT.test(said)) return false;
    c.praiseNoted = true;
    c.live.say(`[Note from the website: the speech recogniser heard "${heard}", not "${word}". That usually means the sound was not right. If you told the learner it was right, correct yourself in one short sentence, say what you heard, and ask them to say "${word}" again.]`);
    return true;
  };

  function onFrame(f32) {
    if (c.ended || c.paused || !c.introDone || !c.live) return;
    // One speaks at a time: while the coach talks (and a moment after, for its echo) the microphone is not sent, so
    // the coach is never cut off half-way or answers its own voice, which led to repeated and mixed-up feedback.
    const now = Date.now();
    if (player.playing) { c.coachUntil = now + ECHO_MS; return; }
    if (now < (c.coachUntil || 0)) return;
    c.live.sendAudio(f32, ctx.sampleRate);
    if (!c.youVoice) {
      if (rms(f32) < VOICE_LEVEL) { c.you = [f32]; return; } // keep one frame of lead-in
      c.youVoice = true;
      c.youKey = coach.key;
      stopWaitingForMove(); // the learner carries on: they are not stuck
      coach.noteHeard?.(''); c.praiseNoted = false;
    }
    if (c.you.length < MAX_TRY_FRAMES) c.you.push(f32);
  }

  function end(reason) {
    if (c.ended) return;
    c.ended = true;
    clearTimeout(c.timer);
    clearTimeout(c.moveTimer);
    d.cancelRaf?.(c.raf);
    onLevel(0);
    stopTracks(c.stream);
    c.mic?.disconnect();
    player.stop();
    c.live?.end();
    Promise.resolve(ctx.close?.()).catch(() => {});
    onEnd(reason);
  }

  function onTool(calls) {
    // The coach answering in any way ends the learner's turn: their try is kept first, so the coach state counts it.
    if (!c.answering) { c.answering = true; keepTry(); }
    stopWaitingForMove();
    const answers = calls.map((call) => {
      const { response, change } = coach.handle(call);
      if (change === 'done') onDone(call.args.id);
      if (change === 'focus') onFocus(coach.focus);
      if (change) onScreen(change);
      if (change === 'word' || change === 'sentence') c.turnMoved = true;
      if (change === 'done') c.turnFinished = true;
      return { id: call.id, name: call.name, response };
    });
    c.live.respond(answers);
  }

  function onEvent(m) {
    if (c.ended) return;
    switch (m.type) {
      case 'ready':
        c.ready = true;
        c.readyAt = Date.now();
        clearTimeout(c.timer);
        setState('intro');
        levelLoop();
        c.live.start();
        break;
      case 'tool':
        onTool(m.calls);
        break;
      case 'audio':
        if (!c.answering) { c.answering = true; keepTry(); }
        stopWaitingForMove();
        if (c.paused) { c.queued.push(m.data); break; }
        player.play(m.data);
        if (c.introDone && c.state !== 'speaking') setState('speaking');
        break;
      case 'you':
        if (!c.introDone) break;
        c.youText = m.text;
        coach.noteSpoken();
        coach.noteHeard?.(m.text);
        transcript.you(m.text);
        if (c.state === 'listening') setState('thinking');
        break;
      case 'me':
        c.turnSaid = `${c.turnSaid || ''} ${m.text}`;
        transcript.me(m.text);
        break;
      case 'interrupted':
        player.stop();
        c.queued = [];
        c.answering = false;
        if (c.introDone && !c.paused) setState('listening');
        break;
      case 'turnDone':
        transcript.turnDone();
        c.answering = false;
        // A different word than the one drilled: the coach answers again before the learner's turn.
        // A move the coach announced but has not made yet is waited for in the background: the learner's turn
        // starts straight away all the same.
        if (checkPraise()) { c.turnSaid = ''; c.turnMoved = false; c.turnFinished = false; c.youText = ''; break; }
        if (!(c.introDone && checkMove())) {
          if (c.tried && checkWord()) { c.youText = ''; break; }
          if (checkReading()) { c.youText = ''; break; }
        }
        c.youText = '';
        afterDrain(() => {
          c.introDone = true; c.you = []; c.youVoice = false; c.tried = false;
          setState('listening');
          onScreen('turn');
        });
        break;
      case 'closed':
        end(m.reason === 'dropped' && !c.ready ? 'offline'
          : m.reason === 'dropped' && Date.now() - c.readyAt > (c.minutes * 60 - 30) * 1000 ? 'limit' : m.reason);
        break;
    }
  }

  (async () => {
    try {
      const stream = await d.getUserMedia({ audio: MIC });
      if (c.ended) { stopTracks(stream); return; }
      c.stream = stream;
      c.timer = setTimeout(() => { if (!c.ready) end('offline'); }, CONNECT_TIMEOUT_MS);
      c.mic = await d.connectMic(ctx, stream, onFrame);
      if (c.ended) { c.mic.disconnect(); return; }
    } catch (e) {
      if (c.ended) return;
      end(e && (e.name === 'NotAllowedError' || e.name === 'SecurityError') ? 'mic' : 'offline');
      return;
    }
    c.live = d.startLive({ getPass: passWithMinutes, on: onEvent, ...(loadSdk ? { loadSdk } : {}) });
  })();

  return {
    stop: (reason = 'user') => end(reason),
    // While a recording plays: nothing is sent or recorded, and Gemini's voice waits.
    pause() {
      if (c.ended || c.paused) return;
      c.paused = true;
      c.before = c.state;
      player.stop();
      c.you = []; c.youVoice = false;
      setState('paused');
    },
    resume() {
      if (c.ended || !c.paused) return;
      c.paused = false;
      const waiting = c.queued; c.queued = [];
      for (const b64 of waiting) player.play(b64);
      setState(waiting.length ? 'speaking' : c.before === 'paused' ? 'listening' : c.before || 'listening');
    },
    // On to the next word or sentence: the coach is told, and the microphone opens.
    next() {
      if (c.ended || !c.live) return;
      c.you = []; c.youVoice = false;
      coach.noteSkip?.();
      c.live.say('[Note from the website: the learner pressed "Next". Move on to the next word that needs work, or the next sentence.]');
      setState('thinking');
      onScreen('turn');
    },
    get state() { return c.state; },
    get started() { return c.ready; },
    get paused() { return c.paused; },
  };
}
