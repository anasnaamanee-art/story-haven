import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { chunkText, normalize, tokenize, nowISO } from './util.js';

/**
 * مخزن المكتبة: مستندات + مقاطع + فهرس بحث (BM25) محفوظ على القرص.
 * مبني ليتعامل مع آلاف الملفات وملايين الكلمات دون تحميل كل شيء في الذاكرة.
 */
export class Library {
  constructor(root) {
    this.root = root;
    this.docsDir = path.join(root, 'docs');
    this.filesDir = path.join(root, 'files');
    this.indexFile = path.join(root, 'index.json');
    this.docs = new Map(); // id -> meta
    this.chunks = []; // {id, docId, page, seq, text, title}
    this.df = new Map();
    this.avgLen = 1;
    this.totalLen = 0;
    this.dirty = 0;
    this.ready = false;
  }

  async init() {
    await fsp.mkdir(this.docsDir, { recursive: true });
    await fsp.mkdir(this.filesDir, { recursive: true });
    if (fs.existsSync(this.indexFile)) {
      try {
        const raw = await fsp.readFile(this.indexFile, 'utf8');
        const data = JSON.parse(raw);
        this.docs = new Map(Object.entries(data.docs || {}));
        await Promise.all(
          [...this.docs.keys()].map(async (id) => {
            const c = await fsp.readFile(path.join(this.docsDir, `${id}.json`), 'utf8').then(JSON.parse).catch(() => []);
            for (const ch of c) this.chunks.push(ch);
          }),
        );
        this.rebuildStats();
      } catch (e) {
        console.error('تعذّر تحميل الفهرس:', e.message);
      }
    }
    this.ready = true;
    return this;
  }

  rebuildStats() {
    this.df = new Map();
    let total = 0;
    for (const ch of this.chunks) {
      total += ch.len || 0;
      for (const t of new Set(ch.terms || [])) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.totalLen = total;
    this.avgLen = this.chunks.length ? total / this.chunks.length : 1;
    this.chunkMap = new Map(this.chunks.map((c) => [c.id, c]));
  }

  async saveIndex() {
    const payload = { savedAt: nowISO(), docs: Object.fromEntries(this.docs) };
    const tmp = this.indexFile + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(payload));
    await fsp.rename(tmp, this.indexFile);
    this.dirty = 0;
  }

  list() {
    return [...this.docs.values()]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((d) => ({ ...d, chunks: d.chunkCount }));
  }

  stats() {
    const docs = [...this.docs.values()];
    return {
      documents: docs.length,
      chunks: this.chunks.length,
      words: Math.round(this.totalLen),
      characters: docs.reduce((s, d) => s + (d.characters || 0), 0),
      pages: docs.reduce((s, d) => s + (d.pages || 0), 0),
      bytes: docs.reduce((s, d) => s + (d.size || 0), 0),
      terms: this.df.size,
      byType: docs.reduce((m, d) => ((m[d.ext || '؟'] = (m[d.ext || '؟'] || 0) + 1), m), {}),
      indexing: docs.filter((d) => d.status === 'indexing').length,
      failed: docs.filter((d) => d.status === 'error').length,
    };
  }

  /** إضافة مستند لنص مستخرج مسبقاً */
  async add({ id, title, buffer, filename, ext, text, pages, info = {}, kind = 'file' }) {
    const meta = {
      id,
      title,
      filename,
      ext,
      kind,
      size: buffer?.length || 0,
      pages: pages || 1,
      characters: text.length,
      words: tokenize(text).length,
      status: 'ready',
      createdAt: nowISO(),
      chunkCount: 0,
      info,
    };
    const docChunks = [];
    const pieces = chunkText(text, { size: 1200, overlap: 160 });
    pieces.forEach((piece, seq) => {
      const terms = tokenize(piece);
      if (!terms.length) return;
      const ch = {
        id: `${id}#${seq}`,
        docId: id,
        page: Math.max(1, Math.round((seq / Math.max(1, pieces.length)) * (meta.pages || 1))),
        seq,
        text: piece,
        terms,
        len: terms.length,
        title,
      };
      docChunks.push(ch);
    });
    await fsp.writeFile(path.join(this.docsDir, `${id}.json`), JSON.stringify(docChunks));
    if (buffer) await fsp.writeFile(path.join(this.filesDir, `${id}.${ext || 'bin'}`), buffer);
    meta.chunkCount = docChunks.length;
    this.docs.set(id, meta);
    for (const ch of docChunks) {
      this.chunks.push(ch);
      for (const t of new Set(ch.terms)) this.df.set(t, (this.df.get(t) || 0) + 1);
      this.totalLen += ch.len;
    }
    this.chunkMap = this.chunkMap || new Map();
    for (const ch of docChunks) this.chunkMap.set(ch.id, ch);
    this.avgLen = this.chunks.length ? this.totalLen / this.chunks.length : 1;
    this.dirty++;
    // كتابة الفهرس مؤجّلة أثناء الرفع الجماعي (تُستدعى flush بعد الدفعة)
    if (!this.bulk) await this.saveIndex();
    return meta;
  }

  beginBulk() { this.bulk = true; }

  async endBulk() {
    this.bulk = false;
    if (this.dirty) await this.saveIndex();
  }

