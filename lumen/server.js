import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { Library } from './lib/library.js';
import { stemTokens } from './lib/lang.js';
import { extract, ext } from './lib/extract.js';
import { uid, humanSize, summarize, splitSentences, detectLang, textQualitySafe } from './lib/lang-extra.js';
import {
  classify,
  resolveTopic,
  answerGreeting,
  answerIdentity,
  answerCapabilities,
  answerMath,
  answerDefine,
  answerHowto,
  answerCompare,
  answerPlan,
  answerQuiz,
  answerLetter,
  answerSummarize,
  answerCode,
  answerRecipe,
  answerPoem,
  answerWhy,
  answerFix,
  answerTranslate,
  answerOpinion,
  answerList,
  answerThanks,
  answerGeneral,
  answerQuizFromDocs,
  kbAnswer,
  detectDomain,
  correctText,
} from './lib/brain.js';
import { searchAll, readPage } from './lib/search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const PORT = Number(process.env.PORT || 3100);

const app = express();
const lib = new Library(DATA);

app.use(express.json({ limit: '48mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h' }));

/* santé du service — utile pour les sondes de disponibilité */
app.get('/api/health', (req, res) => res.json({ ok: true, service: 'lumen', uptime: Math.round(process.uptime()), docs: lib.stats().documents }));

