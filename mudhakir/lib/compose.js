import { normalize, tokenize, textQuality } from './util.js';

/** كلمات وظيفية تُستبعد من نتائج الاسترجاع داخل الجُمل */
const STOP = new Set(
  'في من على عن الى مع هذا هذه ذلك التي الذي و او ثم قد كان كانت هل ما ماذا كيف لماذا متى اين كل بعض غير بين le la les de des du un une et ou est sont dans pour par sur avec ce cette ces quel quelle quels quelles comment pourquoi quand ou qui que quoi dont ne pas plus'.split(
    ' ',
  ),
);

const isSentenceEnd = (s) => /[.!؟?]$/.test(s.trim());

/** تقسيم إلى جمل مع الحفاظ على بنية الفقرات وعلامات الترقيم */
export function sentences(text = '') {
  const out = [];
  for (const para of String(text).split(/\n+/)) {
    const clean = para.replace(/[ \t]+/g, ' ').trim();
    if (clean.length < 2) continue;
    if (/^\[?صفحة\s/.test(clean) || /^\[?page\s/i.test(clean)) continue;
    const parts = clean.split(/(?<=[.!؟?])\s+/);
    for (const p of parts) {
      const t = p.trim();
      if (!t) continue;
      if (t.length > 420) out.push(...t.split(/(?<=[،,;؛])\s+/).map((x) => x.trim()).filter(Boolean));
      else out.push(t);
    }
  }
  return out;
}

/** هل السطر عنوان/ترويسة؟ */
export function isHeadingLine(t = '') {
  const s = String(t).trim();
  if (s.length > 90) return false;
  if (/[.!؟?]$/.test(s)) return false;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length > 12) return false;
  return /^(الفصل|الباب|الدرس|الوحدة|القسم|المبحث|المقدمة|الخاتمة|الملخص|تمارين|chapter|unit|section|lesson|part|introduction|summary|conclusion|slide|chapitre|partie)/i.test(
    s,
  ) || words.length <= 8;
}

/** يكشف الجُمل المشوّشة (ترميز تالف / نص غير قابل للقراءة) */
export function isGarbage(s) {
  const t = String(s).trim();
  if (t.length < 12) return true;
  if (/[¦§¬®±µ¶¸¹º»¼½¾¿�]/.test(t)) return true;
  const letters = t.match(/\p{L}/gu) || [];
  if (letters.length < 6) return true;
  const latin = t.match(/[A-Za-zÀ-ÿ]/g) || [];
  if (latin.length > 20) {
    const vowels = (t.match(/[aeiouyàâäéèêëîïôöùûüÿœæAEIOUY]/g) || []).length;
    if (vowels / latin.length < 0.2) return true;
  }
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length && letters.length / words.length > 14) return true;
  return textQuality(t) < 0.5;
}

function termOverlap(sentence, qTerms) {
  if (!qTerms.length) return 0;
  const st = new Set(tokenize(sentence));
  let hit = 0;
  for (const t of qTerms) {
    if (st.has(t)) hit += 1;
    else if ([...st].some((x) => x.startsWith(t) || t.startsWith(x))) hit += 0.5;
  }
  return hit / qTerms.length;
}

/**
 * يستخرج "أفضل الفقرات/الجمل" المرتبطة بالسؤال من المقاطع المُسترجعة.
 * يعيد قائمة موحّدة بلا تكرار، مرتّبة، مع المصدر والصفحة.
 */
