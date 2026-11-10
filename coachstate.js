// What is on screen, driven by Gemini's tool calls: the reading test or current sentence, the word being practised,
// the sounds to focus on, and what is done. It also keeps the coach to the plan: the reading test first, then
// sentences for the focus sounds. When the coach moves on to a new word or sentence, the screen follows at once.
import { sentencesFor, soundsFor, readingFor } from './shared/sentences.js';
import { MAX_FOCUS, practiceOrder } from './shared/coach.js';
import { similarity } from './shared/similar.js';

const letters = (s) => String(s || '').toLowerCase().replace(/[^\p{L}'-]/gu, '');
const HAN = /\p{Script=Han}/u;

// What the speech recogniser's spelling of a try says about it: which part of the word came out differently. It keeps
// the coach from blaming the sound it expects (the focus sound) when another part was wrong ("the" for "there").
export function heardHint(heard, word) {
  const h = letters(heard), w = letters(word);
  if (!h || !w || h === w) return '';
  let pre = 0; while (pre < h.length && pre < w.length && h[pre] === w[pre]) pre++;
  let suf = 0; while (suf < h.length - pre && suf < w.length - pre && h[h.length - 1 - suf] === w[w.length - 1 - suf]) suf++;
  const what = pre === h.length && pre >= 2 ? `the start was there, but the end of the word ("${w.slice(pre)}") seems to be missing`
    : suf === h.length && suf >= 2 ? `the start of the word ("${w.slice(0, w.length - suf)}") seems to be missing`
    : pre >= 2 ? `the word started right, but the part after "${w.slice(0, pre)}" came out differently`
    : suf >= 2 ? `the start of the word came out differently, the end was there`
    : `it did not come out as "${word}"`;
  return `The speech recogniser wrote this try as "${heard}" instead of "${word}": ${what}. Judge the whole word (its start, its vowel and its ending) and tell the learner the part that was really different. Do not talk about another sound, such as the focus sound, unless you clearly heard it wrong.`;
}

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
  let sentenceRead = false; // the learner has spoken since the sentence on screen was shown
  let heardOther = '';  // the speech recogniser wrote the last try as another word ("tree" for "three")
  const moved = () => { tries = 0; skipped = false; heardOther = ''; };
  // After a wrong try the learner stays on the word: they listen to their recording and say it again, until a try is
  // right (the coach says so with previous_right) or after 5 tries, or the learner skips it.
  const MAX_TRIES = 5;
  const misheard = (args) => args.previous_right === true && current?.word && heardOther;
  const held = (args) => misheard(args) || (current?.word && tries > 0 && tries < MAX_TRIES && !skipped && args.previous_right !== true);
  const holdReason = (args = {}) => (misheard(args)
    ? `(For you only, never read this aloud.) The speech recogniser heard "${heardOther}", not "${current.word}": that try was not right. Do not say it was right. ${heardHint(heardOther, current.word)} If you already gave your feedback on that try, do not give it again: only ask them, in the language you speak with the learner, to say "${current.word}" again.`
    : `(For you only, never read this aloud.) The learner has not said "${current.word}" right yet (try ${tries} of ${MAX_TRIES}): stay on it, and do not say you are moving on. If you already gave your feedback on that try, do not give it again: only ask them, in a few words and in the language you speak with the learner, to say "${current.word}" again, and wait. If you have not, give it once.${heardOther ? ` ${heardHint(heardOther, current.word)}` : ''} Move on only after a right try (then pass previous_right: true) or after ${MAX_TRIES} tries.`);
  return {
    // spoke: the coach had already spoken in this turn before calling the tool.
    handle({ name, args = {} }, { spoke = false } = {}) {
      if (name === 'show_reading') {
        // Already on screen: asking again must not forget that the learner has started reading.
        if (current?.reading) return { response: { ok: true, next: 'The text is already on screen. Say nothing more: wait for the learner to read it.' }, change: null };
        // The reading test is taken once per visit: asked for again, it would replace the sentence being practised.
        if (readingHeard) return no(`The learner already did the reading test (their sounds: ${focusSounds.join(', ')}). Do not show it again and say nothing about it: carry on with the practice sentences.`);
        current = { id: 'reading', text: readingFor(accent).join('\n'), word: null, reading: true };
        readingSpoken = false;
        moved();
        return { response: { ok: true, next: 'The text is on screen. Greet the learner once, in one short sentence, ask them to read it all aloud, then stop and wait. Call no other tool until they have read it.' }, change: 'sentence' };
      }
      if (name === 'set_focus') {
        if (readingHeard && !current?.reading) return no(`The focus sounds are already saved (${focusSounds.join(', ')}): do not call set_focus again, and say nothing about it. Carry on with the sentence on screen.`);
        if (!current?.reading || !hasRead()) return no(readFirst());
        const want = Array.isArray(args.sounds) ? args.sounds : [];
        const ok = [...new Set(want.map((w) => sounds.find((s) => s.toLowerCase() === String(w).trim().toLowerCase())).filter(Boolean))].slice(0, MAX_FOCUS);
        if (!ok.length) return no(`use one to three of these sound names exactly: ${sounds.join('; ')}`);
        focusSounds = ok;
        readingHeard = true;
        // The first practice sentence goes on screen with the same call, so it is there when the coach asks for it.
        const first = upNext()[0];
        const next_sentences = upNext().slice(0, 5).map((s) => s.id);
        if (!first) return { response: { ok: true, saved: ok, next_sentences }, change: 'focus' };
        moved(); sentenceRead = false;
        current = { id: first.id, text: first.text, word: null, sound: first.sound };
        return {
          response: { ok: true, saved: ok, next_sentences, now_on_screen: { id: first.id, text: first.text, sound: first.sound }, next: 'The first practice sentence is already on the learner\'s screen, in place of the reading text: do not call show_sentence. Tell them which sounds need the most work, ask them to read the sentence on screen, then wait until they have read it.' },
          change: 'focus', shown: true,
        };
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
        if (current?.id !== s.id) { moved(); sentenceRead = false; }
        current = { id: s.id, text: s.text, word: null, sound: s.sound };
        return { response: { ok: true, text: s.text, sound: s.sound }, change: 'sentence' };
      }
      if (name === 'focus_word') {
        if (!current) return no('call show_sentence first');
        // Words are practised in the practice sentences, never in the reading text.
        if (current.reading) return no(`(For you only, never read this aloud.) The reading text is on screen, not a practice sentence. ${hasRead() ? 'Call set_focus with the sounds that need the most work: the first practice sentence then shows by itself.' : readFirst()}`);
        // A word is only picked after hearing the learner read the sentence: otherwise the coach judges a reading that
        // never happened, and the learner's reading is then taken for a try at the word.
        if (!current.reading && !current.word && !sentenceRead && !skipped) {
          return no('(For you only, never read this aloud.) The learner has not read the sentence yet, so there is nothing to judge and no word to pick. Do not praise or correct anything. If you have not asked them to read the sentence, ask once, in a few words. Then say nothing more and wait until they have read it.');
        }
        const want = letters(args.word);
        // The word as written in the sentence, or a part of one (for example "country" in "countryside").
        const words = current.text.split(/\s+/).map((w) => w.replace(/[^\p{L}'-]/gu, ''));
        const exact = words.find((w) => letters(w) === want);
        // Chinese words are one or two characters: any part of a word counts, and so does the first word of a longer
        // stretch the coach asked for ("中国菜" when the screen has "中国" and "菜").
        const han = HAN.test(want);
        const part = !exact && want && (han || want.length >= 3) && words.find((w) => letters(w).includes(want));
        const first = !exact && !part && han && words.find((w) => letters(w) && want.includes(letters(w)));
        // A near miss ("think" for "thing"): the word really in the sentence is used, and the coach is told.
        const near = first || (!exact && !part && want && words
          .map((w) => ({ w, sim: similarity(letters(w), want) }))
          .filter((x) => x.sim >= 0.6).sort((x, y) => y.sim - x.sim)[0]?.w);
        if (!want || (!exact && !part && !near)) {
          return no(`"${args.word}" is not in the sentence on screen. Words in the sentence: ${words.filter(Boolean).join(', ')}. Call focus_word again with one of them, then say that word.`);
        }
        const word = exact || near || String(args.word).replace(/[^\p{L}'-]/gu, '');
        if (letters(word) !== letters(current.word) && held(args)) return no(holdReason(args));
        const same = letters(word) === letters(current.word);
        if (!same) moved();
        current = { ...current, word };
        // The coach gave its feedback and then called the tool for the same word: anything it says after the answer
        // would be the same feedback a second time.
        if (same && tries > 0 && spoke) return { response: { ok: true, next: 'Nothing changed. You already gave your feedback on this try: say nothing more now, and wait for the learner to say the word again.' }, change: 'word' };
        // Still on the same word after a try: what the recogniser wrote, so the feedback is about the right part.
        const hint = !near && tries > 0 && heardOther ? heardHint(heardOther, word) : '';
        if (hint) return { response: { ok: true, heard: heardOther, note: hint }, change: 'word' };
        return {
          response: near ? { ok: true, note: `The word in the sentence is "${near}", not "${args.word}". Say "${near}" and practise that.` } : { ok: true },
          change: 'word',
        };
      }
      if (name === 'sentence_done') {
        if (!list.some((x) => x.id === args.id)) return no(`unknown sentence id ${args.id}`);
        if (held(args)) return no(holdReason(args));
        if (!finished.includes(args.id)) finished.push(args.id);
        // The next sentence goes on screen with the same call, so it is there before the coach asks for it.
        const next = upNext().find((x) => x.id !== args.id);
        if (!next) return { response: { ok: true, finished: true, next: 'That was the last sentence. Tell the learner, and that they can start over from the website\'s settings.' }, change: 'done' };
        moved(); sentenceRead = false;
        current = { id: next.id, text: next.text, word: null, sound: next.sound };
        return {
          response: { ok: true, now_on_screen: { id: next.id, text: next.text, sound: next.sound }, next: 'The next sentence is already on the learner\'s screen: do not call show_sentence. Give your short verdict on the last try if you have not, ask them to read the new sentence, then wait until they have read it.' },
          change: 'done', shown: true,
        };
      }
      return no(`unknown tool ${name}`);
    },
    // Nothing is on screen although the coach has spoken (it asked the learner to read without showing anything): the
    // website shows what comes next by itself, the reading test or the next sentence. True when it did.
    showDefault() {
      if (current) return false;
      if (!readingHeard) { current = { id: 'reading', text: readingFor(accent).join('\n'), word: null, reading: true }; readingSpoken = false; moved(); return true; }
      const next = upNext()[0];
      if (!next) return false;
      moved(); sentenceRead = false;
      current = { id: next.id, text: next.text, word: null, sound: next.sound };
      return true;
    },
    // One more try at the current word (or sentence).
    noteTry() { tries++; sentenceRead = true; },
    // The learner pressed Skip: the coach may move on from this word.
    noteSkip() { skipped = true; },
    // What the speech recogniser wrote for the learner's try ('' when a new try starts). A different spelling of the
    // word being practised ("tree" for "three") means the sound was not right. Numbers and empty text say nothing.
    noteHeard(text) {
      const tokens = String(text || '').split(/\s+/).map((t) => t.replace(/[^\p{L}\p{N}'-]/gu, '')).filter(Boolean);
      const want = letters(current?.word);
      // Chinese: the recogniser writes the same sound with other characters, and no tones, so its text proves nothing.
      if (HAN.test(want)) { heardOther = ''; return; }
      if (!want || !tokens.length || tokens.some((t) => /\p{N}/u.test(t)) || tokens.some((t) => letters(t) === want)) { heardOther = ''; return; }
      heardOther = tokens.map((t) => ({ t, sim: similarity(letters(t), want) })).sort((a, b) => b.sim - a.sim)[0].t;
    },
    get heardOther() { return heardOther; },
    // The speech recogniser heard the learner while the reading text was on screen.
    noteSpoken() { if (current?.reading) readingSpoken = true; else if (current) sentenceRead = true; },
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
