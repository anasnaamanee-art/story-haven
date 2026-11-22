import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { chunkText, stemTokens, nowISO, summarize, splitSentences } from './lang.js';

/**
 * Bibliothèque de documents avec index BM25 (français).
 * Conçu pour des centaines de fichiers volumineux : index compact, recherche rapide.
 */
export class Library {
  constructor(root) {
    this.root = root;
    this.docsDir = path.join(root, 'docs');
    this.filesDir = path.join(root, 'files');
    this.indexFile = path.join(root, 'index.json');
    this.docs = new Map();
    this.chunks = [];
    this.chunkMap = new Map();
    this.df = new Map();
    this.avgLen = 1;
    this.totalLen = 0;
    this.dirty = 0;
    this.bulk = false;
  }

  async init() {
    await fsp.mkdir(this.docsDir, { recursive: true });
    await fsp.mkdir(this.filesDir, { recursive: true });
    if (fs.existsSync(this.indexFile)) {
      try {
        const data = JSON.parse(await fsp.readFile(this.indexFile, 'utf8'));
        this.docs = new Map(Object.entries(data.docs || {}));
        for (const id of this.docs.keys()) {
          const c = await fsp
            .readFile(path.join(this.docsDir, `${id}.json`), 'utf8')
            .then(JSON.parse)
            .catch(() => []);
          for (const ch of c) this.chunks.push(ch);
        }
        this.rebuild();
      } catch (e) {
        console.error('Index illisible :', e.message);
      }
    }
    return this;
  }

  rebuild() {
    this.df = new Map();
    this.chunkMap = new Map();
    let total = 0;
    for (const ch of this.chunks) {
      total += ch.len || 0;
      this.chunkMap.set(ch.id, ch);
      for (const t of new Set(ch.terms || [])) this.df.set(t, (this.df.get(t) || 0) + 1);
    }
    this.totalLen = total;
    this.avgLen = this.chunks.length ? total / this.chunks.length : 1;
  }

  async saveIndex() {
    const tmp = `${this.indexFile}.tmp`;
    await fsp.writeFile(tmp, JSON.stringify({ savedAt: nowISO(), docs: Object.fromEntries(this.docs) }));
    await fsp.rename(tmp, this.indexFile);
    this.dirty = 0;
  }

  beginBulk() {
    this.bulk = true;
  }

  async endBulk() {
    this.bulk = false;
    if (this.dirty) await this.saveIndex();
  }

