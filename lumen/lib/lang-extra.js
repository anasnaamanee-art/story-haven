export { summarize, splitSentences, detectLang, uid, nowISO, humanSize, chunkText, norm, tokens, stem, stemTokens } from './lang.js';

/** Évalue la qualité d'un texte extrait : 0 (illisible) → 1 (propre) */
export function textQualitySafe(text = '') {
  const t = String(text);
  if (!t.trim()) return 0;
  const letters = (t.match(/[\p{L}]/gu) || []).length;
  const spaces = (t.match(/\s/g) || []).length;
  const weird = (t.match(/[¦§¬®±µ¶¸¹º»¼½¾¿\ufffd]/g) || []).length;
  const latin = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const vowels = (t.match(/[aeiouyàâäéèêëîïôöùûüÿœæAEIOUY]/g) || []).length;
  const arabic = (t.match(/[\u0600-\u06FF]/g) || []).length;
  let score = 1;
  if (letters / t.length < 0.4) score -= 0.25;
  if (spaces / t.length < 0.06) score -= 0.2;
  if (weird / t.length > 0.02) score -= 0.35;
  if (latin > 60 && arabic < latin * 0.2 && vowels / latin < 0.2) score -= 0.6;
  const words = t.split(/\s+/).filter(Boolean);
  const avg = words.length ? letters / words.length : 0;
  if (avg > 14) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}