  async remove(id) {
    const meta = this.docs.get(id);
    if (!meta) return false;
    this.docs.delete(id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    if (this.chunkMap) for (const k of [...this.chunkMap.keys()]) if (k.startsWith(id + '#')) this.chunkMap.delete(k);
    await fsp.rm(path.join(this.docsDir, `${id}.json`), { force: true });
    if (meta.ext) await fsp.rm(path.join(this.filesDir, `${id}.${meta.ext}`), { force: true });
    this.rebuildStats();
    await this.saveIndex();
    return true;
  }

  getDoc(id) {
    return this.docs.get(id);
  }

  docText(id, limit = 200000) {
    const parts = this.chunks.filter((c) => c.docId === id).map((c) => c.text);
    return parts.join('\n\n').slice(0, limit);
  }

  filePath(meta) {
    return path.join(this.filesDir, `${meta.id}.${meta.ext || 'bin'}`);
  }

  /** بحث BM25 على مستوى المقاطع */
  search(query, { limit = 12, docIds = null, minScore = 0 } = {}) {
    const terms = tokenize(query);
    if (!terms.length) return [];
    const N = this.chunks.length || 1;
    const k1 = 1.5;
    const b = 0.75;
    const qTerms = [...new Set(terms)];
    const scored = [];
    for (const ch of this.chunks) {
      if (docIds && !docIds.includes(ch.docId)) continue;
      let score = 0;
      let matched = 0;
      for (const t of qTerms) {
        const tf = ch.terms.filter((x) => x === t).length;
        if (!tf) continue;
        matched++;
        const df = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * ch.len) / this.avgLen)));
      }
      if (!score) continue;
      // مكافأة تغطية الاستعلام + تطابق شبه حرفي
      const coverage = matched / qTerms.length;
      score *= 0.45 + coverage;
      const normQ = normalize(query);
      if (normQ.length > 6 && normalize(ch.text).includes(normQ)) score *= 1.9;
      if (score > minScore) scored.push({ ...ch, score });
    }
    scored.sort((a, b2) => b2.score - a.score);
    return scored.slice(0, limit).map((c) => ({
      docId: c.docId,
      docTitle: this.docs.get(c.docId)?.title || 'مستند',
      chunkId: c.id,
      page: c.page,
      seq: c.seq,
      score: Math.round(c.score * 100) / 100,
      text: c.text,
    }));
  }

  /** جلب سياق موسّع حول مقطع (المقاطع المجاورة) */
  context(chunkId, span = 1, maxChars = 5200) {
    const ch = this.chunkMap?.get(chunkId);
    if (!ch) return '';
    const siblings = this.chunks.filter((c) => c.docId === ch.docId && Math.abs(c.seq - ch.seq) <= span);
    return siblings.map((c) => c.text).join('\n\n').slice(0, maxChars);
  }

  /** أهم المصطلحات في المكتبة أو في مستند */
  topTerms(docId = null, n = 60) {
    const local = new Map();
    const chunks = docId ? this.chunks.filter((c) => c.docId === docId) : this.chunks;
    for (const ch of chunks) for (const t of ch.terms) local.set(t, (local.get(t) || 0) + 1);
    return [...local.entries()]
      .map(([term, tf]) => ({ term, tf, df: docId ? tf : this.df.get(term) || 0 }))
      .sort((a, b) => b.df * Math.log(1 + b.tf) - a.df * Math.log(1 + a.tf))
      .slice(0, n);
  }

  /** اقتراح مواضيع/فصول من العناوين */
  outline(docId, max = 40) {
    const chunks = this.chunks.filter((c) => c.docId === docId).sort((a, b) => a.seq - b.seq);
    const seen = new Set();
    const items = [];
    for (const c of chunks) {
      for (const line of c.text.split('\n')) {
        const l = line.trim();
        if (l.length < 4 || l.length > 110) continue;
        const isHeading =
          /^(الفصل|الباب|الدرس|الوحدة|القسم|المبحث|المقدمة|الخاتمة|الملخص|تمارين|chapter|unit|section|lesson|part|introduction|summary|conclusion)/i.test(
            normalize(l),
          ) || (/^[0-9٠-٩]+[.)\-]?\s+/.test(l) && l.length < 70);
        if (isHeading && !seen.has(l)) {
          seen.add(l);
          items.push({ heading: l.slice(0, 110), page: c.page, seq: c.seq });
          if (items.length >= max) return items;
        }
      }
    }
    return items;
  }

  /** استخراج تعريفات/قواعد محتملة: «X هو/هي/يعني ...» */
  facts(docId, max = 25) {
    const out = [];
    const chunks = this.chunks.filter((c) => c.docId === docId);
    for (const c of chunks) {
      const sentences = c.text.split(/(?<=[.!؟])\s+|\n+/);
      for (const s of sentences) {
        const t = s.trim();
        if (t.length < 25 || t.length > 320) continue;
        if (/( هو | هي | يعني | يُعرف | تعرف بأنها | يقصد ب| تعريف |: )/.test(t) && /[a-zA-Z\u0600-\u06FF]/.test(t)) {
          out.push({ text: t, page: c.page });
          if (out.length >= max) return out;
        }
      }
    }
    return out;
  }
}