export function bestPassages(question, hits, { maxPassages = 9, perChunk = 2, maxSentences = 14 } = {}) {
  const qTerms = [...new Set(tokenize(question))];
  const scored = [];
  const seen = new Set();

  hits.forEach((hit, rankIdx) => {
    const sents = sentences(hit.text);
    const local = [];
    sents.forEach((s) => {
      if (s.length < 20 || isGarbage(s)) return;
      const key = normalize(s).slice(0, 90);
      if (seen.has(key)) return;
      let score = termOverlap(s, qTerms) * 3;
      // الجمل التعريفية والشارحة أوضح للطالب
      if (/( هو | هي | يعني | يُعرف|تعرف|يقصد|نقصد|: | = |ينقسم|يتكون|يُقسم|أهم|نتيجة|لأن|لذلك|إذن|بالتالي|هو |est |sont |définit|signifie|car |donc )/i.test(s)) score += 0.55;
      if (/[0-9٠-٩]{2,}/.test(s)) score += 0.2;
      if (isSentenceEnd(s)) score += 0.25;
      if (s.length > 40 && s.length < 280) score += 0.3;
      score += Math.max(0, 1 - rankIdx / 8) * 0.9; // قرب المقطع من أعلى النتائج
      if (score < 0.7) return;
      local.push({ s, score, key });
    });
    local.sort((a, b) => b.score - a.score);
    local.slice(0, perChunk).forEach((x, i) => {
      seen.add(x.key);
      scored.push({
        text: x.s,
        score: x.score + (i === 0 ? 0.15 : 0),
        docId: hit.docId,
        docTitle: hit.docTitle,
        page: hit.page,
      });
    });
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.min(maxSentences, maxPassages * 2));
}

/** يبني فقرة إجابة متماسكة من المقاطع */
export function composeAnswer(question, passages, lang = 'ar') {
  if (!passages.length) return null;
  const q = qTokens(question);
  const scored = passages.filter((p) => !isGarbage(p.text));
  if (!scored.length) return null;

  // نركّز على المستندات الأكثر صلة: لا نخلط مواضيع بعيدة
  const topScore = Math.max(...scored.map((p) => p.score || 0), 0.0001);
  const topDoc = scored[0].docId;
  const focus = scored.filter((p) => p.docId === topDoc || (p.score || 0) >= topScore * 0.72);
  const pool = focus.length >= 2 ? focus : scored;

  const cand = [];
  for (const p of pool) {
    const ss = sentences(p.text);
    for (let i = 0; i < ss.length; i++) {
      const t = ss[i].replace(/\s+/g, ' ').trim();
      if (t.length < 25 || t.length > 420 || isGarbage(t)) continue;
      const heading = isHeadingLine(t);
      cand.push({
        t,
        ovRaw: termOverlap(t, q),
        heading,
        page: p.page,
        docTitle: p.docTitle,
        docId: p.docId,
        order: cand.length,
        score: (p.score || 0) / topScore,
      });
    }
  }

  /* ترجيح المصطلحات النادرة: «الميتوكوندريا» أهم من «الطاقة» الشائعة */
  const qSet = q;
  const dfMap = new Map(qSet.map((t) => [t, 0]));
  for (const c of cand) {
    const st = new Set(tokenize(c.t));
    for (const t of qSet) if ([...st].some((x) => x === t || x.startsWith(t) || t.startsWith(x))) dfMap.set(t, dfMap.get(t) + 1);
  }
  const weights = new Map();
  const totalW = [...dfMap.values()].reduce((a, b) => a + Math.log(1 + cand.length / (1 + b)), 0) || 1;
  for (const [t, df] of dfMap) weights.set(t, Math.log(1 + cand.length / (1 + df)) / totalW);

  for (const c of cand) {
    const st = new Set(tokenize(c.t));
    let w = 0;
    for (const t of qSet) if ([...st].some((x) => x === t || x.startsWith(t) || t.startsWith(x))) w += weights.get(t) || 0;
    c.ov = Math.min(1, w * 1.15);
  }

  // احتياطي: لو لم نجد أي تطابق مباشر، نلخّص أقرب مقطع
  const minOv = q.length >= 3 ? 0.22 : 0.05;
  const bestOv = cand.reduce((m, c) => Math.max(m, c.heading ? 0 : c.ov), 0);
  // نُبقي فقط الجمل القريبة من أفضل جملة — يمنع خلط مواضيع ثانوية
  const cutoff = Math.max(minOv, bestOv * 0.62);
  let picked = cand.filter((c) => c.ov >= cutoff && !c.heading);
  if (!picked.length) {
    picked = cand.filter((c) => !c.heading && c.t.length > 40).slice(0, 4);
  }
  if (!picked.length) return null;

  const grams = (txt) => {
    const w = txt.split(/\s+/);
    const g = new Set();
    for (let i = 0; i + 3 <= w.length; i++) g.add(w.slice(i, i + 3).join(' '));
    return g;
  };
  const keep = [];
  for (const c of picked.sort((a, b) => b.ov - a.ov || b.score - a.score || a.order - b.order)) {
    const gc = grams(c.t);
    const dup = keep.some((k) => {
      const gk = grams(k.t);
      let inter = 0;
      for (const g of gc) if (gk.has(g)) inter++;
      return inter / Math.max(1, Math.min(gc.size, gk.size)) > 0.5;
    });
    if (dup) continue;
    keep.push(c);
    if (keep.length >= 8) break;
  }

  const ordered = keep.slice().sort((a, b) => b.ov - a.ov || b.score - a.score).slice(0, 6);
  ordered.sort((a, b) => a.order - b.order);
  const text = ordered.map((c) => c.t).join(' ');
  const usedAll = [...new Map(keep.map((c) => [`${c.docId}#${c.page}`, c])).values()];
  return {
    text,
    used: ordered.map((c) => ({ text: c.t, page: c.page, docTitle: c.docTitle, docId: c.docId })),
    usedAll: usedAll.map((c) => ({ text: c.t, page: c.page, docTitle: c.docTitle, docId: c.docId })),
  };
}

function qTokens(question) {
  return [...new Set(tokenize(question))];
}

/** توليد "نقاط مفتاحية" من الفقرة */
export function bullets(passages, max = 6) {
  const items = [];
  const seen = new Set();
  for (const p of passages) {
    for (const s of sentences(p.text)) {
      const key = normalize(s).slice(0, 60);
      if (seen.has(key) || s.length < 25 || s.length > 240 || isGarbage(s)) continue;
      if (STOP.has(normalize(s).split(' ')[0])) continue;
      seen.add(key);
      items.push({ text: s, page: p.page, doc: p.docTitle, docId: p.docId });
      if (items.length >= max) return items;
    }
  }
  return items;
}
