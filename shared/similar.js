// How alike two words are, from 0 to 1 (1 - edit distance / longer length).
export function similarity(a, b) {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

// How alike two words sound, from 0 to 1, ignoring the usual accent errors: "th" said as t or d, vowels too long,
// short or changed, and spellings of the same sound. So "terror" heard for "there" still counts as a try at "there".
const skeleton = (w) => String(w || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ]/g, '')
  .replace(/th/g, 't').replace(/dh/g, 'd').replace(/ph/g, 'f').replace(/gh/g, '').replace(/ck/g, 'k').replace(/c(?=[eiy])/g, 's')
  .replace(/[cq]/g, 'k').replace(/z/g, 's').replace(/v/g, 'b').replace(/[aeiouy]+/g, 'a').replace(/(.)\1+/g, '$1');
export function soundsLike(a, b) { return similarity(skeleton(a), skeleton(b)); }
