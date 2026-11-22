import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const TEXT_EXT = new Set(['txt', 'md', 'markdown', 'csv', 'tsv', 'log', 'json', 'xml', 'html', 'htm', 'yaml', 'yml', 'rtf', 'srt', 'vtt', 'tex', 'bib', 'srt']);
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff']);

export const ext = (name = '') => (name.split('.').pop() || '').toLowerCase();

export const SUPPORTED = {
  'PDF': ['pdf'],
  'Word': ['docx', 'doc'],
  'PowerPoint': ['pptx', 'ppt'],
  'Excel/CSV': ['xlsx', 'xls', 'csv', 'tsv'],
  'نص': ['txt', 'md', 'markdown', 'log', 'json', 'xml', 'html', 'htm', 'tex', 'bib', 'srt', 'vtt', 'rtf'],
  'EPUB': ['epub'],
  'صور (OCR)': ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tif', 'tiff'],
};

/* ── PDF ─────────────────────────────────────────────────────── */
async function pdf(buffer) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
    // تقليل الذاكرة للملفات الضخمة
    maxImageSize: 0,
  }).promise;

  const pages = [];
  const total = doc.numPages;
  const step = total > 1200 ? 1 : 1; // نمرّ على كل الصفحات
  let emptyPages = 0;

  for (let p = 1; p <= total; p += step) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((i) => i.str && i.str.trim());
    let text = '';
    if (items.length) {
      // تجميع في أسطر حقيقية باستخدام الإحداثيات (يدعم RTL/LTR المختلط)
      const lines = [];
      let current = { y: items[0].transform[5], parts: [] };
      for (const it of items) {
        const y = it.transform[5];
        const x = it.transform[4];
        if (Math.abs(y - current.y) > 3) {
          lines.push(current);
          current = { y, parts: [] };
        }
        current.parts.push({ x, str: it.str, w: it.width || 0 });
      }
      lines.push(current);
      // سطر واحد: هل الأجزاء مرتبة من اليمين لليسار؟
      for (const line of lines) {
        const parts = line.parts;
        const hasArabic = parts.some((p2) => /[\u0600-\u06FF]/.test(p2.str));
        if (hasArabic) {
          const firstArabicX = parts.find((p2) => /[\u0600-\u06FF]/.test(p2.str))?.x ?? 0;
          const firstLatinX = parts.find((p2) => /[A-Za-z]/.test(p2.str))?.x ?? 0;
          // إذا كان النص اللاتيني متداخلاً مع العربي في نفس السطر، نخرجه في سطر منفصل
          const latinInLine = parts.filter((p2) => /[A-Za-z]{3,}/.test(p2.str));
          const arabicInLine = parts.filter((p2) => /[\u0600-\u06FF]{2,}/.test(p2.str));
          if (latinInLine.length && arabicInLine.length && Math.abs(firstArabicX - firstLatinX) < 40) {
            text += arabicInLine.map((p2) => p2.str).join(' ') + '\n';
            text += latinInLine.map((p2) => p2.str).join(' ') + '\n';
            continue;
          }
        }
        text += parts.map((p2) => p2.str).join(hasArabic ? ' ' : '') + '\n';
      }
    }
    if (!text.trim()) emptyPages++;
    pages.push({ page: p, text });
    page.cleanup();
    if (p % 200 === 0) await new Promise((r) => setImmediate(r)); // نفسح للمجمع
  }
  const meta = await doc.getMetadata().catch(() => ({}));
  const info = { ...(meta?.info || {}), pageCount: total, emptyPages };
  await doc.destroy();
  return { pages, info };
}

/* ── DOCX ────────────────────────────────────────────────────── */
async function docx(buffer, filename) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const results = [];

  const xmlDoc = zip.file('word/document.xml');
  if (xmlDoc) {
    const xml = await xmlDoc.async('string');
    results.push(xmlToText(xml, /\<\/w:p\>/g, /<w:tab\/>/g, /<w:br\/>/g));
  }
  // الهوامش السفلية والتعليقات
  for (const extra of ['word/footnotes.xml', 'word/endnotes.xml', 'word/comments.xml']) {
    const f = zip.file(extra);
    if (!f) continue;
    const t = xmlToText(await f.async('string'), /<\/w:p>/g, /<w:tab\/>/g, /<w:br\/>/g);
    if (t.trim()) results.push(`\n[هوامش]\n${t}`);
  }
  if (!results.length) throw new Error('ملف Word غير صالح');
  return { pages: [{ page: 1, text: results.join('\n') }] };
}

