import { normalize, tokenize } from './util.js';
import { sentences } from './compose.js';

/** تلخيص استخلاصي (TF + موضع + تنويع MMR) */
export function summarize(text, { maxSentences = 8, lang = 'ar' } = {}) {
  const sents = sentences(text);
  if (sents.length <= maxSentences) return sents.join(' ');
  const tf = new Map();
  for (const t of tokenize(text)) tf.set(t, (tf.get(t) || 0) + 1);
  const maxTf = Math.max(...tf.values(), 1);
  const scored = sents.map((s, i) => {
    const terms = tokenize(s);
    if (!terms.length) return { s, i, score: 0 };
    let sc = 0;
    for (const t of terms) sc += (tf.get(t) || 0) / maxTf;
    sc = sc / Math.sqrt(terms.length);
    if (i < sents.length * 0.15) sc *= 1.25; // الجمل الأولى غالباً تعريفية
    if (/^(المقدمة|الخلاصة|في الختام|نستنتج|إذن)/.test(s)) sc *= 1.15;
    if (s.length < 40) sc *= 0.75;
    return { s, i, score: sc };
  });
  const chosen = [];
  const pool = [...scored].sort((a, b) => b.score - a.score);
  while (chosen.length < maxSentences && pool.length) {
    let bestIdx = 0;
    let bestVal = -Infinity;
    pool.forEach((cand, idx) => {
      const candTerms = new Set(tokenize(cand.s));
      let sim = 0;
      for (const c of chosen) {
        const cTerms = new Set(tokenize(c.s));
        let inter = 0;
        for (const t of candTerms) if (cTerms.has(t)) inter++;
        sim = Math.max(sim, inter / Math.max(1, Math.min(candTerms.size, cTerms.size)));
      }
      const val = cand.score - sim * 1.3;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = idx;
      }
    });
    chosen.push(pool.splice(bestIdx, 1)[0]);
  }
  return chosen
    .sort((a, b) => a.i - b.i)
    .map((c) => c.s.trim())
    .join(' ');
}

/** تبسيط الشرح على ثلاثة مستويات */
export function explain(topic, sourceText, level = 'simple') {
  const sents = sentences(sourceText);
  const core = summarize(sourceText, { maxSentences: level === 'deep' ? 14 : level === 'normal' ? 9 : 5 });

  const keyTerms = tokenize(sourceText)
    .reduce((m, t) => (m.set(t, (m.get(t) || 0) + 1), m), new Map());
  const gloss = [...keyTerms.entries()]
    .filter(([t, c]) => t.length > 3 && c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, level === 'deep' ? 10 : 6)
    .map(([t]) => t);

  const analogies = [
    'تخيّل الموضوع كأنه آلة: لكل جزء وظيفة، وإذا تعطّل جزء توقّف الباقي.',
    'فكّر فيه كخريطة: العنوان هو المدينة، والعناصر الفرعية هي الشوارع التي توصلك إليها.',
    'يشبه الأمر تعلّم وصفة طبخ: المكوّنات هي المفاهيم، والخطوات هي العلاقات بينها.',
    'اعتبره مثل بناءٍ من طوابق: الأساس هو التعريف، والطوابق هي الأمثلة والتطبيقات.',
  ];

  const out = {
    level,
    title: topic,
    summary: core,
    keyTerms: gloss,
    bullets: sents.filter((s) => s.length > 30).slice(0, level === 'deep' ? 10 : 6),
    analogy: level === 'simple' ? analogies[Math.floor(Math.random() * analogies.length)] : null,
    steps:
      level === 'deep'
        ? [
            '١. اقرأ التعريف أولاً وحدّد الكلمات المفتاحية.',
            '٢. اربط كل مفهوم بمثال من واقعك.',
            '٣. اختبر نفسك بسؤال «لماذا؟» لكل جملة.',
            '٤. أعد صياغة الفكرة بكلماتك دون النظر إلى النص.',
            '٥. حلّ تمريناً واحداً على الأقل لكل مفهوم.',
          ]
        : [
            '١. ابدأ بالتعريف.',
            '٢. اربط بمثال بسيط.',
            '٣. اختبر نفسك بسؤال واحد.',
          ],
    gap: sents.length ? 'أهم جملة يجب حفظها: ' + sents.sort((a, b) => b.length - a.length)[0] : null,
  };
  return out;
}

/** استخراج خطة مراجعة من محاور المستندات */
export function plan(docs, { days = 7, minutes = 60 } = {}) {
  const headings = [];
  for (const d of docs) for (const h of d.outline || []) headings.push({ ...h, docId: d.id, docTitle: d.title });
  const unique = [];
  const seen = new Set();
  for (const h of headings) {
    const k = normalize(h.heading).slice(0, 40);
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(h);
  }
  const daysArr = Array.from({ length: days }, (_, i) => ({
    day: i + 1,
    date: new Date(Date.now() + i * 86400000).toISOString().slice(0, 10),
    blocks: [],
    minutes,
  }));
  unique.forEach((h, i) => {
    const d = daysArr[i % days];
    d.blocks.push({ kind: 'read', topic: h.heading, docTitle: h.docTitle, docId: h.docId, page: h.page, minutes: Math.round(minutes / Math.min(3, unique.length)) });
  });
  daysArr.forEach((d) => {
    d.blocks.push({ kind: 'recall', topic: 'استرجاع نشط لما درسته', minutes: 10 });
    d.blocks.push({ kind: 'quiz', topic: '٥ تمارين سريعة', minutes: 15 });
  });
  return { days: daysArr, totalTopics: unique.length };
}
