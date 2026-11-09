// What is on screen, driven by Gemini's tool calls: the reading test or current sentence, the word being practised,
// the sounds to focus on, and what is done. It also keeps the coach to the plan: the reading test first, then
// sentences for the focus sounds. When the coach moves on to a new word or sentence, the screen follows at once.
import { sentencesFor, soundsFor, readingFor } from './shared/sentences.js';
import { MAX_FOCUS, practiceOrder } from './shared/coach.js';
import { similarity } from './shared/similar.js';

const letters = (s) => String(s || '').toLowerCase().replace(/[^\p{L}'-]/gu, '');

export function createCoachState({ accent, done = [], focus = [] }) {
  const list = sentencesFor(accent);
  const sounds = soundsFor(accent);
  const finished = [...done];
  let focusSounds = [...focus];
  let current = null;
  let tries = 0;        // tries at the current word
  let readingHeard = focus.length > 0; // this visit's reading test is done (or its sounds were passed in)
  let readingSpoken = false;           // the learner has spoken while the reading text was on screen
  const hasRead = () => tries > 0 || readingSpoken;
  const notReadYet = () => !readingHeard && (current?.reading ? !hasRead() : true);
  const readFirst = () => (current?.reading
    ? 'The learner has not read the text yet. Keep the reading text on screen and wait for them to read it. Say nothing more now: do not greet again and do not give any feedback.'
    : 'Start with the reading test: call show_reading and wait for the learner to read it.');
  const no = (reason) => ({ response: { ok: false, reason }, change: null });
  const upNext = () => practiceOrder(accent, { focus: focusSounds, done: finished });
  let skipped = false;  // the learner pressed Skip for the current word
  let heardOther = '';  // the speech recogniser wrote the last try as another word ("tree" for "three")
  const moved = () => { tries = 0; skipped = false; heardOther = ''; };
  // After a wrong try the learner stays on the word: they listen to their recording and say it again, until a try is
  // right (the coach says so with previous_right) or after 5 tries, or the learner skips it.
  const MAX_TRIES = 5;
  const misheard = (args) => args.previous_right === true && current?.word && heardOther;
  const held = (args) => misheard(args) || (current?.word && tries > 0 && tries < MAX_TRIES && !skipped && args.previous_right !== true);
  const holdReason = (args = {}) => (misheard(args)
    ? `The speech recogniser heard "${heardOther}", not "${current.word}": that try was not right. Do not say it was right. Tell the learner honestly what you heard, and ask them to say "${current.word}" again.`
    : `The learner has not said "${current.word}" right yet (try ${tries} of ${MAX_TRIES}). Do not tell the learner you are moving on. Give your feedback on that try if you have not, ask them to say "${current.word}" again, and wait. Only move on when a try is right (then pass previous_right: true) or after ${MAX_TRIES} tries.`);
  return {
    handle({ name, args = {} }) {
      if (name === 'show_reading') {
        current = { id: 'reading', text: readingFor(accent).join('\n'), word: null, reading: true };
        readingSpoken = false;
        moved();
        return { response: { ok: true, next: 'The text is on screen. Greet the learner once, in one short sentence, ask them to read it all aloud, then stop and wait. Call no other tool until they have read it.' }, change: 'sentence' };
      }
      if (name === 'set_focus') {
        if (!current?.reading || !hasRead()) return no(readFirst());
        const want = Array.isArray(args.sounds) ? args.sounds : [];
        const ok = [...new Set(want.map((w) => sounds.find((s) => s.toLowerCase() === String(w).trim().toLowerCase())).filter(Boolean))].slice(0, MAX_FOCUS);
        if (!ok.length) return no(`use one to three of these sound names exactly: ${sounds.join('; ')}`);
        focusSounds = ok;
        readingHeard = true;
        return { response: { ok: true, saved: ok, next_sentences: upNext().slice(0, 5).map((s) => s.id) }, change: 'focus' };
      }
      if (name === 'show_sentence') {
        const s = list.find((x) => x.id === args.id);
        if (!s) return no(`unknown sentence id ${args.id}; use only the ids in your list`);
        if (!readingHeard) return no(notReadYet() ? readFirst() : 'Call set_focus with the sounds the reading showed need the most work first.');
        // Sentences for the learner's focus sounds come first, as the reading test said.
        const focusLeft = upNext().filter((x) => focusSounds.includes(x.sound));
        if (focusLeft.length && !focusSounds.includes(s.sound)) {
          return no(`Practise the learner's focus sounds first (${focusSounds.join(', ')}). Use one of: ${focusLeft.slice(0, 5).map((x) => x.id).join(', ')}.`);
        }
        if (current?.id !== s.id && held(args)) return no(holdReason(args));
        if (current?.id !== s.id) moved();
        current = { id: s.id, text: s.text, word: null, sound: s.sound };
        return { response: { ok: true, text: s.text, sound: s.sound }, change: 'sentence' };
      }
      if (name === 'focus_word') {
        if (!current) return no('call show_sentence first');
        const want = letters(args.word);
        // The word as written in the sentence, or a part of one (for example "country" in "countryside").
        const words = current.text.split(/\s+/).map((w) => w.replace(/[^\p{L}'-]/gu, ''));
        const exact = words.find((w) => letters(w) === want);
        const part = !exact && want && want.length >= 3 && words.find((w) => letters(w).includes(want));
        // A near miss ("think" for "thing"): the word really in the sentence is used, and the coach is told.
        const near = !exact && !part && want && words
          .map((w) => ({ w, sim: similarity(letters(w), want) }))
          .filter((x) => x.sim >= 0.6).sort((x, y) => y.sim - x.sim)[0]?.w;
        if (!want || (!exact && !part && !near)) {
          return no(`"${args.word}" is not in the sentence on screen. Words in the sentence: ${words.filter(Boolean).join(', ')}. Call focus_word again with one of them, then say that word.`);
        }
        const word = exact || near || String(args.word).replace(/[^\p{L}'-]/gu, '');
        if (letters(word) !== letters(current.word) && held(args)) return no(holdReason(args));
        if (letters(word) !== letters(current.word)) moved();
        current = { ...current, word };
        return {
          response: near ? { ok: true, note: `The word in the sentence is "${near}", not "${args.word}". Say "${near}" and practise that.` } : { ok: true },
          change: 'word',
        };
      }
      if (name === 'sentence_done') {
        if (!list.some((x) => x.id === args.id)) return no(`unknown sentence id ${args.id}`);
        if (held(args)) return no(holdReason(args));
        if (!finished.includes(args.id)) finished.push(args.id);
        return { response: { ok: true }, change: 'done' };
      }
      return no(`unknown tool ${name}`);
    },
    // One more try at the current word (or sentence).
    noteTry() { tries++; },
    // The learner pressed Skip: the coach may move on from this word.
    noteSkip() { skipped = true; },
    // What the speech recogniser wrote for the learner's try ('' when a new try starts). A different spelling of the
    // word being practised ("tree" for "three") means the sound was not right. Numbers and empty text say nothing.
    noteHeard(text) {
      const tokens = String(text || '').split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean);
      const want = letters(current?.word);
      if (!want || !tokens.length || tokens.some((t) => /\p{N}/u.test(t)) || tokens.some((t) => letters(t) === want)) { heardOther = ''; return; }
      heardOther = tokens.map((t) => ({ t, sim: similarity(letters(t), want) })).sort((a, b) => b.sim - a.sim)[0].t;
    },
    get heardOther() { return heardOther; },
    // The speech recogniser heard the learner while the reading text was on screen.
    noteSpoken() { if (current?.reading) readingSpoken = true; },
    get tries() { return tries; },
    get current() { return current; },
    get done() { return [...finished]; },
    get focus() { return [...focusSounds]; },
    get index() { return current ? list.findIndex((x) => x.id === current.id) : -1; },
    get total() { return list.length; },
    // Which recordings belong together: this sentence and this word (empty word: the whole sentence).
    get key() { return current ? `${current.id}|${current.word || ''}` : ''; },
  };
}
