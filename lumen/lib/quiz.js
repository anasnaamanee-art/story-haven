import { KB } from './kb.js';
import { norm } from './lang.js';

/** Petites machines à questions déterministes, à partir des fiches de référence. */
const MAKERS = {
  pythagore: [
    { q: "Énoncez le théorème de Pythagore.", a: "Dans un triangle rectangle, le carré de l'hypoténuse est égal à la somme des carrés des deux autres côtés : a² + b² = c²." },
    { q: "Un triangle rectangle a des côtés de 6 cm et 8 cm. Combien mesure l'hypoténuse ?", a: "10 cm — car 6² + 8² = 36 + 64 = 100 et √100 = 10." },
    { q: "Le théorème de Pythagore s'applique-t-il à tous les triangles ?", a: "Non, uniquement aux triangles rectangles. Pour les autres, on utilise la loi des cosinus (Al-Kashi)." },
    { q: "Quel est le triplet pythagoricien le plus connu ?", a: "(3 ; 4 ; 5), car 3² + 4² = 5². On le retrouve multiplié : (6 ; 8 ; 10), etc." },
  ],
  pourcentage: [
    { q: "Combien font 15 % de 240 ?", a: "36 — car 240 × 15 / 100 = 36." },
    { q: "Un prix de 80 € baisse de 25 %. Quel est le nouveau prix ?", a: "60 € — car 80 × (1 − 0,25) = 80 × 0,75 = 60." },
    { q: "Une hausse de 20 % suivie d'une baisse de 20 % ramène-t-elle au prix initial ?", a: "Non : × 1,2 × 0,8 = 0,96, soit une baisse globale de 4 %." },
    { q: "Comment calcule-t-on un taux de variation ?", a: "(valeur finale − valeur initiale) / valeur initiale × 100." },
  ],
  premiers: [
    { q: "Qu'est-ce qu'un nombre premier ?", a: "Un entier supérieur à 1 qui n'a que deux diviseurs : 1 et lui-même." },
    { q: "2 est-il premier ? Et 1 ?", a: "2 est premier (et c'est le seul pair). 1 n'est pas premier : il n'a qu'un diviseur." },
    { q: "Décomposez 84 en facteurs premiers.", a: "84 = 2² × 3 × 7." },
    { q: "Jusqu'où faut-il tester les diviseurs pour savoir si n est premier ?", a: "Jusqu'à √n : au-delà, les diviseurs se répètent en paires." },
  ],
  derivee: [
    { q: "Que représente la dérivée d'une fonction en un point ?", a: "La pente de la tangente, c'est-à-dire la vitesse de variation de la fonction en ce point." },
    { q: "Quelle est la dérivée de f(x) = x³ ?", a: "f'(x) = 3x²." },
    { q: "Que signifie f'(x) > 0 sur un intervalle ?", a: "Que f est strictement croissante sur cet intervalle." },
    { q: "Comment trouver un extremum avec la dérivée ?", a: "On cherche f'(x) = 0 puis on regarde le signe de f' : s'il change, c'est un extremum (max si + → −, min si − → +)." },
  ],
  photosynthese: [
    { q: "Écrivez l'équation bilan de la photosynthèse.", a: "6 CO₂ + 6 H₂O + lumière → C₆H₁₂O₆ + 6 O₂." },
    { q: "Où se déroule la photosynthèse dans la cellule ?", a: "Dans les chloroplastes : les réactions photochimiques dans les thylakoïdes, le cycle de Calvin dans le stroma." },
    { q: "D'où vient l'oxygène rejeté par les plantes ?", a: "De la molécule d'eau (photolyse de l'eau), pas du CO₂." },
    { q: "Quelle est la différence entre photosynthèse et respiration ?", a: "La photosynthèse fabrique de la matière organique en consommant du CO₂ ; la respiration la dégrade en produisant de l'ATP et du CO₂." },
  ],
  respiration: [
    { q: "Quel organite réalise principalement la respiration cellulaire ?", a: "La mitochondrie." },
    { q: "Donnez l'équation bilan de la respiration cellulaire.", a: "C₆H₁₂O₆ + 6 O₂ → 6 CO₂ + 6 H₂O + ATP." },
    { q: "Pourquoi la respiration est-elle plus rentable que la fermentation ?", a: "Elle produit beaucoup plus d'ATP par molécule de glucose (environ 30 contre 2)." },
  ],
  adn: [
    { q: "Quelles sont les quatre bases de l'ADN et leurs appariements ?", a: "A, T, G, C — A s'apparie avec T, G avec C." },
    { q: "Combien de chromosomes possède une cellule humaine ?", a: "46 chromosomes, soit 23 paires." },
    { q: "Quelle est la différence entre transcription et traduction ?", a: "La transcription copie l'ADN en ARN messager (noyau) ; la traduction convertit l'ARN en protéine (ribosomes)." },
  ],
  revolution: [
    { q: "Citez trois causes de la Révolution française.", a: "La crise financière de l'État, les inégalités entre les trois ordres, et la diffusion des idées des Lumières (avec les mauvaises récoltes de 1788)." },
    { q: "Que s'est-il passé le 14 juillet 1789 ?", a: "La prise de la Bastille, symbole de l'arbitraire royal ; c'est la date retenue comme fête nationale." },
    { q: "Qu'est-ce que la Terreur ?", a: "Une période (1793-1794) de répression politique menée par le Comité de salut public, marquée par des exécutions massives." },
    { q: "Quels régimes se succèdent entre 1789 et 1799 ?", a: "Monarchie constitutionnelle (1791), Convention (1792-1795), Directoire (1795-1799), puis le Consulat après le coup d'État de Bonaparte." },
  ],
  pyth: [],
  gravite: [
    { q: "Écrivez la formule de la gravitation universelle.", a: "F = G × m₁ × m₂ / d², avec G ≈ 6,67 × 10⁻¹¹ SI." },
    { q: "Comment la force varie-t-elle avec la distance ?", a: "Elle diminue comme le carré de la distance : doubler la distance divise la force par 4." },
    { q: "Différence entre masse et poids ?", a: "La masse (kg) est une quantité de matière, constante ; le poids (N) est la force d'attraction, il dépend du lieu (P = m × g)." },
  ],
  energie: [
    { q: "Citez quatre énergies renouvelables.", a: "Solaire, éolien, hydraulique, biomasse (et géothermie)." },
    { q: "Quelle est l'unité de l'énergie ? De la puissance ?", a: "L'énergie se mesure en joules (J) — ou kWh ; la puissance en watts (W)." },
    { q: "Relation entre énergie et puissance ?", a: "E = P × t. Une puissance de 1 kW pendant 2 h consomme 2 kWh." },
  ],
  climat: [
    { q: "Qu'est-ce que l'effet de serre ?", a: "Un phénomène naturel où certains gaz atmosphériques retiennent une partie du rayonnement infrarouge émis par la Terre, réchauffant la surface." },
    { q: "Citez trois causes humaines du réchauffement climatique.", a: "La combustion des énergies fossiles, la déforestation et l'agriculture intensive (élevage, engrais)." },
    { q: "Quelle est la différence entre météo et climat ?", a: "La météo décrit l'état atmosphérique à court terme ; le climat est une moyenne statistique sur environ 30 ans." },
  ],
  ia: [
    { q: "Quelle est la différence entre IA et machine learning ?", a: "L'IA est le domaine général ; le machine learning est une de ses approches, où le modèle apprend à partir de données." },
    { q: "Citez les trois grands types d'apprentissage automatique.", a: "Supervisé, non supervisé et par renforcement." },
    { q: "Pourquoi une IA générative peut-elle « halluciner » ?", a: "Parce qu'elle prédit des enchaînements probables de mots sans vérifier leur vérité factuelle : la cohérence n'est pas la vérité." },
  ],
  subjonctif: [
    { q: "Après « bien que », quel mode emploie-t-on ?", a: "Le subjonctif : « bien qu'il soit tard »." },
    { q: "Après « après que », quel mode faut-il employer ?", a: "L'indicatif : « après que tu es venu » (et non « sois venu »)." },
    { q: "Conjuguez « avoir » au subjonctif présent, 1ʳᵉ et 3ᵉ personne du singulier.", a: "Que j'aie, qu'il/elle ait." },
  ],
  dissertation: [
    { q: "Quelles sont les quatre parties de l'introduction d'une dissertation ?", a: "Accroche, définition des termes, problématique, annonce du plan." },
    { q: "Qu'est-ce qu'un plan dialectique ?", a: "Un plan en trois temps : thèse, antithèse, synthèse (dépassement)." },
    { q: "Que contient un paragraphe argumenté ?", a: "Une idée, un argument, un exemple, puis l'analyse de cet exemple." },
  ],
  sommeil: [
    { q: "Pourquoi le rappel actif est-il plus efficace que la relecture ?", a: "Il oblige le cerveau à récupérer l'information, ce qui renforce la trace mnésique (effet de test)." },
    { q: "Qu'est-ce que la répétition espacée ?", a: "Réviser à intervalles croissants (J+1, J+3, J+7, J+21) pour lutter contre l'oubli." },
    { q: "Quel rôle joue le sommeil dans l'apprentissage ?", a: "Il consolide les souvenirs : l'information acquise est stabilisée, notamment pendant le sommeil profond et paradoxal." },
  ],
  pythagore2: [],
};

