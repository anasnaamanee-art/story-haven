/**
 * Normalisation linguistique française + détection de langue + utilitaires texte.
 * Aucune dépendance : tout est fait maison, donc gratuit et illimité.
 */

const DIACRITICS = /[\u0300-\u036f]/g;

/** minuscule, sans accents, ponctuation uniformisée */
export function norm(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .replace(/[’‘`´]/g, "'")
    .replace(/[«»“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s = '') {
  return norm(s)
    .replace(/[^a-z0-9à-ÿ']+/gi, ' ')
    .split(' ')
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter(Boolean);
}

/** radical naïf : enlève les flexions fréquentes du français */
export function stem(w = '') {
  let t = norm(w);
  if (t.length <= 4) return t;
  t = t.replace(/(aux|eaux)$/, 'al');
  t = t.replace(/(issements|issement)$/, 'i');
  t = t.replace(/(ations|ation)$/, 'at');
  t = t.replace(/(ments|ment)$/, 'm');
  t = t.replace(/(iques|ique)$/, 'iq');
  t = t.replace(/(eurs|eur)$/, 'r');
  t = t.replace(/(ance|ances|ence|ences)$/, 'ant');
  t = t.replace(/(ies|ie)$/, 'i');
  t = t.replace(/s$/, '');
  if (t.length > 6) t = t.replace(/e$/, '');
  return t;
}

export const stemTokens = (s = '') => tokens(s).map(stem).filter((t) => t.length > 1);

const STOP = new Set(
  `le la les de des du un une et ou en dans pour par sur avec sans sous vers chez ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs je tu il elle on nous vous ils elles me te se lui y qui que quoi dont ou est sont etait etaient ete etre ai as a avons avez ont avait avaient avoir serai sera serais serait soit fait fais font faire faisait aussi tres plus moins tout tous toute toutes meme memes autre autres quand comme si mais donc car or ni ne pas plus jamais toujours deja encore ici la bas alors ainsi cela ceci celui celle ceux celles quel quelle quels quelles combien comment pourquoi puis apres avant pendant depuis entre selon afin peu beaucoup bien mal oui non merci bonjour salut svp stp veux veut voudrais peux peut peut-etre dois doit fallait faut`
    .split(/\s+/)
    .filter(Boolean),
);

export const stopword = (w) => STOP.has(norm(w));

/** Mots vides français (sans accents) — exporté pour le calcul et l'analyse */
export const FR_STOP = STOP;

export function keywords(s = '', limit = 30) {
  const freq = new Map();
  for (const t of stemTokens(s)) {
    if (STOP.has(t) || t.length < 3) continue;
    freq.set(t, (freq.get(t) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([w]) => w);
}

/** Détection heuristique de langue : fr / en / ar */
export function detectLang(text = '') {
  const t = String(text);
  if (/[\u0600-\u06FF]/.test(t)) return 'ar';
  const n = norm(t);
  const fr = (n.match(/\b(le|la|les|des|une|est|et|dans|pour|que|qui|avec|sur|pas|plus|vous|nous|je|tu|c'est|qu'est|il|elle)\b/g) || []).length;
  const en = (n.match(/\b(the|and|of|to|is|are|in|for|that|with|you|what|how|this)\b/g) || []).length;
  if (/[àâçéèêëîïôùûüÿœæ]/i.test(t)) return 'fr';
  return en > fr ? 'en' : 'fr';
}

/** Résumé extractif (TF + position + MMR) */
export function summarize(text = '', maxSentences = 6) {
  const sents = splitSentences(text);
  if (sents.length <= maxSentences) return sents.join(' ');
  const f = new Map();
  for (const w of stemTokens(text)) f.set(w, (f.get(w) || 0) + 1);
  const max = Math.max(...f.values(), 1);
  const scored = sents.map((s, i) => {
    const ws = stemTokens(s);
    if (!ws.length) return { s, i, score: 0 };
    let sc = ws.reduce((a, w) => a + (f.get(w) || 0) / max, 0) / Math.sqrt(ws.length);
    if (i < sents.length * 0.2) sc *= 1.25;
    return { s, i, score: sc };
  });
  const chosen = [];
  const pool = [...scored];
  while (chosen.length < maxSentences && pool.length) {
    let bi = 0;
    let bv = -Infinity;
    pool.forEach((c, idx) => {
      const cs = new Set(stemTokens(c.s));
      let sim = 0;
      for (const ch of chosen) {
        const hs = new Set(stemTokens(ch.s));
        let inter = 0;
        for (const w of cs) if (hs.has(w)) inter++;
        sim = Math.max(sim, inter / Math.max(1, Math.min(cs.size, hs.size)));
      }
      const v = c.score - sim * 1.2;
      if (v > bv) {
        bv = v;
        bi = idx;
      }
    });
    chosen.push(pool.splice(bi, 1)[0]);
  }
  return chosen.sort((a, b) => a.i - b.i).map((c) => c.s.trim()).join(' ');
}

/** Découpage en phrases (gère « : », « ; » et les abréviations courantes) */
export function splitSentences(text = '') {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const guarded = clean.replace(/\b(M|MM|Mme|Mlle|Dr|Pr|St|etc|cf|env|av|apr|J\.-C)\./g, '$1<DOT>');
  return guarded
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9"«(])/)
    .map((s) => s.replace(/<DOT>/g, '.').trim())
    .filter((s) => s.length > 1);
}

export const capitalize = (s = '') => s.charAt(0).toUpperCase() + s.slice(1);
export const uid = (n = 10) => Math.random().toString(36).slice(2, 2 + n);
export const nowISO = () => new Date().toISOString();

export function humanSize(bytes = 0) {
  const u = ['o', 'Ko', 'Mo', 'Go'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i ? 1 : 0)} ${u[i]}`;
}

export function chunkText(text, { size = 1200, overlap = 180 } = {}) {
  const clean = String(text).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n');
  const out = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(clean.length, i + size);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const cut = Math.max(slice.lastIndexOf('\n\n'), slice.lastIndexOf('. '), slice.lastIndexOf('\n'));
      if (cut > size * 0.5) end = i + cut + 1;
    }
    const piece = clean.slice(i, end).trim();
    if (piece) out.push(piece);
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return out;
}
