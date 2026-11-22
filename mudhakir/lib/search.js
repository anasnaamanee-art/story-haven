/**
 * بحث ويب مجاني بلا مفاتيح API: ويكيبيديا (عربي/فرنسي/إنجليزي) + DuckDuckGo + arXiv.
 * كل النتائج تُنظَّف إلى نص قابل للقراءة والتلخيص.
 */

const UA = 'Mozilla/5.0 (compatible; Mudhakir/1.0; +https://example.org) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const cache = new Map();
const TTL = 1000 * 60 * 30;

async function get(url, { timeout = 12000, headers = {} } = {}) {
  const key = url;
  const c = cache.get(key);
  if (c && Date.now() - c.t < TTL) return c.data;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'user-agent': UA, 'accept-language': 'ar,fr,en;q=0.8', ...headers },
    });
    const text = await res.text();
    cache.set(key, { t: Date.now(), data: text });
    return text;
  } finally {
    clearTimeout(t);
  }
}

export const stripHtml = (html = '') =>
  String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

/* ── ويكيبيديا ─────────────────────────────────────────────── */
const WIKI_LANGS = ['ar', 'fr', 'en'];

export async function wikipedia(query, lang = 'ar') {
  const langs = [lang, ...WIKI_LANGS.filter((l) => l !== lang)];
  const goals = langs.map((l) => l).slice(0, 2);
  const results = await Promise.allSettled(
    goals.map(async (l) => {
      const searchUrl = `https://${l}.wikipedia.org/w/api.php?action=query&format=json&list=search&srlimit=3&srsearch=${encodeURIComponent(query)}&origin=*`;
      const raw = await get(searchUrl, { headers: { accept: 'application/json' } });
      const json = JSON.parse(raw);
      const first = json?.query?.search?.[0];
      if (!first) return null;
      const sumUrl = `https://${l}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(first.title)}`;
      const sum = JSON.parse(await get(sumUrl, { headers: { accept: 'application/json' } }));
      let extract = sum.extract || first.snippet || '';
      let sections = [];
      try {
        const fullUrl = `https://${l}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&exsectionformat=plain&titles=${encodeURIComponent(first.title)}&origin=*`;
        const full = JSON.parse(await get(fullUrl, { headers: { accept: 'application/json' } }));
        const pages = full?.query?.pages || {};
        const page = Object.values(pages)[0];
        if (page?.extract) {
          const parts = String(page.extract).split(/\n==\s*([^=]+?)\s*==\n/);
          sections = parts.slice(1, 9).map((p, i, arr) => ({ heading: p.trim(), body: (arr[i + 1] || '').trim() })).filter((s) => s.heading && s.body);
          if (!extract) extract = page.extract.slice(0, 1200);
        }
      } catch {}
      return {
        source: 'wikipedia',
        lang: l,
        title: sum.title || first.title,
        url: sum.content_urls?.desktop?.page || `https://${l}.wikipedia.org/wiki/${encodeURIComponent(first.title)}`,
        extract: stripHtml(extract),
        sections,
        thumbnail: sum.thumbnail?.source || null,
      };
    }),
  );
  return results.filter((r) => r.status === 'fulfilled' && r.value).map((r) => r.value);
}

/* ── DuckDuckGo (HTML) ─────────────────────────────────────── */
export async function duckduckgo(query, { limit = 8 } = {}) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=wt-wt`;
  const html = await get(url, { headers: { 'content-type': 'application/x-www-form-urlencoded' } });
  const out = [];
  const blocks = html.split(/<div[^>]+class="[^"]*result[^"]*results_links[^"]*"/i).slice(1);
  for (const b of blocks) {
    if (out.length >= limit) break;
    const href = b.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"/i)?.[1];
    const title = b.match(/<a[^>]+class="result__a"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    const snippet = b.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i)?.[1];
    if (!href || !title) continue;
    let dest = href;
    const m = href.match(/uddg=([^&]+)/);
    if (m) {
      try {
        dest = decodeURIComponent(m[1]);
      } catch {}
    }
    if (dest.startsWith('//')) dest = 'https:' + dest;
    out.push({ source: 'web', title: stripHtml(title), url: dest, snippet: stripHtml(snippet || '') });
  }
  return out;
}

/* ── arXiv (أكاديمي) ───────────────────────────────────────── */
export async function arxiv(query, { limit = 5 } = {}) {
  try {
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}`;
    const xml = await get(url);
    const entries = xml.split(/<entry>/).slice(1);
    return entries.map((e) => ({
      source: 'arxiv',
      title: stripHtml((e.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || ''),
      url: (e.match(/<id>([\s\S]*?)<\/id>/) || [])[1] || '',
      snippet: stripHtml((e.match(/<summary>([\s\S]*?)<\/summary>/) || [])[1] || '').slice(0, 700),
      published: (e.match(/<published>([\s\S]*?)<\/published>/) || [])[1] || '',
    }));
  } catch {
    return [];
  }
}

/* ── قراءة صفحة كاملة ─────────────────────────────────────── */
export async function readPage(url) {
  // ويكيبيديا: نستخدم API لتفادي تعقيد HTML
  const wiki = url.match(/^https?:\/\/([a-z-]+)\.wikipedia\.org\/wiki\/(.+)$/);
  if (wiki) {
    const lang = wiki[1];
    const title = decodeURIComponent(wiki[2]).replace(/_/g, ' ');
    const fullUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&origin=*`;
    const json = JSON.parse(await get(fullUrl, { headers: { accept: 'application/json' } }));
    const page = Object.values(json?.query?.pages || {})[0];
    return { title, url, text: (page?.extract || '').slice(0, 60000) };
  }
  const html = await get(url, { timeout: 15000 });
  const title = stripHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || url);
  const body =
    (html.match(/<article[\s\S]*?<\/article>/i) || html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
  const text = stripHtml(body).slice(0, 60000);
  return { title, url, text };
}

/** البحث الشامل: يجمع كل المصادر ويقرّر الأولوية */
export async function searchAll(query, lang = 'ar') {
  const [wiki, ddg, papers] = await Promise.all([
    wikipedia(query, lang).catch(() => []),
    duckduckgo(query).catch(() => []),
    /[a-z]/i.test(query) ? arxiv(query).catch(() => []) : Promise.resolve([]),
  ]);
  const sources = [
    ...wiki.map((w) => ({
      type: 'encyclopedia',
      title: w.title,
      url: w.url,
      text: w.extract,
      sections: w.sections,
      lang: w.lang,
      thumbnail: w.thumbnail,
    })),
    ...ddg.map((d) => ({ type: 'web', title: d.title, url: d.url, text: d.snippet, lang })),
    ...papers.map((p) => ({ type: 'paper', title: p.title, url: p.url, text: p.snippet, published: p.published, lang: 'en' })),
  ];
  return { query, lang, sources, fetchedAt: new Date().toISOString() };
}