function findFiche(q) {
  const n = norm(q);
  const map = {
    pythagore: /pythagore/,
    pourcentage: /pourcentage|remise|taux de variation|augmentation/,
    premiers: /nombre[s]? premier/,
    derivee: /dérivée|derivee|dérivation/,
    photosynthese: /photosynth/,
    respiration: /respiration cellulaire|mitochondri/,
    adn: /\badn\b|génétique|genetique|gène|chromosome/,
    revolution: /révolution française|revolution francaise|1789|bastille/,
    gravite: /gravit|pesanteur|poids et masse/,
    energie: /énergie|energie renouvelable|joule|puissance/,
    climat: /climat|effet de serre|réchauffement|rechauffement/,
    ia: /intelligence artificielle|\bia\b|machine learning|apprentissage automatique/,
    subjonctif: /subjonctif|conjugaison/,
    dissertation: /dissertation|commentaire composé|introduction|problématique/,
    sommeil: /sommeil|mémoris|memoris|apprendre|réviser|reviser/,
  };
  for (const [k, rx] of Object.entries(map)) if (rx.test(n)) return k;
  return null;
}

/** Construit un quiz corrigé, mélangé, de n questions */
export function buildQuiz(topic, n = 5) {
  const key = findFiche(topic);
  let pool = key && MAKERS[key]?.length ? MAKERS[key] : null;

  if (!pool) {
    // pas de fiche dédiée : on fabrique à partir des fiches les plus proches
    const kb = KB.filter((e) => norm(topic).split(/\s+/).some((w) => w.length > 4 && norm(e.title + ' ' + e.keys.join(' ')).includes(w)));
    if (kb.length) {
      const e = kb[0];
      pool = [
        { q: `Définissez « ${e.title.replace(/^(La |Le |Les |L')/, '')} » en une phrase.`, a: e.definition },
        { q: `Citez deux points essentiels sur ${e.title.toLowerCase()}.`, a: e.points.slice(0, 2).join(' ') },
        { q: `Donnez un exemple concret lié à ${e.title.toLowerCase()}.`, a: e.example },
        { q: `Quel piège faut-il éviter à propos de ${e.title.toLowerCase()} ?`, a: e.pitfalls[0] },
        { q: `En quoi ${e.title.toLowerCase()} est-il utile à connaître ?`, a: 'Pour relier les faits entre eux et raisonner, plutôt que d\'apprendre par cœur.' },
      ];
    }
  }
  if (!pool) {
    pool = [
      { q: `Définissez « ${topic} » en une phrase.`, a: 'Une définition précise, qui délimite le terme et évite les confusions.' },
      { q: `Citez un exemple concret de ${topic}.`, a: 'Un exemple daté et situé, analysé (pas seulement mentionné).' },
      { q: `Quelle est une limite ou un cas particulier de ${topic} ?`, a: 'Une exception ou une critique : c\'est souvent ce qui distingue une très bonne réponse.' },
      { q: `Reliez ${topic} à une autre notion de votre cours.`, a: 'Un lien logique (cause, conséquence, opposition) formulé explicitement.' },
      { q: `Expliquez ${topic} à quelqu'un qui ne connaît rien au sujet.`, a: 'Une explication simple, sans jargon, avec une analogie et un exemple.' },
    ];
  }

  const picked = pool.slice(0, Math.max(1, Math.min(n, pool.length)));
  return picked.map((item, i) => ({
    n: i + 1,
    question: item.q,
    answer: item.a,
    topic: key ? topic : topic,
  }));
}

