import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Library } from './lib/library.js';
import { extract, ext } from './lib/extract.js';
import { uid, humanSize, textQuality } from './lib/util.js';
import { bestPassages, composeAnswer, bullets, isGarbage } from './lib/compose.js';
import { generateExercises, gradeOpenAnswer, generateFlashcards } from './lib/exercises.js';
import { searchAll, readPage } from './lib/search.js';
import { summarize, explain, plan } from './lib/summarize.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3000);

const app = express();
const lib = new Library(DATA);

app.use(express.json({ limit: '48mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* ── الرفع: حتى 3 غيغابايت للملف، ومئات الملفات في الدفعة ── */
const TMP = path.join(DATA, 'tmp');
fs.mkdirSync(TMP, { recursive: true });
// الملفات تُحفظ على القرص أثناء الرفع (لا في الذاكرة) — يمكن رفع ملفات بالغيغابايتات
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uid(8)}.part`),
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_BYTES || 3 * 1024 * 1024 * 1024), files: 300 },
});

/* ── حالة المكتبة ─────────────────────────────────────────── */
app.get('/api/stats', (req, res) => {
  const s = lib.stats();
  res.json({
    ...s,
    bytesHuman: humanSize(s.bytes),
    limits: { perFile: '3 GB', batch: '200 ملف' },
    maxUploadHuman: '3 GB',
  });
});

app.get('/api/docs', (req, res) => res.json({ docs: lib.list(), stats: lib.stats() }));

/* محتوى مقطع محدد (للتنقّل داخل المستند الكبير دون تحميله كاملاً) */
app.get('/api/docs/:id/chunk/:seq', (req, res) => {
  const doc = lib.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'غير موجود' });
  const seq = Number(req.params.seq) || 0;
  const all = lib.chunks.filter((c) => c.docId === req.params.id);
  const ch = all.find((c) => c.seq === seq);
  if (!ch) return res.status(404).json({ error: 'مقطع غير موجود' });
  res.json({ seq, total: all.length, page: ch.page, text: ch.text });
});

app.get('/api/docs/:id/text', (req, res) => {
  const doc = lib.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'المستند غير موجود' });
  const q = req.query.q || '';
  const text = lib.docText(req.params.id, Number(req.query.limit) || 600000);
  res.json({
    doc,
    text,
    outline: lib.outline(req.params.id),
    facts: lib.facts(req.params.id),
    highlights: q ? lib.search(q, { limit: 40, docIds: [req.params.id] }) : [],
  });
});

app.get('/api/docs/:id/summary', (req, res) => {
  const doc = lib.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'المستند غير موجود' });
  const text = lib.docText(req.params.id, 200000);
  res.json({
    doc,
    short: summarize(text, { maxSentences: 5 }),
    medium: summarize(text, { maxSentences: 10 }),
    long: summarize(text, { maxSentences: 18 }),
    outline: lib.outline(req.params.id),
    facts: lib.facts(req.params.id),
  });
});

app.delete('/api/docs/:id', async (req, res) => {
  const ok = await lib.remove(req.params.id);
  res.json({ ok });
});

/* ── رفع الملفات ──────────────────────────────────────────── */
app.post('/api/upload', upload.array('files', 300), async (req, res) => {
  // ملاحظة: multer على القرص — الذاكرة تبقى منخفضة حتى مع ملفات غيغابايتية
  const files = req.files || [];
  const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY || 4);

  async function processOne(f) {
    // multer يفكّ UTF-8 أحياناً بشكل مغلوط في أسماء الملفات العربية
    const raw = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const name = raw.includes('\uFFFD') ? f.originalname : raw;
    const cleanName = name.replace(/[\/\\]/g, '_');
    const id = uid(12);
    try {
      const buffer = await fsp.readFile(f.path);
      const ex = ext(cleanName);
      const started = Date.now();
      const { pages, info } = await extract({ buffer, filename: cleanName });
      const text = pages
        .map((p) => (pages.length > 1 ? `\n[صفحة ${p.page}${p.source ? ' · ' + p.source : ''}]\n${p.text}` : p.text))
        .join('\n')
        .trim();
      if (!text || text.replace(/\s/g, '').length < 10) {
        throw new Error('لم يتم استخراج نص — قد يكون الملف صوراً ممسوحة (استخدم PDF نصي أو شغّل OCR)');
      }
      const quality = textQuality(text);
      const info2 = { ...info, quality: Math.round(quality * 100) };
      if (quality < 0.6) {
        info2.warning =
          quality < 0.35
            ? 'النص المستخرج غير مقروء تقريباً (ملف ممسوح ضوئياً أو ترميز خطوط غير مدعوم). جرّب نسخة نصية أو شغّل OCR.'
            : 'جودة الاستخراج متوسطة — بعض الفقرات قد تكون مشوّشة.';
        info2.broken = quality < 0.35;
      }
      const meta = await lib.add({
        id,
        title: cleanName.replace(/\.[^.]+$/, ''),
        filename: cleanName,
        buffer,
        ext: ex,
        text,
        pages: pages.length,
        info: { ...info2, ms: Date.now() - started },
      });
      return { ok: true, doc: meta, sizeHuman: humanSize(f.size) };
    } catch (e) {
      return { ok: false, filename: cleanName, error: e.message };
    } finally {
      await fsp.rm(f.path, { force: true }).catch(() => {});
    }
  }

  const results = new Array(files.length);
  lib.beginBulk();
  let cursor = 0;
  async function worker() {
    while (cursor < files.length) {
      const i = cursor++;
      results[i] = await processOne(files[i]);
    }
  }
  try {
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
  } finally {
    await lib.endBulk();
  }

  res.json({ uploaded: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length, results });
});

/* ── إضافة نص مباشرة (لصق أو موضوع) ───────────────────────── */
app.post('/api/notes', async (req, res) => {
  const { title = 'ملاحظة', text = '' } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: 'النص فارغ' });
  const id = uid(12);
  const meta = await lib.add({
    id,
    title,
    filename: title + '.txt',
    ext: 'txt',
    text,
    pages: Math.max(1, Math.ceil(text.length / 3000)),
    kind: 'note',
  });
  res.json({ ok: true, doc: meta });
});

/* ── السؤال والجواب ──────────────────────────────────────── */
app.post('/api/ask', async (req, res) => {
  const { question = '', docIds = null, lang = 'ar', deep = false, web = false } = req.body || {};
  if (!question.trim()) return res.status(400).json({ error: 'اكتب سؤالك أولاً' });
  const started = Date.now();
  const hits = lib.search(question, { limit: deep ? 24 : 14, docIds })
    .filter((h) => !isGarbage(h.text));
  const passages = bestPassages(question, hits, { maxPassages: deep ? 12 : 8 });
  const composed = composeAnswer(question, passages, lang);

  let webSources = [];
  if (web) {
    const s = await searchAll(question, lang).catch(() => ({ sources: [] }));
    webSources = s.sources.slice(0, 6);
  }

  res.json({
    question,
    answer: composed?.text || null,
    bullets: bullets(passages, deep ? 8 : 5),
    citations: (composed?.usedAll || composed?.used || []).map((p) => ({
      docId: p.docId,
      docTitle: p.docTitle,
      page: p.page,
      snippet: p.text.slice(0, 260),
    })),
    related: hits.slice(0, 8).map((h) => ({
      docId: h.docId,
      docTitle: h.docTitle,
      page: h.page,
      score: h.score,
      snippet: h.text.slice(0, 240),
    })),
    web: webSources,
    confidence:
      passages.length >= 4 ? 'high' : passages.length >= 2 ? 'medium' : passages.length ? 'low' : 'none',
    tookMs: Date.now() - started,
    libraryEmpty: lib.stats().documents === 0,
  });
});

/* ── تمارين ───────────────────────────────────────────────── */
app.post('/api/exercises', async (req, res) => {
  try {
    const { docIds = null, topic = '', count = 8, types = ['mcq', 'tf', 'fill'], difficulty = 'mixed' } = req.body || {};
    const set = generateExercises({ library: lib, docIds, topic, count: Math.min(40, Math.max(1, count)), types, difficulty });
    res.json(set);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/flashcards', async (req, res) => {
  try {
    const { docIds = null, topic = '', count = 20 } = req.body || {};
    const set = generateFlashcards({ library: lib, docIds, topic, count: Math.min(80, Math.max(4, count)) });
    res.json(set);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/grade', async (req, res) => {
  const { question, userAnswer = '', modelAnswer = '' } = req.body || {};
  res.json({ ...gradeOpenAnswer(question, userAnswer, modelAnswer), modelAnswer });
});

/* ── الشرح ────────────────────────────────────────────────── */
app.post('/api/explain', async (req, res) => {
  const { topic = '', docIds = null, level = 'simple', web = false } = req.body || {};
  const hits = lib.search(topic, { limit: 16, docIds });
  const sourceText = hits.map((h) => h.text).join('\n\n') || lib.docText(docIds?.[0] || '', 120000);
  let webText = '';
  let webSources = [];
  if ((!sourceText || web) && topic) {
    const s = await searchAll(topic, 'ar').catch(() => ({ sources: [] }));
    webSources = s.sources.slice(0, 5);
    webText = s.sources.map((x) => x.text).join('\n\n');
  }
  const merged = [sourceText, webText].filter(Boolean).join('\n\n');
  if (!merged) return res.json({ error: 'لا يوجد محتوى لشرحه — أضف ملفات أو فعّل البحث في الويب', level });
  const out = explain(topic, merged, level);
  out.sources = hits.slice(0, 6).map((h) => ({ docId: h.docId, docTitle: h.docTitle, page: h.page }));
  out.web = webSources;
  res.json(out);
});

/* ── التلخيص ──────────────────────────────────────────────── */
app.post('/api/summarize', async (req, res) => {
  const { text = '', docIds = null, maxSentences = 10 } = req.body || {};
  let src = text;
  if (!src && docIds) src = docIds.map((id) => lib.docText(id, 100000)).join('\n\n');
  if (!src) return res.status(400).json({ error: 'لا يوجد نص' });
  res.json({
    summary: summarize(src, { maxSentences }),
    words: src.split(/\s+/).length,
    ratio: Math.round((Math.min(src.length, maxSentences * 200) / Math.max(1, src.length)) * 100),
  });
});

/* ── خطة المراجعة ─────────────────────────────────────────── */
app.post('/api/plan', async (req, res) => {
  const { days = 7, minutes = 60 } = req.body || {};
  const docs = lib.list().map((d) => ({ ...d, outline: lib.outline(d.id, 25) }));
  res.json(plan(docs, { days: Math.min(60, Math.max(1, days)), minutes }));
});

/* ── بحث الويب ───────────────────────────────────────────── */
app.get('/api/web', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'اكتب ما تريد البحث عنه' });
  try {
    const out = await searchAll(q, req.query.lang || 'ar');
    res.json(out);
  } catch (e) {
    res.status(502).json({ error: 'تعذّر البحث الآن: ' + e.message });
  }
});

app.post('/api/web/read', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'رابط مفقود' });
  try {
    const page = await readPage(url);
    res.json({ ...page, summary: summarize(page.text, { maxSentences: 8 }) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

/* ── تنزيل ملف أصلي ──────────────────────────────────────── */
app.get('/api/docs/:id/file', (req, res) => {
  const meta = lib.getDoc(req.params.id);
  if (!meta) return res.status(404).end();
  const p = lib.filePath(meta);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.download(p, meta.filename); // express يدعم Range تلقائياً
});

/* ── تصدير ───────────────────────────────────────────────── */
app.post('/api/export', async (req, res) => {
  const { title = 'تقرير', sections = [] } = req.body || {};
  const html = `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8">
  <title>${title}</title>
  <style>body{font-family:system-ui,'Segoe UI',Tahoma,sans-serif;max-width:820px;margin:32px auto;padding:0 20px;line-height:1.9;color:#1a1a1a}
  h1{color:#0f766e}h2{color:#115e59;border-bottom:2px solid #ccfbf1;padding-bottom:6px;margin-top:32px}
  .src{font-size:12px;color:#64748b}ul{padding-right:22px}blockquote{border-right:4px solid #5eead4;margin:0;padding:6px 14px;background:#f0fdfa}</style>
  <h1>${title}</h1>
  ${sections
    .map(
      (s) =>
        `<section><h2>${s.heading || ''}</h2>${(s.items || []).map((i) => `<p>${i}</p>`).join('')}${
          s.source ? `<p class="src">المصدر: ${s.source}</p>` : ''
        }</section>`,
    )
    .join('')}
  </html>`;
  res.setHeader('content-disposition', `attachment; filename="report.html"`);
  res.type('html').send(html);
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'الملف أكبر من 3 غيغابايت' });
  res.status(500).json({ error: err.message || 'خطأ غير متوقع' });
});

await lib.init();
app.listen(PORT, '0.0.0.0', () => {
  const s = lib.stats();
  console.log(`مذاكر يعمل على http://0.0.0.0:${PORT} — ${s.documents} مستند، ${s.chunks} مقطع، ${s.words} كلمة`);
});