  list() {
    return [...this.docs.values()].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  stats() {
    const docs = [...this.docs.values()];
    return {
      documents: docs.length,
      chunks: this.chunks.length,
      words: Math.round(docs.reduce((s, d) => s + (d.words || 0), 0)),
      pages: docs.reduce((s, d) => s + (d.pages || 0), 0),
      bytes: docs.reduce((s, d) => s + (d.size || 0), 0),
      terms: this.df.size,
      byType: docs.reduce((m, d) => ((m[d.ext || '?'] = (m[d.ext || '?'] || 0) + 1), m), {}),
    };
  }

  async add({ id, title, buffer, filename, ext, text, pages = 1, info = {}, kind = 'file' }) {
    const pieces = chunkText(text, { size: 1200, overlap: 170 });
    const docChunks = [];
    pieces.forEach((piece, seq) => {
      const terms = stemTokens(piece);
      if (!terms.length) return;
      docChunks.push({
        id: `${id}#${seq}`,
        docId: id,
        seq,
        page: Math.max(1, Math.round((seq / Math.max(1, pieces.length)) * (pages || 1))),
        text: piece,
        terms,
        len: terms.length,
      });
    });

    const meta = {
      id,
      title,
      filename,
      ext,
      kind,
      size: buffer?.length || 0,
      pages,
      characters: text.length,
      words: text.split(/\s+/).filter(Boolean).length,
      chunkCount: docChunks.length,
      createdAt: nowISO(),
      quality: info.quality ?? 100,
      warning: info.warning || null,
      info,
    };

    await fsp.writeFile(path.join(this.docsDir, `${id}.json`), JSON.stringify(docChunks));
    if (buffer) await fsp.writeFile(path.join(this.filesDir, `${id}.${ext || 'bin'}`), buffer);

    this.docs.set(id, meta);
    for (const ch of docChunks) {
      this.chunks.push(ch);
      this.chunkMap.set(ch.id, ch);
      for (const t of new Set(ch.terms)) this.df.set(t, (this.df.get(t) || 0) + 1);
      this.totalLen += ch.len;
    }
    this.avgLen = this.chunks.length ? this.totalLen / this.chunks.length : 1;
    this.dirty++;
    if (!this.bulk) await this.saveIndex();
    return meta;
  }

  async remove(id) {
    const meta = this.docs.get(id);
    if (!meta) return false;
    this.docs.delete(id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    for (const k of [...this.chunkMap.keys()]) if (k.startsWith(`${id}#`)) this.chunkMap.delete(k);
    await fsp.rm(path.join(this.docsDir, `${id}.json`), { force: true });
    if (meta.ext) await fsp.rm(path.join(this.filesDir, `${id}.${meta.ext}`), { force: true });
    this.rebuild();
    await this.saveIndex();
    return true;
  }

  getDoc(id) {
    return this.docs.get(id);
  }

  docText(id, limit = 400000) {
    return this.chunks
      .filter((c) => c.docId === id)
      .sort((a, b) => a.seq - b.seq)
      .map((c) => c.text)
      .join('\n\n')
      .slice(0, limit);
  }

  filePath(meta) {
    return path.join(this.filesDir, `${meta.id}.${meta.ext || 'bin'}`);
  }

  /** BM25 sur les fragments, requête en français */
  search(query, { limit = 10, docIds = null } = {}) {
    const qTerms = [...new Set(stemTokens(query))];
    if (!qTerms.length) return [];
    const N = this.chunks.length || 1;
    const k1 = 1.5;
    const b = 0.75;
    const scored = [];
    for (const ch of this.chunks) {
      if (docIds && !docIds.includes(ch.docId)) continue;
      let score = 0;
      let matched = 0;
      for (const t of qTerms) {
        let tf = 0;
        for (const x of ch.terms) if (x === t) tf++;
        if (!tf) continue;
        matched++;
        const df = this.df.get(t) || 0;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * ch.len) / this.avgLen)));
      }
      if (!score) continue;
      score *= 0.45 + matched / qTerms.length;
      const nq = qTerms.join(' ');
      if (nq.length > 6 && stemTokens(ch.text).join(' ').includes(nq)) score *= 1.8;
      scored.push({ ...ch, score });
    }
    scored.sort((a, b2) => b2.score - a.score);
    return scored.slice(0, limit).map((c) => ({
      docId: c.docId,
      docTitle: this.docs.get(c.docId)?.title || 'Document',
      chunkId: c.id,
      page: c.page,
      seq: c.seq,
      score: Math.round(c.score * 100) / 100,
      text: c.text,
    }));
  }

  /** Un document entier résumé pour le contexte du chat */
  docContext(id, { maxChars = 8000 } = {}) {
    const meta = this.docs.get(id);
    const text = this.docText(id, 200000);
    return {
      meta,
      outline: this.outline(id),
      facts: this.facts(id),
      summary: summarize(text, 12),
      excerpt: text.slice(0, maxChars),
      text,
    };
  }

  /** Extraits les plus pertinents d'un document pour répondre à une question */
  passages(id, query, n = 8) {
    const q = [...new Set(stemTokens(query))];
    const chunks = this.chunks.filter((c) => c.docId === id);
    if (!q.length) return chunks.slice(0, n).map((c) => c.text);
    const scored = chunks.map((c) => {
      const set = new Set(c.terms);
      let hit = 0;
      for (const t of q) if (set.has(t)) hit++;
      return { c, s: hit / q.length };
    });
    return scored
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, n)
      .flatMap((x) => splitSentences(x.c.text).slice(0, 4));
  }

  outline(id, max = 40) {
    const items = [];
    const seen = new Set();
    for (const c of this.chunks.filter((x) => x.docId === id).sort((a, b) => a.seq - b.seq)) {
      for (const line of c.text.split('\n')) {
        const l = line.trim();
        if (l.length < 4 || l.length > 110) continue;
        const isH =
          /^(chapitre|partie|section|leçon|lecon|unité|unite|introduction|conclusion|résumé|resume|exercices|annexe|titre|i{1,3}v?\.|\d+[.)]\s)/i.test(l) ||
          (/^[0-9IVX]+[.)\-]?\s+/.test(l) && l.length < 70);
        if (isH && !seen.has(l)) {
          seen.add(l);
          items.push({ heading: l.slice(0, 110), page: c.page, seq: c.seq });
          if (items.length >= max) return items;
        }
      }
    }
    return items;
  }

  facts(id, max = 20) {
    const out = [];
    for (const c of this.chunks.filter((x) => x.docId === id)) {
      for (const s of splitSentences(c.text)) {
        if (s.length < 30 || s.length > 320) continue;
        if (/(\sest\s|\ssont\s|désigne|signifie|se définit|consiste|permet|correspond à|:)/i.test(s)) {
          out.push({ text: s, page: c.page });
          if (out.length >= max) return out;
        }
      }
    }
    return out;
  }
}
