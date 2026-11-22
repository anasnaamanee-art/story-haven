import crypto from 'node:crypto';

export const uid = (n = 10) => crypto.randomBytes(16).toString('hex').slice(0, n);

const AR_DIACRITICS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/** تطبيع عربي/لاتيني للبحث: يوحّد الألف والياء والهاء ويحذف التشكيل */
export function normalize(str = '') {
  return String(str)
    .replace(AR_DIACRITICS, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const STOP = new Set(
  (
    // عربية
    'في من على عن الي إلى مع هذا هذه هؤلاء ذلك تلك التي الذي اللذين اللتين و او أو ثم قد كان كانت يكون تكون هل ما ماذا كيف لماذا متى اين أين كل بعض غير بين هو هي هم هن انا أنا انت أنت انتم لكن بل حتى اذا إذا اذ إذ كما لدى منذ خلال حول دون سوى بينما أي اي أية ايه فيه فيها منه منها له لها به بها وكان وغير وكذلك ايضا أيضا هناك هنالك مما عما الا إلا وان وإن فهو فهي كذلك عليه عليها اليه إليها نحن انت وهو وهي وقد ولا ولم فلن لكي كي سوف سوي أيها يا هكذا لذلك لذا بينهما بينهم عند عندما حين حيث قبل بعد فوق تحت امام أمام خلف وراء تجاه ضد نحو عبر ضمن داخل خارج حول حوالي تقريبا تماما جدا فقط ايضا كذلك ايضاً'
      // فرنسية
      + ' le la les de des du un une et ou est sont dans pour par sur avec ce cette ces quel quelle quels quelles comment pourquoi quand qui que quoi dont ne pas plus moins tres très ainsi alors donc car mais comme aussi son sa ses leur leurs nous vous ils elles elle il on y en au aux se si tout tous toute toutes meme même entre chez depuis pendant apres après avant sous vers sans autre autres cela ceci celui celle'
      // إنجليزية
      + ' the a an of to and or in on for with is are was were be been being it this that these those as at by from not no do does did how what why when where which who whom whose can could should would may might will shall have has had there their them they we you he she his her its about into over than then also such very more most other some any all each few own same so only just because while during before after between both'
  ).split(/\s+/),
);

export function tokenize(str = '') {
  return normalize(str)
    .split(' ')
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(ات|ون|ين|ان|ها|هم|كم|نا|ة|ه)$/u, '') : t));
}

export function keywords(str = '') {
  const counts = new Map();
  for (const t of tokenize(str)) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
}

export function humanSize(bytes = 0) {
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

/** تقطيع نص طويل إلى مقاطع متوازنة تحترم حدود الجمل */
export function chunkText(text, { size = 1400, overlap = 180 } = {}) {
  const clean = String(text).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{4,}/g, '\n\n\n');
  const out = [];
  let i = 0;
  while (i < clean.length) {
    let end = Math.min(clean.length, i + size);
    if (end < clean.length) {
      const slice = clean.slice(i, end);
      const cut = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf('؟ '),
        slice.lastIndexOf('! '),
        slice.lastIndexOf('\n'),
      );
      if (cut > size * 0.5) end = i + cut + 1;
    }
    const piece = clean.slice(i, end).trim();
    if (piece) out.push(piece);
    if (end >= clean.length) break;
    i = Math.max(end - overlap, i + 1);
  }
  return out;
}

export function excerpt(text, q = '', max = 320) {
  const src = String(text || '').replace(/\s+/g, ' ').trim();
  if (!src) return '';
  const kws = tokenize(q);
  let at = -1;
  for (const k of kws) {
    const idx = normalize(src).indexOf(k);
    if (idx >= 0) {
      at = idx;
      break;
    }
  }
  if (at < 0) return src.slice(0, max) + (src.length > max ? '…' : '');
  const start = Math.max(0, at - Math.floor(max * 0.35));
  return (start ? '…' : '') + src.slice(start, start + max) + (start + max < src.length ? '…' : '');
}

export const nowISO = () => new Date().toISOString();

/** تقدير جودة النص المستخرج: 0 (تالف) → 1 (سليم) */
export function textQuality(text = '') {
  const t = String(text);
  if (!t.trim()) return 0;
  const letters = (t.match(/\p{L}/gu) || []).length;
  const spaces = (t.match(/\s/g) || []).length;
  const weird = (t.match(/[¦§¬®±µ¶¸¹º»¼½¾¿�]/g) || []).length;
  const latin = (t.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const vowels = (t.match(/[aeiouyàâäéèêëîïôöùûüÿœæAEIOUY]/g) || []).length;
  const arabic = (t.match(/[\u0600-\u06FF]/g) || []).length;
  let score = 1;
  if (letters / t.length < 0.4) score -= 0.25;
  if (spaces / t.length < 0.06) score -= 0.2;
  if (weird / t.length > 0.02) score -= 0.35;
  if (latin > 60 && arabic < latin * 0.2) {
    if (vowels / latin < 0.2) score -= 0.6; // لاتيني بلا حروف علة = ترميز تالف
  }
  // متوسط طول الكلمة: نص تالف يعطي "كلمات" طويلة جداً
  const words = t.split(/\s+/).filter(Boolean);
  const avg = words.length ? letters / words.length : 0;
  if (avg > 12) score -= 0.3;
  return Math.max(0, Math.min(1, score));
}

export function isGarbageText(text = '') {
  return textQuality(text) < 0.45;
}