function xmlToText(xml, paraBreak, tabRe, brRe) {
  return xml
    .replace(/<w:instrText[^>]*>[\s\S]*?<\/w:instrText>/g, '')
    .replace(brRe, '\n')
    .replace(tabRe, '\t')
    .replace(paraBreak, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

async function docLegacy(buffer) {
  // .doc القديم: محاولة استخراج نصي متسامح
  const raw = buffer.toString('latin1');
  const txt = raw.replace(/[^\x20-\x7E\u0600-\u06FF\n\r]/g, ' ').replace(/\s{3,}/g, '\n');
  if (txt.replace(/\s/g, '').length < 40) throw new Error('صيغة .doc القديمة غير مدعومة — يُرجى تحويلها إلى .docx');
  return { pages: [{ page: 1, text: txt }], info: { warning: 'استخراج تقريبي من .doc' } };
}

/* ── PPTX / PPT ─────────────────────────────────────────────── */
async function pptx(buffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const slides = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));
  const pages = [];
  for (const name of slides) {
    const xml = await zip.file(name).async('string');
    const text = xml
      .replace(/<a:br\/>/g, '\n')
      .replace(/<\/a:p>/g, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    pages.push({ page: pages.length + 1, text, source: name.match(/slide\d+/)[0] });
  }
  if (!pages.length) throw new Error('لم يتم العثور على شرائح');
  return { pages };
}

/* ── Excel / CSV ────────────────────────────────────────────── */
async function excel(buffer, filename) {
  const XLSX = require('xlsx');
  const wb = XLSX.read(buffer, { type: 'buffer', cellText: true, cellDates: true, dense: true });
  const pages = [];
  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, blankrows: false, raw: false });
    const text = rows
      .map((r) => r.map((c) => (c === undefined || c === null ? '' : String(c))).join(' | '))
      .join('\n')
      .slice(0, 900_000);
    pages.push({ page: pages.length + 1, source: sheetName, text });
  }
  return { pages };
}

/* ── EPUB ───────────────────────────────────────────────────── */
async function epub(buffer) {
  const JSZip = require('jszip');
  const zip = await JSZip.loadAsync(buffer);
  const files = Object.keys(zip.files)
    .filter((n) => /\.(x?html?|xml)$/i.test(n) && !/toc\.|nav\./i.test(n))
    .sort();
  const pages = [];
  for (const n of files) {
    const html = await zip.file(n).async('string');
    const text = htmlToText(html);
    if (text.trim().length > 20) pages.push({ page: pages.length + 1, source: n, text });
  }
  return { pages };
}

function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── CSV ────────────────────────────────────────────────────── */
function delimiter(text) {
  const head = text.slice(0, 8000);
  const cands = [',', ';', '\t', '|'];
  let best = ',';
  let bestCount = -1;
  for (const d of cands) {
    const c = head.split('\n').slice(0, 40).reduce((s, l) => s + l.split(d).length, 0);
    if (c > bestCount) {
      bestCount = c;
      best = d;
    }
  }
  return best;
}

function csv(buffer) {
  let text = buffer.toString('utf8');
  if (text.includes('\uFFFD')) {
    try {
      text = new TextDecoder('windows-1256').decode(buffer);
    } catch {}
  }
  const d = delimiter(text);
  const lines = text.split(/\r?\n/).filter(Boolean);
  return { pages: [{ page: 1, text: lines.join(d === '|' ? '\n' : ' | ').slice(0, 900_000) }], info: { rows: lines.length } };
}

/* ── الصور: OCR اختياري ────────────────────────────────────── */
async function image(buffer, filename) {
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker(['ara', 'eng'], 1, { cachePath: path.join(process.cwd(), '.ocr-cache'), logger: () => {} });
    const { data } = await worker.recognize(buffer);
    await worker.terminate();
    if (!data.text?.trim()) throw new Error('لم يُعثر على نص في الصورة');
    return { pages: [{ page: 1, text: data.text }], info: { ocr: true, confidence: data.confidence } };
  } catch (e) {
    throw new Error(
      'الصور تحتاج محرّك OCR. شغّل: npm i tesseract.js — أو حوّل الصورة إلى PDF نصي. (' + e.message + ')',
    );
  }
}

/* ── المُوزِّع ───────────────────────────────────────────────── */
export async function extract({ buffer, filename }) {
  const e = ext(filename);
  try {
    if (e === 'pdf') return await pdf(buffer);
    if (e === 'docx' || e === 'doc') return e === 'doc' ? await docLegacy(buffer) : await docx(buffer, filename);
    if (e === 'pptx' || e === 'ppt') return await pptx(buffer);
    if (e === 'xlsx' || e === 'xls') return await excel(buffer, filename);
    if (e === 'csv' || e === 'tsv') return csv(buffer);
    if (e === 'epub') return await epub(buffer);
    if (TEXT_EXT.has(e)) {
      let text = buffer.toString('utf8');
      if (text.includes('\uFFFD')) {
        try {
          text = new TextDecoder('windows-1256').decode(buffer);
        } catch {}
      }
      if (/^(html?|xml)$/.test(e)) text = htmlToText(text);
      return { pages: [{ page: 1, text }] };
    }
    if (IMAGE_EXT.has(e)) return await image(buffer, filename);
    throw new Error(`صيغة غير مدعومة: .${e}`);
  } catch (err) {
    throw new Error(`تعذّر استخراج النص من «${filename}»: ${err.message}`);
  }
}