/* ── Upload : disque, pas mémoire → fichiers de plusieurs Go ── */
const TMP = path.join(DATA, 'tmp');
fs.mkdirSync(TMP, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, TMP),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${uid(8)}.part`),
  }),
  limits: { fileSize: Number(process.env.MAX_FILE_BYTES || 3 * 1024 * 1024 * 1024), files: 300 },
});

const OK_LANGS = new Set(['fr', 'en', 'ar']);

/* ═══════════════ CHAT ═══════════════ */

app.post('/api/chat', async (req, res) => {
  const started = Date.now();
  const {
    message = '',
    history = [],
    level = 'moyen',
    web = false,
    docIds = null,
    mode = 'chat',
    name = null,
  } = req.body || {};

  const text = String(message).trim();
  if (!text) return res.status(400).json({ error: 'Message vide' });
  if (text.length > 20000) return res.status(413).json({ error: 'Message trop long (20 000 caractères max)' });

  const lang = detectLang(text);
  const { topic, followUp } = resolveTopic(text, history);
  const intent = classify(text);
  const domain = detectDomain(topic);

  /* ── 1) réponse ancrée dans les documents joints (BM25 + seuil de pertinence) ── */
  let docAnswer = null;
  let sources = [];
  let docCoverage = 0;
  if (Array.isArray(docIds) && docIds.length) {
    const qTerms = [...new Set(stemTokens(topic))];
    const hits = lib.search(topic, { limit: 8, docIds }).filter((h) => h.text && h.text.length > 40);
    if (hits.length && qTerms.length) {
      // couverture : quelle part des mots de la question apparaît dans le meilleur fragment ?
      const best = hits[0];
      const chunk = lib.chunkMap.get(best.chunkId);
      const set = new Set(chunk?.terms || []);
      let matched = 0;
      for (const t of qTerms) if (set.has(t)) matched++;
      docCoverage = matched / qTerms.length;

      if (docCoverage >= 0.34) {
        const lines = hits.slice(0, 4).map((h) => {
          const clean = h.text.replace(/\[page [^\]]*\]/gi, ' ').replace(/\s+/g, ' ').trim();
          const sents = splitSentences(clean).filter((x) => x.length > 30).slice(0, 2).join(' ');
          return `- ${sents || clean.slice(0, 280)} _(p. ${h.page} · ${h.docTitle})_`;
        });
        docAnswer = `**D'après vos documents :**\n\n${lines.join('\n')}`;
        sources = [...new Map(hits.map((h) => [h.docId, { title: h.docTitle, docId: h.docId, kind: 'document', page: h.page }])).values()];
      }
    }
  }

  /* ── 2) réponse par intention ── */
  let out = null;
  const simpleMath = calcOrNull(text);
  switch (intent) {
    case 'greeting':
      out = answerGreeting({ name });
      break;
    case 'thanks':
      out = answerThanks();
      break;
    case 'identity':
      out = answerIdentity();
      break;
    case 'capability':
      out = answerCapabilities();
      break;
    case 'math':
      out = simpleMath ? answerMath(text) : null;
      break;
    case 'translate':
      out = answerTranslate(text);
      break;
    case 'summarize': {
      if (Array.isArray(docIds) && docIds.length) {
        const blocks = docIds.slice(0, 4).map((id) => {
          const meta = lib.getDoc(id);
          const full = lib.docText(id, 300000).replace(/\[page [^\]]*\]/gi, '\n');
          return {
            title: meta?.title || 'Document',
            court: summarize(full, 3),
            moyen: summarize(full, 8),
            outline: lib.outline(id, 12),
          };
        });
        out = {
          text: blocks
            .map(
              (b) =>
                `**${b.title}**\n\n**L'essentiel :** ${b.court}\n\n**Résumé :** ${b.moyen}${
                  b.outline.length ? `\n\n**Plan :**\n${b.outline.slice(0, 10).map((o) => `- ${o.heading}`).join('\n')}` : ''
                }`,
            )
            .join('\n\n---\n\n'),
          chips: ['Crée des exercices sur ce document', 'Résume en 3 points', 'Quelles sont les dates importantes ?', 'Explique la partie la plus difficile'],
          meta: { domain: 'Document' },
        };
      } else out = answerSummarize(text);
      break;
    }
    case 'code':
      out = answerCode(text);
      break;
    case 'recipe':
      out = answerRecipe(text);
      break;
    case 'letter':
      out = answerLetter(text);
      break;
    case 'list':
      out = answerList(text);
      break;
    case 'compare':
      out = answerCompare(text);
      break;
    case 'define':
      out = answerDefine(text, { level });
      break;
    case 'howto':
      out = answerHowto(text);
      break;
    case 'why':
      out = answerWhy(text);
      break;
    case 'opinion':
      out = answerOpinion(text);
      break;
    case 'plan':
      out = answerPlan(text);
      break;
    case 'quiz':
      out = (Array.isArray(docIds) && docIds.length ? answerQuizFromDocs({ library: lib, docIds, question: text, lang }) : null) || answerQuiz(text);
      break;
    case 'poem':
    case 'story':
      out = answerPoem(text);
      break;
    case 'fix':
      out = answerFix(text);
      break;
    default:
      out = kbAnswer(text, { level }) || answerGeneral(text, { level, domain });
  }
  if (!out) out = kbAnswer(text, { level }) || answerGeneral(text, { level, domain });

  /* ── 3) assemblage : les documents priment, le gabarit complète ── */
  const GENERIC = new Set(['general', 'question', 'define', 'list', 'compare', 'howto', 'why', 'opinion']);
  let answer = out.text;
  if (docAnswer) {
    // le contenu documentaire remplace le gabarit générique, sauf pour les demandes créatives/précises
    answer = GENERIC.has(intent) || intent === 'summarize' ? docAnswer : `${docAnswer}\n\n---\n\n${out.text}`;
  } else if (Array.isArray(docIds) && docIds.length && GENERIC.has(intent) && !docCoverage) {
    answer = `Je n'ai pas trouvé d'information précise là-dessus dans les documents joints.\n\n${out.text}`;
  }

  /* ── 4) recherche web (optionnelle) ── */
  let webSources = [];
  if (web) {
    try {
      const r = await searchAll(topic, lang === 'ar' ? 'ar' : 'fr');
      webSources = (r.sources || []).slice(0, 4).map((s) => ({
        title: s.title,
        url: s.url,
        type: s.type,
        snippet: (s.text || '').slice(0, 500),
      }));
      const enc = (r.sources || []).find((s) => s.type === 'encyclopedia' && (s.text || '').length > 200);
      if (enc) {
        const extract = summarize(enc.text, 8);
        answer += `\n\n---\n\n**Sources trouvées (${enc.lang?.toUpperCase() || 'FR'}) : ${enc.title}**\n${extract}\n\n_Consultez les liens ci-dessous pour vérifier._`;
        sources = [{ title: enc.title, url: enc.url, kind: 'web' }, ...sources];
      } else if (!enc && webSources.length) {
        answer += `\n\n---\n\n${webSources
          .map((s) => `- [${s.title}](${s.url})\n  ${s.snippet.slice(0, 220)}…`)
          .join('\n')}`;
      } else {
        answer += `\n\n> ⚠️ La recherche web n'a rien renvoyé (connexion sortante peut-être bloquée sur ce serveur). Je réponds donc avec mes connaissances internes.`;
      }
    } catch (e) {
      answer += `\n\n> ⚠️ Recherche web indisponible : ${e.message}`;
    }
  }

  const suggestions = out.chips?.length
    ? out.chips
    : ['Donne un exemple', 'Explique plus simplement', 'Teste-moi sur ce sujet'];

  res.json({
    answer,
    intent,
    domain: domain?.label || out.meta?.domain || null,
    suggestions,
    sources,
    web: webSources,
    followUp,
    lang,
    level,
    mode,
    tookMs: Date.now() - started,
    topic,
    tokensOut: answer.split(/\s+/).length,
  });
});

function calcOrNull(t) {
  try {
    const mod = t.replace(/,/g, '.').replace(/[^0-9+\-*/().^% ]/g, ' ');
    return /[0-9]/.test(mod) && /[+\-*/^%]/.test(mod) ? true : false;
  } catch {
    return false;
  }
}

/* ═══════════════ DOCUMENTS ═══════════════ */

