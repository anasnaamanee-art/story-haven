import { normalize, tokenize, uid } from './util.js';
import { sentences } from './compose.js';

const AR = {
  correct: 'صحيح ✅',
  wrong: 'خطأ ❌',
  trueWord: 'صواب',
  falseWord: 'خطأ',
  explain: 'التفسير',
};

/** كلمات إشكالية تُستبعد من أن تكون إجابة صحيحة */
const BAD_ANSWER = new Set(
  'الشمس الرياح المياه الطاقة الخلية الخلايا المرحلة العملية العملية النظام الدولة العالم الوقت اليوم العام الحالة الفكرة الجملة النص الصفحة السؤال الجواب العام الأول الثاني الثالث الرابع الاخير الأخرى الآخرى كما لكن ايضا أيضا فقط جدا حين عندما حالة طريقة انواع أنواع مصادر هذه ذلك التي الذي طاقة خلية خلايا جزء عملية نتيجة مثال شكل مقدار عدد قيمة مستوى مرحلة مجموعة عامل سبب اثر أثر دور هدف نوع باب درس فصل وحدة سؤال جواب نص كتاب ورقة صفحة سطر جدول كهرباء طبيعية متقطع مستمرة دفيئة'.split(
    ' ',
  ),
);

/** يختار كلمات مفتاحية "مفهومية" لتكون أجوبة صحيحة */
function keyConcepts(text, limit = 60) {
  const freq = new Map();
  const raw = String(text);
  for (const m of raw.matchAll(/\b[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ-]{4,}\b/g)) {
    const w = m[0];
    if (/^(the|and|with|from|that|this|which|their|there|these|those|sont|dans|pour|avec|plus|mais|comme|aussi|cette|nous|vous|elle|ils|elles|chaque|cette)$/i.test(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  for (const m of raw.matchAll(/[\u0621-\u064A]{3,}/g)) {
    const w = m[0];
    const n = normalize(w);
    if (n.length < 3) continue;
    if (BAD_ANSWER.has(n) || BAD_ANSWER.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()]
    .filter(([w]) => w.length >= 4 && !isVerbLike(w))
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w)
    .slice(0, limit);
}

/** يقدّر أن الكلمة فعل (عربي بلا «ال» يبدأ بحروف المضارعة) */
function isVerbLike(w) {
  const n = normalize(w);
  if (/^[وفبلك]?ال/.test(n)) return false;
  if (n.startsWith('ال')) return false;
  if (n.startsWith('و')) return isVerbLike(n.slice(1));
  if (/^(ت|ي|ن|أ|ا)(?!ل)/.test(n) && n.length <= 6) return true;
  if (/^(كان|يكون|تكون|تم|يتم|تمت|جعل|يجعل|أدى|يؤدي|يعتبر|تعتبر|يتكون|تتكون|ينقسم|تنقسم|ينتج|تنتج|يستخدم|تستخدم|يحتوي|تحتوي|يعتمد|تعتمد|يمكن|لا)$/.test(n)) return true;
  return false;
}

/** يستخرج رأس التعريف من جملة: «X هو Y» أو «X : Y» */
function definitionHead(sentence, concepts) {
  const pats = [
    /^(?:[\u0621-\u064A\s\d]{3,60}?)\s+(?:هو|هي|هم)\s+/,
    /^([\u0621-\u064A]{4,}(?:\s+[\u0621-\u064A]{2,})?)\s*:\s*/,
    /^(.{3,50}?)\s+(?:يُعرف|تعرف|يعني|يقصد)\s/,
  ];
  for (const p of pats) {
    const m = sentence.match(p);
    if (m) {
      const head = (m[1] || m[0]).replace(/\s+(هو|هي|هم)\s*$/, '').trim();
      if (head.length >= 4 && head.length <= 60 && !BAD_ANSWER.has(normalize(head))) return head;
    }
  }
  // أطول مفهوم في الجملة
  const toks = [...sentence.matchAll(/[\u0621-\u064A]{4,}|\b[A-Za-zÀ-ÿ]{4,}\b/g)].map((m) => m[0]);
  const found = toks.filter((x) => concepts.includes(x) && !BAD_ANSWER.has(normalize(x)));
  return found.sort((a, b) => b.length - a.length)[0] || null;
}

/** يستخرج مصطلحات قابلة للاستخدام كإجابة (ينظّف و/ب/ل البادئة) */
function pluckTerms(text, concepts) {
  return [...text.matchAll(/\b[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ-]{3,}\b|[\u0621-\u064A]{4,}/g)]
    .map((m) => {
      const full = m[0];
      const clean = full.replace(/^[وفبلك]/, '');
      return { full, clean: clean.length >= 4 ? clean : full };
    })
    .filter((t) => concepts.includes(t.clean) && !BAD_ANSWER.has(normalize(t.clean)) && !isVerbLike(t.clean))
    .sort((a, b) => b.clean.length - a.clean.length);
}

const isHeadingLineSafe = (t) => {
  const s = String(t).trim();
  if (s.length > 90) return false;
  if (/[.!؟?]$/.test(s)) return false;
  return s.split(/\s+/).filter(Boolean).length <= 8;
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/**
 * يولّد تمارين من محتوى المكتبة.
 * الأنواع: اختيار من متعدد، صواب/خطأ، إكمال الفراغ، تعريف مصطلح، ترتيب.
 */
export function generateExercises({ library, docIds, topic = '', count = 10, types = ['mcq', 'tf', 'fill', 'term'], difficulty = 'mixed' }) {
  const pool = [];
  const docs = docIds?.length ? docIds : library.list().map((d) => d.id);
  const query = topic || library.topTerms(null, 12).map((t) => t.term).join(' ');
  const hits = library.search(query, { limit: 90, docIds: docs });
  const allText = hits.map((h) => h.text).join('\n\n');

  const concepts = keyConcepts(allText, 120);
  // مفاهيم كل مستند على حدة — مشتّتات أدق
  const docConcepts = new Map();
  for (const h of hits) {
    if (!docConcepts.has(h.docId)) docConcepts.set(h.docId, keyConcepts(hits.filter((x) => x.docId === h.docId).map((x) => x.text).join(' '), 40));
  }
  const sentencesAll = [];
  const seen = new Set();
  for (const h of hits) {
    for (const s of sentences(h.text)) {
      if (s.length < 45 || s.length > 300) continue;
      const key = normalize(s).slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      sentencesAll.push({ text: s, docId: h.docId, docTitle: h.docTitle, page: h.page });
    }
  }

  // عند تحديد موضوع: نفضّل الجمل التي تذكر مصطلحاً من الموضوع فعلاً
  if (topic) {
    const topicTerms = tokenize(topic);
    const onTopic = sentencesAll.filter((s) => {
      const st = new Set(tokenize(s.text));
      return topicTerms.some((t) => [...st].some((x) => x === t || x.startsWith(t) || t.startsWith(x)));
    });
    if (onTopic.length >= 3) {
      sentencesAll.length = 0;
      sentencesAll.push(...onTopic);
    }
  }

  const want = { mcq: 0, tf: 0, fill: 0, term: 0 };
  const active = types.length ? types : ['mcq'];
  for (let i = 0; i < count; i++) want[active[i % active.length]]++;

  const out = [];

  const usedTargets = new Set();

  /* — اختيار من متعدد — */
  if (want.mcq) {
    const facts = sentencesAll.filter((s) => /( هو | هي | يعني | يُعرف|تعرف|يُقسم|ينقسم|يتكون|يُستخدم|يستخدم|يُعرف ب|أهم|نتيجة|يحدث|لأن|est |sont |désigne|signifie|permet|consiste)/i.test(s.text));
    const source = facts.length >= want.mcq ? facts : sentencesAll;
    for (const f of shuffle(source).slice(0, want.mcq * 2)) {
      // ابحث عن مصطلح يمكن حذفه من الجملة (مفهوم لا كلمة شائعة)
      const tokens = [...f.text.matchAll(/\b[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ-]{4,}\b|[\u0621-\u064A]{4,}/g)]
        .map((m) => m[0])
        .filter((t) => concepts.includes(t) && !BAD_ANSWER.has(normalize(t)) && !isVerbLike(t))
        .sort((a, b) => b.length - a.length);
      if (tokens.length < 1) continue;
      const target = tokens[0];
      if (usedTargets.has(normalize(target))) continue;
      usedTargets.add(normalize(target));
      if (out.filter((o) => o.type === 'mcq').length >= want.mcq) break;
      const question = f.text.replace(target, '______');
      if (question === f.text) continue;
      const distractors = shuffle(concepts.filter((c) => c !== target && Math.abs(c.length - target.length) < 14)).slice(0, 3);
      if (distractors.length < 3) continue;
      const options = shuffle([target, ...distractors]);
      out.push({
        id: uid(6),
        type: 'mcq',
        question: `أكمل/اختر المصطلح الصحيح: ${question}`,
        options,
        answerIndex: options.indexOf(target),
        answer: target,
        explanation: `النص الأصلي: «${f.text}» — المصطلح الصحيح هو «${target}».`,
        source: { docId: f.docId, docTitle: f.docTitle, page: f.page },
        difficulty: 'medium',
      });
    }
  }

  /* — صواب / خطأ (نصفها معدّل ليصير خطأ) — */
  if (want.tf) {
    for (const [i, f] of shuffle(sentencesAll).slice(0, want.tf).entries()) {
      const makeFalse = i % 2 === 1;
      if (f.text.split(' ').length < 6) continue;
      if (isHeadingLineSafe(f.text)) continue;
      let statement = f.text;
      let answer = true;
      let explanation = `ورد في المصدر: «${f.text}»`;
      if (makeFalse) {
        const nums = [...statement.matchAll(/\d+(?:[.,]\d+)?/g)];
        if (nums.length) {
          const num = nums[0][0];
          const newNum = String(Math.max(1, Math.round(Number(num.replace(',', '.')) * 2 + 3)));
          statement = statement.replace(num, newNum);
          answer = false;
          explanation = `الرقم الصحيح هو ${num}، لكن الجملة ذكرت ${newNum}. النص الأصلي: «${f.text}»`;
        } else {
          const toks = pluckTerms(statement, concepts).sort((a, b) => b.clean.length - a.clean.length);
          const pick = toks[0];
          if (!pick) continue;
          const stmtNorm = normalize(statement);
          const okAlt = (c) =>
            c !== pick.clean &&
            !isVerbLike(c) &&
            !BAD_ANSWER.has(normalize(c)) &&
            !stmtNorm.includes(normalize(c)) &&
            Math.abs(c.length - pick.clean.length) <= Math.max(4, pick.clean.length * 0.6);
          const localPool = (docConcepts.get(f.docId) || keyConcepts(f.text, 30)).filter(okAlt);
          const alt = localPool[0];
          if (!alt || normalize(alt) === normalize(pick.clean)) continue;
          statement = statement.replace(pick.full, alt);
          answer = false;
          explanation = `الكلمة الصحيحة هي «${pick.clean}» وليس «${alt}». النص الأصلي: «${f.text}»`;
        }
      }
      out.push({
        id: uid(6),
        type: 'tf',
        question: statement,
        options: ['صواب', 'خطأ'],
        answerIndex: answer ? 0 : 1,
        answer: answer ? 'صواب' : 'خطأ',
        explanation,
        source: { docId: f.docId, docTitle: f.docTitle, page: f.page },
        difficulty: makeFalse ? 'hard' : 'easy',
      });
    }
  }

  /* — إكمال الفراغ — */
  if (want.fill) {
    for (const f of shuffle(sentencesAll).slice(0, want.fill * 2)) {
      const tokens = pluckTerms(f.text, concepts);
      const target = tokens[0];
      if (!target || usedTargets.has(normalize(target.clean))) continue;
      usedTargets.add(normalize(target.clean));
      out.push({
        id: uid(6),
        type: 'fill',
        question: `أكمل الفراغ: ${f.text.replace(target.full, '________________')}`,
        answer: target.clean,
        explanation: `الإجابة: «${target.clean}». النص الأصلي: «${f.text}»`,
        source: { docId: f.docId, docTitle: f.docTitle, page: f.page },
        difficulty: 'medium',
        aliases: [normalize(target.clean)],
      });
      if (out.filter((o) => o.type === 'fill').length >= want.fill) break;
    }
  }

  /* — تعريف مصطلح — */
  if (want.term) {
    const defs = sentencesAll.filter((s) => /( هو | هي | يعني | يُعرف|تعرف ب|يقصد ب|est |sont |désigne|signifie|se définit)/i.test(s.text));
    const usedTerms = new Set();
    for (const d of shuffle(defs).slice(0, want.term * 2)) {
      const term = definitionHead(d.text, concepts);
      if (!term || usedTerms.has(normalize(term))) continue;
      usedTerms.add(normalize(term));
      if (out.filter((o) => o.type === 'term').length >= want.term) break;
      out.push({
        id: uid(6),
        type: 'term',
        question: `عرّف بإيجاز: «${term}»`,
        answer: d.text,
        keywords: tokenize(d.text).slice(0, 12),
        explanation: `نموذج الإجابة من المصدر: «${d.text}»`,
        source: { docId: d.docId, docTitle: d.docTitle, page: d.page },
        difficulty: 'hard',
      });
    }
  }

  return {
    topic: topic || 'مزيج من مواضيع المكتبة',
    generatedAt: new Date().toISOString(),
    difficulty,
    questions: out.slice(0, count),
    seed: { docs: docs.length, scanned: hits.length },
  };
}

/** تقدير الإجابة النصية الحرة بمقارنة الكلمات المفتاحية */
export function gradeOpenAnswer(question, userAnswer, modelAnswer) {
  const kw = tokenize(modelAnswer).slice(0, 14);
  const ua = new Set(tokenize(userAnswer));
  const hit = kw.filter((k) => [...ua].some((u) => u === k || u.startsWith(k) || k.startsWith(u)));
  const ratio = kw.length ? hit.length / kw.length : 0;
  let feedback;
  if (ratio >= 0.6) feedback = 'إجابة قوية — غطيت أهم عناصر الإجابة النموذجية.';
  else if (ratio >= 0.3) feedback = 'إجابة جزئية — أضف العناصر الناقصة: ' + kw.filter((k) => !hit.includes(k)).slice(0, 6).join('، ');
  else feedback = 'إجابة ضعيفة — راجع الفقرة المصدر ثم أعد الصياغة مستعيناً بالكلمات: ' + kw.slice(0, 8).join('، ');
  return { score: Math.round(Math.min(1, ratio) * 100), matched: hit, missing: kw.filter((k) => !hit.includes(k)), feedback };
}


/** بطاقات مراجعة: مصطلح ← تعريفه، مأخوذة من جمل التعريف في المصادر */
export function generateFlashcards({ library, docIds, topic = '', count = 20 }) {
  const docs = docIds?.length ? docIds : library.list().map((d) => d.id);
  const query = topic || library.topTerms(null, 15).map((t) => t.term).join(' ');
  let hits = library.search(query, { limit: 80, docIds: docs });
  if (!hits.length) hits = library.search(library.topTerms(null, 12).map((t) => t.term).join(' '), { limit: 60, docIds: docs });

  const cards = [];
  const seen = new Set();
  for (const h of hits) {
    for (const s of sentences(h.text)) {
      const t = s.trim();
      if (t.length < 30 || t.length > 300) continue;
      if (!/( هو | هي | يعني | يُعرف|تعرف ب|يقصد ب|: |est |sont |désigne|signifie|se définit|consiste)/i.test(t)) continue;
      let term = null;
      let def = t;
      const m1 = t.match(/^(.{4,70}?)\s+(?:وهو|وهي|هو|هي|هم)\s+(.+)$/);
      const m2 = t.match(/^([\u0621-\u064A\s]{4,50}|[A-Za-zÀ-ÿ\s-]{4,50})\s*:\s*(.+)$/);
      const m3 = t.match(/^(.{4,60}?)\s+(?:يُعرف|تعرف|يعني|يقصد)\s+(.+)$/);
      const mm = m1 || m2 || m3;
      if (mm) {
        term = mm[1].trim().replace(/^[وف]/, '');
        def = mm[2].trim();
      }
      // تجنّب المصطلحات المبتورة من منتصف الجملة
      // «قانون مندل الأول هو قانون الانفصال» → «قانون مندل الأول»
      if (term) term = term.replace(/\s+(?:هو|هي|هم).*$/, '').trim();
      if (term && /\s+قانون$/.test(term)) term = term.replace(/\s+قانون$/, ' الأول').trim();
      if (term && (/^نون/.test(term) || /الانفصال،/.test(term) || term.split(' ').length > 8)) term = null;
      if (!term || term.length < 4 || term.length > 60) continue;
      if (seen.has(normalize(term))) continue;
      seen.add(normalize(term));
      cards.push({
        id: uid(6),
        term,
        definition: def,
        full: t,
        source: { docId: h.docId, docTitle: h.docTitle, page: h.page },
      });
      if (cards.length >= count) break;
    }
    if (cards.length >= count) break;
  }
  return { topic: topic || 'مزيج من مواضيع المكتبة', cards, generatedAt: new Date().toISOString() };
}