/* ══════════════════════════════════════════════════════════════
   QUIZ GÉNÉRÉ À PARTIR DES DOCUMENTS DE L'UTILISATEUR
   ══════════════════════════════════════════════════════════════ */

const STOPWORDS = new Set(
  'le la les de des du un une et ou en dans pour par sur avec sans sous ce cet cette ces est sont etait ete avoir fait faire plus moins tout tous toute toutes meme aussi mais donc car ne pas que qui quoi dont il elle ils elles nous vous je tu on se son sa ses leur leurs au aux y a etre tres bien peu'.split(' '),
);

function cleanSentence(s) {
  return s
    .replace(/\[page [^\]]*\]/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s•\-–—]+/, '')
    .trim();
}

/** Choisit les meilleures phrases « riches » d'un texte */
function pickSentences(text, n, prefer = null) {
  const raw = String(text);
  const latinCount = (raw.match(/[A-Za-zÀ-ÿ]/g) || []).length;
  const arabicCount = (raw.match(/[\u0600-\u06FF]/g) || []).length;
  const preferLatin = prefer ? prefer === 'latin' : latinCount >= arabicCount;
  const sents = raw
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý0-9«"])|\n+/)
    .map(cleanSentence)
    .filter((s) => s.length > 45 && s.length < 280)
    .filter((s) => (preferLatin ? /[A-Za-zÀ-ÿ]/.test(s) && !/[\u0600-\u06FF]/.test(s) : /[\u0600-\u06FF]/.test(s)));
  // score : densité de mots rares + longueur idéale
  const freq = new Map();
  for (const s of sents) for (const w of s.toLowerCase().split(/\s+/)) freq.set(w, (freq.get(w) || 0) + 1);
  return sents
    .map((s) => {
      const words = s.toLowerCase().split(/\s+/).filter((w) => w.length > 4 && !STOPWORDS.has(w));
      const rare = words.filter((w) => (freq.get(w) || 0) <= 2).length;
      return { s, score: rare * 1.5 + Math.min(words.length, 12) + (s.length > 60 && s.length < 200 ? 3 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .map((x) => x.s)
    .slice(0, n);
}

function keyTermsOf(sentence) {
  const found = [];
  for (const m of sentence.matchAll(/\b[A-ZÀ-Ý][a-zà-ÿ]{3,}\b|[\u0600-\u06FF]{4,}/g)) {
    const w = m[0];
    if (!STOPWORDS.has(w.toLowerCase())) found.push(w);
  }
  // mots « longs » significatifs
  for (const m of sentence.matchAll(/\b[a-zà-ÿ]{8,}\b/g)) {
    if (!STOPWORDS.has(m[0]) && !found.includes(m[0])) found.push(m[0]);
  }
  return found.sort((a, b) => b.length - a.length);
}

export function buildQuizFromDocs({ library, docIds, n = 6, topicText = '', prefer = null }) {
  const ids = docIds?.length ? docIds : library.list().map((d) => d.id);
  const corpus = ids.map((id) => library.docText(id, 200000)).join('\n\n');
  if (!corpus.trim()) return null;

  let picked = pickSentences(corpus, Math.min(20, n * 3), prefer);
  if (picked.length < 2 && prefer) picked = pickSentences(corpus, Math.min(20, n * 3), null);
  if (picked.length < 2) return null;

  const questions = [];
  for (const s of picked) {
    if (questions.length >= n) break;
    const terms = keyTermsOf(s);
    // éviter de masquer le tout premier mot (souvent un titre ou un connecteur)
    const firstWord = s.split(/\s+/)[0];
    const target = terms.find((t) => t !== firstWord) || terms[0];
    const kind = questions.length % 3;

    if (kind === 0 && target && s.includes(target)) {
      // Question à trou
      questions.push({
        n: questions.length + 1,
        type: 'trou',
        question: `Complétez : « ${s.replace(target, '____________')} »`,
        answer: String(target).replace(/^[وف](?=[\u0600-\u06FF]{3,})/, ''),
        why: `La phrase du document est : « ${s} »`,
      });
    } else if (kind === 1) {
      questions.push({
        n: questions.length + 1,
        type: 'vrai-faux',
        question: `Vrai ou faux ? « ${s} »`,
        answer: 'Vrai — la phrase est reprise du document.',
        why: 'Il faut vérifier dans le document : une phrase exacte est vraie, une phrase transformée serait fausse.',
      });
    } else {
      questions.push({
        n: questions.length + 1,
        type: 'ouverte',
        question: `Expliquez avec vos mots : ${target ? `« ${target} »` : s.slice(0, 90)}`,
        answer: `Réponse attendue (d'après le document) : ${s}`,
        why: 'Reformulez sans recopier : si vous devez garder la phrase entière, la notion n\'est pas encore comprise.',
      });
    }
  }
  return { questions, topicText };
}