app.post('/api/upload', upload.array('files', 300), async (req, res) => {
  const files = req.files || [];
  const CONCURRENCY = Number(process.env.UPLOAD_CONCURRENCY || 4);
  const results = new Array(files.length);
  lib.beginBulk();

  async function processOne(f) {
    const raw = Buffer.from(f.originalname, 'latin1').toString('utf8');
    const name = raw.includes('\uFFFD') ? f.originalname : raw;
    const cleanName = name.replace(/[/\\]/g, '_');
    const id = uid(12);
    try {
      const buffer = await fsp.readFile(f.path);
      const ex = ext(cleanName);
      const t0 = Date.now();
      const { pages, info } = await extract({ buffer, filename: cleanName });
      const text = pages
        .map((p) => (pages.length > 1 ? `\n[page ${p.page}${p.source ? ` · ${p.source}` : ''}]\n${p.text}` : p.text))
        .join('\n')
        .trim();
      if (!text || text.replace(/\s/g, '').length < 10) {
        throw new Error("Aucun texte extrait — le fichier est peut-être un scan (utilisez une version texte ou activez l'OCR)");
      }
      const quality = textQualitySafe(text);
      const info2 = { ...info, quality: Math.round(quality * 100) };
      if (quality < 0.6) info2.warning = 'Extraction de qualité moyenne — certaines parties peuvent être illisibles.';
      const meta = await lib.add({
        id,
        title: cleanName.replace(/\.[^.]+$/, ''),
        filename: cleanName,
        buffer,
        ext: ex,
        text,
        pages: pages.length,
        info: { ...info2, ms: Date.now() - t0 },
      });
      return { ok: true, doc: meta, sizeHuman: humanSize(f.size) };
    } catch (e) {
      return { ok: false, filename: cleanName, error: e.message };
    } finally {
      await fsp.rm(f.path, { force: true }).catch(() => {});
    }
  }

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
  res.json({
    uploaded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
});

app.get('/api/docs', (req, res) => res.json({ docs: lib.list(), stats: lib.stats() }));

app.get('/api/stats', (req, res) => {
  const s = lib.stats();
  res.json({ ...s, bytesHuman: humanSize(s.bytes) });
});

app.get('/api/docs/:id', (req, res) => {
  const doc = lib.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const ctx = lib.docContext(req.params.id);
  res.json({
    doc,
    outline: ctx.outline,
    facts: ctx.facts,
    summary: ctx.summary,
    excerpt: ctx.excerpt,
    text: lib.docText(req.params.id, 120000),
  });
});

app.get('/api/docs/:id/summary', (req, res) => {
  const doc = lib.getDoc(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Document introuvable' });
  const text = lib.docText(req.params.id, 300000).replace(/\[page [^\]]*\]/gi, '\n');
  res.json({
    doc,
    court: summarize(text, 4),
    moyen: summarize(text, 9),
    long: summarize(text, 16),
    outline: lib.outline(req.params.id),
    facts: lib.facts(req.params.id),
  });
});

app.get('/api/docs/:id/file', (req, res) => {
  const meta = lib.getDoc(req.params.id);
  if (!meta) return res.status(404).end();
  const p = lib.filePath(meta);
  if (!fs.existsSync(p)) return res.status(404).end();
  res.download(p, meta.filename);
});

app.delete('/api/docs/:id', async (req, res) => res.json({ ok: await lib.remove(req.params.id) }));

/* ═══════════════ OUTILS ═══════════════ */

app.post('/api/summarize', async (req, res) => {
  const { text = '', docIds = [], n = 6 } = req.body || {};
  let src = text;
  if (!src && docIds.length) src = docIds.map((id) => lib.docText(id, 200000)).join('\n\n');
  if (!src?.trim()) return res.status(400).json({ error: 'Aucun texte à résumer' });
  res.json({
    summary: summarize(src, Math.min(20, Math.max(2, n))),
    sentences: splitSentences(summarize(src, Math.min(20, Math.max(2, n)))),
    words: src.split(/\s+/).length,
  });
});

app.post('/api/correct', async (req, res) => {
  const { text = '' } = req.body || {};
  if (!text.trim()) return res.status(400).json({ error: 'Aucun texte' });
  res.json(correctText(text));
});

app.post('/api/title', async (req, res) => {
  const { message = '', answer = '' } = req.body || {};
  const base = (message || answer).replace(/\s+/g, ' ').trim();
  const t = base.length > 42 ? `${base.slice(0, 42).replace(/\s\w*$/, '')}…` : base;
  res.json({ title: t.replace(/^(c'est quoi|qu'est[- ]ce que|explique[- ]moi|comment|pourquoi)\s*/i, (m) => m) || 'Nouvelle discussion' });
});

app.get('/api/web', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'Requête vide' });
  try {
    res.json(await searchAll(q, req.query.lang || 'fr'));
  } catch (e) {
    res.status(502).json({ error: `Recherche indisponible : ${e.message}` });
  }
});

app.post('/api/web/read', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL manquante' });
  try {
    const page = await readPage(url);
    res.json({ ...page, summary: summarize(page.text, 8) });
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (max 3 Go)' });
  res.status(500).json({ error: err?.message || 'Erreur inattendue' });
});

await lib.init();
app.listen(PORT, '0.0.0.0', () => {
  const s = lib.stats();
  console.log(`Lumen prêt sur http://0.0.0.0:${PORT} — ${s.documents} document(s), ${s.chunks} fragment(s), ${s.words} mots`);
});
