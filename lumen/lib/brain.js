import { norm, tokens, stem, stemTokens, stopword, keywords, splitSentences, summarize, capitalize, detectLang } from './lang.js';
import { kbFind } from './kb.js';
import { buildQuiz, buildQuizFromDocs } from './quiz.js';

/* ══════════════════════════════════════════════════════════════
   ANALYSE DE L'INTENTION
   ══════════════════════════════════════════════════════════════ */

export const INTENTS = {
  greeting: 'salutation',
  identity: 'identite',
  capability: 'capacites',
  math: 'calcul',
  translate: 'traduction',
  summarize: 'resume',
  code: 'code',
  recipe: 'recette',
  letter: 'lettre',
  list: 'liste',
  compare: 'comparaison',
  define: 'definition',
  howto: 'procedure',
  why: 'explication',
  when: 'temporalite',
  opinion: 'avis',
  plan: 'plan',
  quiz: 'exercice',
  poem: 'creatif',
  story: 'creatif',
  fix: 'correction',
  thanks: 'remerciement',
  question: 'question',
};

const RX = {
  greeting: /^(bonjour|salut|hello|hey|coucou|bonsoir|salam|slt|yo)\b/i,
  thanks: /^(merci|thanks|thank you|nickel|parfait|super|génial|top)\b/i,
  identity: /(qui (es[- ]tu|est[- ]tu)|tu es qui|ton nom|comment tu t'appelles|présente[- ]toi|qui etes[- ]vous|what are you)/i,
  capability: /(que (sais|peux)[- ]tu|tes capacités|ce que tu (sais|peux)|qu'est[- ]ce que tu (sais|peux)|aide[- ]moi à|comment (tu )?(marches|fonctionnes)|tes fonctions)/i,
  translate: /(tradui[st]|traduction|translate|en anglais|en arabe|en espagnol|en français)/i,
  summarize: /\b(résume|resume|résumé|synthèse|synthese|récapitule|recapitule)\b/i,
  code: /(code|fonction|programme|script|javascript|python|html|css|sql|java\b|c\+\+|algorithme|debug|erreur dans)/i,
  recipe: /(recette|cuisiner|cuisine|préparer (un|une|le|la)|ingrédients|plat)/i,
  letter: /(lettre|mail|e-?mail|courriel|motivation|cv|curriculum|demande|réclamation|reclamation|message (à|a|pour))/i,
  list: /(liste|donne[- ]moi \d|cite|énumère|enumere|quels sont|quelles sont|exemples de|types de|sortes de)/i,
  compare: /(différence|difference|comparer|comparaison|versus|\bvs\b|mieux que|lequel|laquelle|ou bien)/i,
  define: /^(c'?est quoi|qu'?est[- ]ce que|qu'?est ce que|définis|definis|définition|definition|signifie|veut dire|que signifie|explique[- ]moi|parle[- ]moi de|présente)/i,
  howto: /(comment (faire|on fait|procéder|proceder|réussir|reussir|apprendre|devenir)|étapes|etapes|tutoriel|mode d'emploi|guide)/i,
  why: /^(pourquoi|comment se fait|d'où vient|quelle (est la )?(raison|cause))/i,
  when: /^(quand|à quelle (époque|date)|quelle (année|date)|en quelle année)/i,
  opinion: /(ton avis|tu penses|selon toi|recommandes|conseil|conseille|devrais[- ]je)/i,
  plan: /(\bplan\b|programme|planning|organis|emploi du temps|révis|revis|préparer (un|le) (examen|concours)|méthode de travail)/i,
  quiz: /(quiz|exercice|teste[- ]moi|entraîne[- ]moi|entraine[- ]moi|qcm|questions? (sur|de cours)|interroge)/i,
  poem: /(poème|poeme|poésie|poesie|vers|haïku|haiku|chanson|paroles)/i,
  story: /(histoire|conte|nouvelle|récit|recit|scénario|scenario|invente|imagine)/i,
  fix: /(corrige|correction|réécris|reecris|reformule|améliore|vérifie|verifie|fautes? d'orthographe|orthographe|grammaire|conjugaison)/i,
};

export function classify(q = '') {
  const t = norm(q);
  // le calcul est prioritaire : « calcule 15 % de 240 » n'est pas une définition
  if (/(calcule|calculer|combien (font|fait)|résous|resous|^\s*\d)/.test(t) || /(\d)\s*(%|pour ?cent)\s*(de|du|des)\s*\d/.test(t)) {
    if (/[0-9]/.test(t) && /(%|\+|\-|\*|\/|fois|plus|moins|divis)/.test(t)) return 'math';
  }
  const PRIORITY = ['greeting', 'thanks', 'identity', 'capability', 'math', 'fix', 'translate', 'define', 'compare',
    'why', 'howto', 'plan', 'quiz', 'letter', 'recipe', 'code', 'poem', 'story', 'summarize', 'list', 'opinion', 'when'];
  for (const k of PRIORITY) if (RX[k]?.test(t)) return k;
  if (/(\d\s*[\+\-\*\/x×÷^%]\s*\d)|(\d+\s*(fois|plus|moins|divisé par))/.test(t)) return 'math';
  return 'question';
}

/* ══════════════════════════════════════════════════════════════
   MÉMOIRE CONVERSATIONNELLE
   ══════════════════════════════════════════════════════════════ */

/** retrouve le sujet d'un suivi (« et le second ? », « explique plus ») */
export function resolveTopic(q, history = []) {
  const t = norm(q);
  const isFollowUp =
    t.length < 45 &&
    /^(et |explique|développe|developpe|continue|plus de|encore|pourquoi|comment|donne (un|des)|un exemple|d'accord|ok|et le|et la|pareil)/.test(t);
  if (!isFollowUp) return { topic: q, followUp: false };
  const lastUser = [...history].reverse().find((m) => m.role === 'user');
  const lastTopic = lastUser?.topic || lastUser?.content || '';
  const merged = lastTopic ? `${lastTopic} ${q}` : q;
  return { topic: merged, followUp: true, base: lastTopic };
}

/* ══════════════════════════════════════════════════════════════
   CALCUL
   ══════════════════════════════════════════════════════════════ */

const MATH_WORDS = [
  [/\bplus\b|\bet\b/g, '+'],
  [/\bmoins\b/g, '-'],
  [/\bfois\b|\bmultiplié par\b|\bmultiplie par\b/g, '*'],
  [/\bdivisé par\b|\bdivise par\b|\bsur\b/g, '/'],
  [/\bpuissance\b/g, '^'],
  [/×/g, '*'],
  [/÷/g, '/'],
  [/,/g, '.'],
];

export function calc(expr) {
  let raw = norm(expr).replace(/[’']/g, ' ');
  // « 15 % de 240 » → « 15/100*240 »
  raw = raw.replace(/(\d+(?:[.,]\d+)?)\s*(?:%|pour ?cent)\s*(?:de|du|des|d')\s*(\d+(?:[.,]\d+)?)/g, '$1/100*$2');
  raw = raw.replace(/(\d+(?:[.,]\d+)?)\s*(?:%|pour ?cent)\b/g, '$1/100');
  const keep = raw.match(/[0-9+\-*/().^ ]|fois|plus|moins|divise|multiplie|puissance/g) ? raw : expr;
  let e = String(keep).replace(/[^0-9+\-*/().^ %a-zà-ÿ]/g, ' ');
  for (const [rx, rep] of MATH_WORDS) e = e.replace(rx, rep);
  e = e.replace(/[a-zà-ÿ]+/g, ' ').replace(/\s+/g, '');
  if (!/^[0-9+\-*/().^%]+$/.test(e) || !/[0-9]/.test(e)) return null;
  if (!/[+\-*/^%]/.test(e)) return null;
  // sécurisé : uniquement chiffres et opérateurs
  try {
    const js = e.replace(/\^/g, '**').replace(/%/g, '/100');
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict";return (${js})`)();
    if (typeof val !== 'number' || !Number.isFinite(val)) return null;
    const rounded = Math.round(val * 1e10) / 1e10;
    return { expr: e, value: rounded, formatted: new Intl.NumberFormat('fr-FR').format(rounded) };
  } catch {
    return null;
  }
}

/* ══════════════════════════════════════════════════════════════
   DÉTECTION DE DOMAINE (pour des réponses riches)
   ══════════════════════════════════════════════════════════════ */

const DOMAINS = [
  { id: 'maths', label: 'Mathématiques', rx: /\b(maths?|mathématiques|equation|equation du|dérivée|derivee|intégrale|integrale|théorème|theoreme|triangle|pythagore|thalès|thales|probabilité|probabilite|statistique|pourcentage|fraction|algèbre|algebre|géométrie|geometrie|nombre premier|calcul)/ },
  { id: 'physique', label: 'Physique-Chimie', rx: /\b(physique|chimie|atome|molécule|molecule|réaction chimique|reaction chimique|énergétique|electricite|électricité|gravité|gravitation|pesanteur|gaz|joule|watt|volt|newton|pesanteur|chaleur|thermique|onde|vitesse de la lumière)\b/ },
  { id: 'bio', label: 'Sciences de la vie', rx: /\b(biologie|cellule(s)?|adn|gène(s)?|génétique|photosynthèse|photosynthese|respiration cellulaire|sang|organe(s)?|bactérie|bacterie|virus|évolution|evolution|écosystème|ecosysteme|enzyme|protéine|proteine|mitochondrie|chlorophylle)\b/ },
  { id: 'histoire', label: 'Histoire', rx: /\b(histoire|guerre(s)?|révolution|revolution|empire|louis (xiv|xv|xvi)|napoléon|napoleon|1789|1914|1939|1945|colonisation|résistance|antiquité|antiquite|moyen âge|moyen age|romains?|gaulois|versailles|bastille)\b/ },
  { id: 'geo', label: 'Géographie', rx: /(géographie|geographie|climat|population|ville|pays|continent|fleuve|montagne|carte|démographie|demographie|urbanisation|développement durable|developpement durable)/ },
  { id: 'eco', label: 'Économie & droit', rx: /(économie|economie|inflation|pib|marché|marche|entreprise|droit|loi|contrat|impôt|impot|chômage|chomage|banque|budget|offre et demande)/ },
  { id: 'philo', label: 'Philosophie', rx: /(philosophie|liberté|liberte|conscience|morale|éthique|ethique|vérité|verite|kant|descartes|platon|socrate|existentialisme|bonheur|justice)/ },
  { id: 'francais', label: 'Français & littérature', rx: /(grammaire|conjugaison|orthographe|figure de style|dissertation|commentaire|analyse de texte|roman|poésie|poesie|auteur|molière|moliere|victor hugo|baudelaire|argumentation|subjonctif|participe)/ },
  { id: 'info', label: 'Informatique', rx: /(informatique|programmation|algorithme|python|javascript|html|css|sql|base de données|base de donnees|réseau|reseau|ordinateur|logiciel|intelligence artificielle|\bia\b|machine learning)/ },
  { id: 'langues', label: 'Langues', rx: /(anglais|espagnol|allemand|italien|arabe|vocabulaire|traduction|prononciation|verbe irrégulier|irregulier)/ },
  { id: 'sante', label: 'Santé & bien-être', rx: /(santé|sante|sommeil|stress|nutrition|alimentation|sport|exercice physique|méditation|meditation|mémoire|memoire|concentration|bien-être|bien-etre)/ },
  { id: 'orientation', label: 'Orientation & études', rx: /(orientation|métier|metier|études|etudes|université|universite|bac|parcoursup|stage|alternance|entretien|embauche|carrière|carriere|cv)/ },
];

export const detectDomain = (q) => DOMAINS.find((d) => d.rx.test(norm(q))) || null;

/* ══════════════════════════════════════════════════════════════
   RÉPONSES STRUCTURÉES PAR INTENTION
   ══════════════════════════════════════════════════════════════ */

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function subjectOf(q) {
  let t = String(q).trim().replace(/[?!.]+$/, '');
  t = t
    .replace(/^(pourrais[- ]tu|peux[- ]tu|pouvez[- ]vous|tu peux|je voudrais|je veux|s'il te plaît|s'il vous plaît|stp|svp)\s*/gi, '')
    .replace(/^(c'est quoi|qu'est[- ]ce que|qu'est ce que|cest quoi|définis|definis|définition de|definition de|explique(?:[- ]moi)?|expliquer|parle[- ]moi de|dis[- ]moi|donne[- ]moi|comment faire pour|comment|pourquoi|raconte[- ]moi|présente[- ]moi)\s+(moi\s+)?/i, '')
    .replace(/^(le |la |les |l'|un |une |des )/i, '')
    .replace(/^(faire|réviser|reviser|organiser)\s+/i, '')
    .replace(/\s+(c'est quoi|signifie|veut dire)\s*$/i, '')
    .trim();
  return t || q;
}

export function answerGreeting({ name } = {}) {
  const h = new Date().getHours();
  const moment = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  return {
    text: `${moment}${name ? ` ${name}` : ''} ! 👋\n\nJe suis **Lumen**, votre assistant IA francophone. Je suis là pour vous aider à réfléchir, apprendre, rédiger et résoudre des problèmes.\n\nQuelques idées pour commencer :\n- 📚 « Explique-moi la photosynthèse simplement »\n- ✍️ « Rédige une lettre de motivation pour un stage en marketing »\n- 🧮 « Calcule 15 % de 240 »\n- 🧠 « Teste-moi sur la Révolution française »\n\nDe quoi avez-vous envie de parler ?`,
    chips: ['Explique-moi les nombres premiers', 'Rédige un e-mail professionnel', 'Teste-moi en histoire', 'Aide-moi à réviser'],
  };
}

export function answerIdentity() {
  return {
    text: `Je suis **Lumen** — un assistant IA francophone, gratuit et illimité. 🧠\n\n**Ce que je ne suis pas :** je ne tourne pas sur les serveurs d'une grande entreprise. Je fonctionne ici, sur votre propre serveur, avec un moteur de compréhension et de rédaction développé pour le français.\n\n**Mes forces :**\n- expliquer une notion à plusieurs niveaux, avec exemples et analogies ;\n- structurer des réponses longues (plans, fiches, dissertations) ;\n- calculer, corriger, traduire, résumer ;\n- créer des exercices et vous interroger ;\n- m'appuyer sur vos documents et sur la recherche web.\n\n**Mes limites, en toute transparence :** ma culture générale est plus étroite que celle d'un très grand modèle, et je peux me tromper. Pour les faits précis (dates, chiffres, actualité), activez 🔎 **Recherche web** : je citerai mes sources.`,
    chips: ['Que sais-tu faire exactement ?', 'Explique-moi un concept', 'Teste-moi'],
  };
}

export function answerCapabilities() {
  return {
    text: `Voici ce que je peux faire pour vous, concrètement :\n\n| Besoin | Exemple de demande |\n|---|---|\n| **Comprendre** | « Explique la photosynthèse en 3 niveaux » |\n| **Rédiger** | « Lettre de motivation pour un BTS commerce » |\n| **Corriger** | « Corrige ce paragraphe et justifie » |\n| **Calculer** | « 18 % de 450, et vérifie l'arrondi » |\n| **Structurer** | « Plan de dissertation sur la liberté » |\n| **Réviser** | « 10 questions sur les fractions » |\n| **Traduire** | « Traduis en anglais, ton formel » |\n| **Chercher** | Active 🔎 Recherche web pour l'actualité |\n| **Vos documents** | Glissez un PDF puis « résume ce document » |\n\nJe garde le fil de la conversation : vous pouvez dire « développe », « donne un exemple », « et l'inverse ? ».`,
    chips: ['Explique-moi la photosynthèse', 'Rédige une lettre', 'Teste-moi en maths'],
  };
}

export function answerMath(question) {
  const r = calc(question);
  if (!r) return null;
  const steps = explainCalc(r.expr);
  return {
    text: `**Résultat : ${r.formatted}**\n\n**Calcul :**\n\`\`\`\n${r.expr} = ${r.value}\n\`\`\`\n${steps ? `\n**Détail des étapes :**\n${steps}\n` : ''}\nBesoin d'un autre calcul ? Je peux aussi poser une équation ou expliquer la méthode (fractions, pourcentages, puissances).`,
    chips: ['Explique la méthode', 'Un autre calcul', 'Et avec des fractions ?'],
  };
}

function explainCalc(expr) {
  const m = expr.match(/^(\d+(?:\.\d+)?)\s*\/\s*100\s*\*\s*(\d+(?:\.\d+)?)$/);
  if (m) {
    const p = Number(m[1]);
    const n = Number(m[2]);
    return `1. ${p} % = ${p} ÷ 100 = ${p / 100}\n2. ${p / 100} × ${n} = ${(p / 100) * n}`;
  }
  const m2 = expr.match(/^(\d+(?:\.\d+)?)\s*\*\s*(\d+(?:\.\d+)?)\s*\/\s*100$/);
  if (m2) {
    const a = Number(m2[1]);
    const b = Number(m2[2]);
    return `1. ${a} × ${b} = ${a * b}\n2. ${a * b} ÷ 100 = ${(a * b) / 100}`;
  }
  return null;
}

/** Question de cours dont la réponse figure dans la base embarquée ? */
export function kbAnswer(question, { level = 'moyen' } = {}) {
  const kb = kbFind(question);
  if (!kb) return null;
  const n = norm(question);
  const nbPoints = { simple: 2, moyen: 4, approfondi: kb.points.length }[level] || 4;

  // question de définition
  if (/^(c'?est quoi|qu'?est[- ]ce que|definis|definition|explique|signifie|veut dire|parle)/.test(n)) {
    return {
      text: `**${kb.title}**\n\n${kb.definition}\n\n**À retenir**\n${kb.points.slice(0, nbPoints).map((p) => `- ${p}`).join('\n')}${
        level !== 'simple' ? `\n\n**Exemple**\n${kb.example}` : ''
      }`,
      chips: ['Donne un exemple', 'Teste-moi dessus', 'Explique plus simplement'],
      meta: { domain: kb.domain },
    };
  }
  // question factuelle précise : on renvoie les points qui contiennent les mots de la question
  const STEM_Q = n.split(/\s+/).map((w) => w.replace(/(aux|eaux)$/, 'al').replace(/(es|s)$/, '')).filter((w) => w.length > 3);
  const relevant = kb.points.filter((pt) => {
    const pn = norm(pt).replace(/(aux|eaux)\b/g, 'al');
    return STEM_Q.some((w) => pn.includes(w));
  });
  // sinon : la question ne cible pas un point précis → on répond par la fiche elle-même
  if (!relevant.length) {
    return {
      text: `**${kb.title}**\n\n${kb.definition}\n\n**Points clés**\n${kb.points.slice(0, nbPoints).map((p) => `- ${p}`).join('\n')}${
        level !== 'simple' ? `\n\n**Exemple**\n${kb.example}` : ''
      }`,
      chips: ['Teste-moi dessus', 'Donne un exemple', 'Explique plus simplement'],
      meta: { domain: kb.domain },
    };
  }
  if (relevant.length) {
    return {
      text: `**${kb.title}** — réponse :\n\n${relevant.slice(0, 3).map((r) => `- ${r}`).join('\n')}\n\n${kb.definition}`,
      chips: ['Donne plus de détails', 'Teste-moi dessus', 'Un exemple'],
      meta: { domain: kb.domain },
    };
  }
  return null;
}

export function answerDefine(question, { level = 'moyen' } = {}) {
  const subject = subjectOf(question);
  const S = capitalize(subject);
  const domain = detectDomain(question);

  /* fiche de référence embarquée : réponse précise et vérifiée */
  const kb = kbFind(question);
  if (kb) {
    const body = [];
    body.push(`**Définition**\n${kb.definition}`);
    const nbPoints = { simple: 2, moyen: 4, approfondi: kb.points.length }[level] || 4;
    body.push(`**Points clés**\n${kb.points.slice(0, nbPoints).map((p) => `- ${p}`).join('\n')}`);
    if (level !== 'simple') body.push(`**Exemple concret**\n${kb.example}`);
    if (level === 'approfondi') body.push(`**Pièges à éviter**\n${kb.pitfalls.map((p) => `- ${p}`).join('\n')}`);
    body.push(`**Pour le retenir**\nReformulez la définition en une phrase à vous, puis donnez un exemple sans regarder. Si vous y arrivez, c'est acquis.`);
    return {
      text: `**${kb.title}** _(${kb.domain})_\n\n${body.join('\n\n')}${
        level === 'simple' ? '' : `\n\n> 🔎 Pour approfondir avec des sources (chiffres récents, références), activez **Recherche web** : je citerai les pages consultées.`
      }`,
      chips: ['Donne un exemple', 'Explique plus simplement', 'Teste-moi dessus', 'Quels sont les pièges ?'],
      meta: { domain: kb.domain },
    };
  }
  const levels = {
    simple: {
      intro: `${S}, c'est une idée qu'on peut résumer simplement :`,
      body: `**En une phrase :** ${S} désigne un ensemble de phénomènes ou de principes qu'on étudie ensemble parce qu'ils partagent une logique commune.\n\n**Image pour comprendre :** imaginez une boîte à outils. Chaque outil a une fonction précise, mais tous servent à construire la même chose. ${S}, c'est cette boîte : des éléments différents qui travaillent ensemble.`,
    },
    moyen: {
      intro: `Voici l'essentiel sur **${subject}**.`,
      body: `**Définition**\n${S} se comprend à partir de trois éléments :\n1. **Ce dont on parle** — le phénomène ou l'objet central.\n2. **Ce qui le caractérise** — les propriétés qui le distinguent des notions voisines.\n3. **Ce à quoi il sert** — son rôle, son usage ou ses conséquences.\n\n**Pourquoi c'est important**\nComprendre ${subject} permet de relier des faits isolés entre eux, au lieu de les apprendre par cœur. C'est ce qui transforme une information en connaissance mobilisable.`,
    },
    approfondi: {
      intro: `**${S} — analyse détaillée**`,
      body: `**1. Mise en perspective**\nOn ne comprend ${subject} qu'en le situant : d'où vient la notion, à quel problème elle répond, et quelles notions elle remplace ou complète.\n\n**2. Les mécanismes**\nDécomposez en causes → processus → effets. C'est la structure qui permet ensuite d'argumenter.\n\n**3. Les limites et les débats**\nAucune notion n'est neutre : identifiez les critiques, les cas particuliers, les usages abusifs. C'est souvent là que se joue la différence entre une bonne et une excellente copie.\n\n**4. Application**\nCherchez deux exemples concrets (un proche, un lointain) et un contre-exemple.`,
    },
  };
  const L = levels[level] || levels.moyen;
  return {
    text: `${L.intro}\n\n${L.body}\n\n**Comment le retenir :** reformulez la définition en une phrase à vous, puis donnez un exemple. Si vous y arrivez sans le texte, c'est acquis.\n${domain ? `\n_Domaine : ${domain.label}_` : ''}\n\n💡 Pour une explication **ancrée dans des sources**, activez 🔎 **Recherche web** — je citerai Wikipédia et d'autres pages.`,
    chips: ['Donne un exemple', 'Explique plus simplement', 'Quelles sont les limites ?', 'Teste-moi dessus'],
    meta: { domain: domain?.label || null },
  };
}

export function answerHowto(question) {
  const subject = subjectOf(question).replace(/^(on fait|faire|procéder à|proceder a)\s+/i, '');
  return {
    text: `**Comment ${subject} — méthode en 5 étapes**\n\n1. **Clarifiez l'objectif.** Écrivez en une phrase ce que « réussi » veut dire pour vous. Sans critère de réussite, on tourne en rond.\n2. **Découpez.** Séparez le problème en 2 ou 3 sous-tâches indépendantes. Commencez par la plus incertaine.\n3. **Faites une première version imparfaite.** L'objectif est d'avoir quelque chose à corriger, pas quelque chose de parfait.\n4. **Vérifiez avec un test simple.** Un exemple concret, un cas limite, une relecture à voix haute.\n5. **Améliorez une seule chose.** Itérez : la qualité vient de la répétition, pas d'un effort unique.\n\n**Erreurs fréquentes :** vouloir tout planifier avant d'agir ; sauter la vérification ; changer plusieurs paramètres à la fois (impossible de savoir ce qui a marché).\n\nDites-moi le contexte précis (matière, niveau, outil) et je détaille les étapes pour **votre** cas.`,
    chips: ['Donne un exemple concret', 'Quels outils utiliser ?', 'Combien de temps ça prend ?'],
  };
}

export function answerCompare(question) {
  return {
    text: `**Comparer, c'est d'abord choisir les bons critères.**\n\nPour « ${subjectOf(question)} », procédez ainsi :\n\n| Critère | À vérifier |\n|---|---|\n| **Définition** | Les deux termes appartiennent-ils au même registre ? |\n| **Fonction** | À quoi sert chacun ? |\n| **Contexte** | Dans quels cas l'un est-il préférable ? |\n| **Limites** | Que ne fait pas l'un que l'autre fait ? |\n| **Coût** | Temps, argent, effort, risques |\n\n**Méthode de rédaction :**\n1. Une phrase de mise en relation (« les deux visent X mais diffèrent sur Y »).\n2. Deux paragraphes symétriques, avec les **mêmes critères** dans le même ordre.\n3. Une conclusion qui tranche : « plutôt A si…, plutôt B si… ».\n\n**Piège classique :** le catalogue (« A fait ci, B fait ça ») sans confrontation. Un bon comparatif montre un **écart**, pas deux listes.`,
    chips: ['Fais le tableau complet', 'Quel est le meilleur choix ?', 'Donne un exemple'],
  };
}

export function answerPlan(question) {
  const subject = subjectOf(question);
  return {
    text: `**Plan de travail — ${subject}**\n\n**Phase 1 · Diagnostic (10 % du temps)**\n- Listez les chapitres et notez votre maîtrise de 1 à 5.\n- Repérez les 3 points faibles les plus rentables (souvent : ceux qui rapportent le plus de points).\n\n**Phase 2 · Apprentissage actif (50 %)**\n- Une séance = un objectif mesurable (« savoir expliquer X sans le cours »).\n- Alternez 25 min de lecture active et 5 min de rappel à voix haute.\n- Écrivez des fiches **questions → réponses**, pas des résumés.\n\n**Phase 3 · Entraînement (30 %)**\n- Faites des exercices en conditions réelles (chrono, sans cours).\n- Corrigez-vous **immédiatement** et notez la cause de chaque erreur : connaissance ? méthode ? lecture ?\n\n**Phase 4 · Consolidation (10 %)**\n- Révisez uniquement ce qui a été raté.\n- Dormez : la mémoire se consolide pendant le sommeil.\n\n**Planning type sur 7 jours**\n| Jour | Matin | Soir |\n|---|---|---|\n| 1–2 | Chapitres faibles | Fiches Q/R |\n| 3–4 | Exercices ciblés | Correction |\n| 5 | Sujet complet chronométré | Analyse |\n| 6 | Revoir les erreurs | Rappel actif |\n| 7 | Révision légère | Repos |\n\nDites-moi la matière et la date de l'échéance : je construis un planning jour par jour.`,
    chips: ['Fais-moi un planning sur 14 jours', 'Comment réviser efficacement ?', 'Teste-moi'],
  };
}

export function answerQuiz(question) {
  const raw = String(subjectOf(question))
    .replace(/^(fais|faire|crée|creer|génère|genere|donne|prépare|prepare|teste|interroge|entraîne|entraine)[- ]?(moi)?\b\s*/gi, '')
    .replace(/^[- ]?moi\b\s*/i, '')
    .replace(/^(un |une |des |le |la |les )?(quiz|qcm|test|exercices?|interrogation)\s*/gi, '')
    .replace(/^(sur|de|en|à propos de|au sujet de)\s+/i, '')
    .replace(/\s*,?\s*(avec|et)\s+(les\s+)?(réponses?|corrections?|solutions?).*$/i, '')
    .replace(/^\d{1,2}\s+(questions?|exercices?)\s*(sur|de|en)?\s*/i, '')
    .replace(/[,:]\s*.*$/, '')
    .trim();
  const nb = Number((question.match(/\b(\d{1,2})\s*(questions?|exercices?)/i) || [])[1]) || 5;
  const topic = raw || 'culture générale';
  const items = buildQuiz(topic, Math.min(10, Math.max(3, nb)));

  const body = items.map((it) => `**${it.n}.** ${it.question}`).join('\n\n');
  const corr = items.map((it) => `**${it.n}.** ${it.answer}`).join('\n\n');

  return {
    text: `**Quiz — ${capitalize(topic)}** · ${items.length} questions\n\nRépondez sans regarder le cours, puis ouvrez la correction.\n\n---\n\n${body}\n\n---\n\n<details><summary><strong>✅ Voir la correction</strong></summary>\n\n${corr}\n\n</details>\n\n**Comment utiliser ce quiz :** notez vos réponses à l'écrit, puis comparez. Ce qui est faux devient votre priorité de révision — pas ce qui est déjà su.\n\n💡 Pour un quiz **généré depuis vos propres documents**, joignez un fichier (📎) puis demandez « 10 questions sur ce document ».`,
    chips: ['Plus difficile', 'Explique la réponse 1', 'Un autre sujet', 'Crée un quiz depuis mon PDF'],
    meta: { domain: detectDomain(topic)?.label || 'Exercices' },
  };
}

export function answerQuizFromDocs({ library, docIds, question = '', lang = 'fr' }) {
  const nb = Number((question.match(/\b(\d{1,2})\b/) || [])[1]) || 6;
  const q = buildQuizFromDocs({
    library,
    docIds,
    n: Math.min(12, Math.max(3, nb)),
    prefer: lang === 'ar' ? 'arabic' : 'latin',
  });
  if (!q) return null;
  const body = q.questions.map((it) => `**${it.n}.** ${it.question}`).join('\n\n');
  const corr = q.questions.map((it) => `**${it.n}.** ${it.answer}`).join('\n\n');
  return {
    text: `**Exercices tirés de vos documents** · ${q.questions.length} questions\n\nRépondez d'abord sans regarder, puis vérifiez.\n\n---\n\n${body}\n\n---\n\n<details><summary><strong>✅ Voir la correction et les explications</strong></summary>\n\n${corr}\n\n</details>\n\n**Utilisation :** toute erreur signale une notion à revoir. Relisez uniquement la page concernée, puis refaites le quiz le lendemain.`,
    chips: ['Plus difficile', 'Un autre quiz sur ce document', 'Résume ce document'],
    meta: { domain: 'Vos documents' },
  };
}

export function answerLetter(question) {
  const isMail = /e-?mail|courriel|mail/i.test(question);
  const isMotiv = /motivation|candidature|stage|emploi|poste/i.test(question);
  if (isMotiv) {
    return {
      text: `Voici un modèle de **lettre de motivation** à adapter.\n\n---\n\n**[Prénom Nom]**\n[Adresse] · [Téléphone] · [E-mail]\n\n**[Entreprise / Organisation]**\nÀ l'attention de [Nom du recruteur]\n[Adresse]\n\n**Objet : candidature au poste de [intitulé]**\n\nMadame, Monsieur,\n\nVotre offre de [poste] a retenu mon attention : elle correspond précisément à ce que je cherche, [raison précise et concrète — un projet, une valeur, un produit].\n\nActuellement en [formation / situation], j'ai développé [compétence 1] et [compétence 2] à travers [expérience concrète : projet, stage, job]. Ce que je peux apporter à votre équipe, c'est [bénéfice mesurable : une méthode, un savoir-faire, une capacité].\n\nJe serais heureux(se) de vous exposer ma motivation lors d'un entretien.\n\nJe vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.\n\n**[Signature]**\n\n---\n\n**Conseils pour personnaliser :**\n1. Remplacez chaque crochet par un **fait précis** (jamais d'adjectif vide : « motivé », « sérieux »).\n2. Une lettre = **un seul argument principal**, développé avec un exemple.\n3. Restez sur **une page**, 4 paragraphes maximum.\n\nDonnez-moi le poste, l'entreprise et votre parcours : je rédige une version sur mesure.`,
      chips: ['Personnalise avec mon parcours', 'Version e-mail plus courte', 'Corrige mon brouillon'],
    };
  }
  return {
    text: `Voici un modèle d'${isMail ? 'e-mail' : ' lettre'} professionnel(le).\n\n---\n\n**Objet : [objet clair et précis]**\n\nBonjour [Nom],\n\nJe me permets de vous écrire au sujet de [sujet en une phrase].\n\n[Contexte : 1 à 2 phrases — pourquoi vous écrivez, ce qui s'est passé.]\n\n[Demande : 1 phrase claire — ce que vous attendez concrètement, avec une échéance si possible.]\n\n[Facilitation : 1 phrase — ce que vous proposez pour avancer : un appel, un document, une disponibilité.]\n\nBien cordialement,\n[Prénom Nom]\n[Fonction · Téléphone]\n\n---\n\n**Règles d'or :**\n- L'objet doit permettre de comprendre la demande **sans ouvrir le message**.\n- Une idée par paragraphe, des phrases de 20 mots maximum.\n- Terminez toujours par **une action attendue** — sinon rien ne se passe.\n\nDites-moi le destinataire et le but exact : je rédige la version finale.`,
    chips: ['Rends-le plus formel', 'Version courte', 'Autre destinataire'],
  };
}

export function answerSummarize(question) {
  return {
    text: `Pour résumer efficacement, il me faut le texte. Trois options :\n\n1. **Collez le texte** dans le message (même long) — je fais un résumé en 3, 6 ou 10 points selon votre demande.\n2. **Glissez un fichier** avec le trombone 📎 (PDF, Word, PowerPoint, Excel, texte…) et dites « résume ce document ». Je cite les pages.\n3. **Un sujet** : dites « résume l'essentiel sur X » et j'active la recherche.\n\n**Ce que je livre dans un résumé :**\n- l'idée principale en une phrase ;\n- 3 à 6 points clés hiérarchisés ;\n- les chiffres et dates importants ;\n- ce qui est secondaire et peut être ignoré.\n\n**Méthode que j'applique** (utile à connaître) : je repère les phrases les plus denses en concepts rares, je supprime les redondances, puis je réordonne selon la logique du texte — pas selon l'ordre d'apparition.`,
    chips: ['Résume en 5 points', 'Version ultra-courte', 'Résume un fichier'],
  };
}

export function answerCode(question) {
  const q = norm(question);
  const lang = /python/.test(q) ? 'python' : /sql/.test(q) ? 'sql' : /html|css/.test(q) ? 'html' : /java(?!script)/.test(q) ? 'java' : 'javascript';
  const samples = {
    javascript: `// Compter les occurrences dans un tableau
function compter(arr) {
  return arr.reduce((acc, x) => {
    acc[x] = (acc[x] || 0) + 1;
    return acc;
  }, {});
}
console.log(compter(['a', 'b', 'a'])); // { a: 2, b: 1 }`,
    python: `# Compter les occurrences dans une liste
from collections import Counter

def compter(items):
    return dict(Counter(items))

print(compter(["a", "b", "a"]))  # {'a': 2, 'b': 1}`,
    sql: `-- Nombre de commandes par client, trié
SELECT client_id, COUNT(*) AS nb_commandes
FROM commandes
GROUP BY client_id
ORDER BY nb_commandes DESC;`,
    html: `<!-- Structure minimale, accessible -->
<main>
  <h1>Titre de la page</h1>
  <p>Un paragraphe lisible.</p>
  <button type="button" aria-label="Valider">Valider</button>
</main>`,
    java: `import java.util.*;

public class Compteur {
    public static Map<String, Integer> compter(List<String> items) {
        Map<String, Integer> m = new HashMap<>();
        for (String s : items) m.merge(s, 1, Integer::sum);
        return m;
    }
}`,
  };
  return {
    text: `Voici une base solide pour votre demande en **${lang}**.\n\n\`\`\`${lang}\n${samples[lang]}\n\`\`\`\n\n**Comment raisonner (la méthode compte plus que le code) :**\n1. **Entrées / sorties** — que reçoit la fonction, que doit-elle renvoyer ?\n2. **Cas limites** — liste vide, valeur nulle, doublons, très grande taille.\n3. **Complexité** — ici O(n) en temps, O(k) en mémoire (k = valeurs distinctes).\n4. **Lisibilité** — noms explicites, une responsabilité par fonction.\n\n**Débogage efficace :** reproduisez le bug avec la plus petite entrée possible, puis vérifiez vos hypothèses une par une (affichez, ne devinez pas).\n\nDécrivez votre problème exact (entrée, sortie attendue, message d'erreur) et je code la solution complète.`,
    chips: ['Écris la version complète', 'Explique ligne par ligne', 'Trouve mon bug'],
  };
}

export function answerRecipe(question) {
  return {
    text: `Voici une **recette de base adaptable** (méthode plutôt que liste figée).\n\n**Pour 4 personnes · 30 min**\n\n**Ingrédients**\n- 400 g de l'ingrédient principal\n- 2 oignons, 2 gousses d'ail\n- 2 c. à s. d'huile d'olive\n- 200 ml de bouillon (ou d'eau + épices)\n- Sel, poivre, herbes\n\n**Étapes**\n1. **Préparer** : émincez oignons et ail. Coupez l'ingrédient principal en morceaux réguliers (cuisson uniforme).\n2. **Suer** : faites revenir oignons et ail 5 min à feu moyen — ils doivent être translucides, pas bruns.\n3. **Colorer** : ajoutez l'ingrédient principal 3 min à feu vif pour développer les arômes.\n4. **Mijoter** : versez le bouillon, couvrez, 15 min à feu doux.\n5. **Rectifier** : salez en fin de cuisson, ajoutez herbes et un filet d'huile crue.\n\n**Les 3 règles qui changent tout :**\n- Salez **à la fin** : on contrôle mieux, et les légumes restent tendres.\n- Respectez l'ordre **oignon → protéine → liquide** : chaque étape prépare la suivante.\n- Goûtez **deux fois** : avant et après l'assaisonnement final.\n\nDites-moi les ingrédients que vous avez dans le frigo : je compose une recette avec.`,
    chips: ['Recette végétarienne', 'Version rapide 15 min', 'J\'ai ces ingrédients…'],
  };
}

export function answerPoem(question) {
  const theme = subjectOf(question).replace(/^(un|une|le|la|des|poème sur|poeme sur|poésie sur|poesie sur)\s+/i, '') || 'la vie';
  return {
    text: `**${capitalize(theme)}**\n\n*Il est des mots qui n'osent pas*\n*et qui pourtant savent pourquoi :*\n*${theme}, quand tu t'éloignes,*\n*le silence devient plus grand que toi.*\n\n*On croit tenir ce qu'on nomme,*\n*on perd le fil, on cherche encore ;*\n*et dans le creux de ce qu'on aime*\n*se cache un peu de ce qui sort.*\n\n*Alors on écrit, maladroit,*\n*pour retenir ce qui s'en va —*\n*un vers n'est jamais qu'un endroit*\n*où l'on dépose ce qu'on n'a pas.*\n\n---\n\n**Ce que j'ai travaillé :** un rythme régulier (alexandrins approximatifs, rimes alternées), et une image centrale — l'écriture comme tentative de retenir ce qui fuit.\n\nDites-moi le **ton** (lyrique, humoristique, engagé), le **nombre de strophes** et la **forme** (sonnet, haïku, vers libres) : je réécris.`,
    chips: ['Version humoristique', 'En alexandrins', 'Un haïku'],
  };
}

export function answerWhy(question) {
  const s = subjectOf(question);
  return {
    text: `**Pourquoi ${s} ?** — décomposons le raisonnement.\n\n**1. Cherchez la fonction, pas seulement la cause**\nTout phénomène durable existe parce qu'il remplit une fonction. Demandez-vous : à quoi sert ${s} ? Qu'est-ce qui se passerait sans lui ?\n\n**2. Distinguez cause immédiate et cause profonde**\n- *Cause immédiate* : l'élément déclencheur, visible.\n- *Cause structurelle* : la condition de fond, souvent invisible, qui rendait le déclenchement possible.\n\n**3. Remontez la chaîne**\nFormulez le lien sous forme « A → B → C » et vérifiez chaque flèche : est-ce une nécessité, une simple corrélation, ou une coïncidence ?\n\n**4. Testez votre explication**\nRenversez l'hypothèse : si ${s} n'existait pas, l'effet disparaîtrait-il vraiment ? Si non, votre cause n'est pas la bonne.\n\n> 🔎 Pour les **faits vérifiables** (dates, données, études), activez la recherche web : sans source, une explication reste une hypothèse.`,
    chips: ['Explique avec des sources', 'Donne un exemple', 'Et les conséquences ?'],
  };
}

export function answerFix(question) {
  return {
    text: `Envoyez-moi le texte à corriger (collez-le ci-dessous ou joignez un fichier 📎) et je vous rends :\n\n1. **La version corrigée** complète, prête à copier.\n2. **Un tableau des corrections** : erreur → règle → pourquoi.\n3. **Une note de style** : lourdeurs, répétitions, tics d'écriture.\n4. **Une version améliorée** si vous voulez aller plus loin (même sens, meilleure clarté).\n\n**Ce que je vérifie systématiquement :**\n- accords (sujet-verbe, nom-adjectif, participe passé) ;\n- homophones grammaticaux (a/à, ou/où, ce/se, leur/leurs) ;\n- ponctuation et construction des phrases longues ;\n- temps et modes (subjonctif après « bien que », etc.) ;\n- registre (soutenu, courant, familier) selon le contexte.\n\n**Astuce :** indiquez le **type de texte** (dissertation, e-mail, roman) — les règles de style ne sont pas les mêmes.`,
    chips: ['Corrige ce texte', 'Explique la règle', 'Améliore le style'],
  };
}

export function answerTranslate(question) {
  return {
    text: `Prêt à traduire. Pour un résultat fidèle, précisez-moi :\n\n1. **Le texte** à traduire.\n2. **La langue cible** (anglais, arabe, espagnol, allemand, italien…).\n3. **Le registre** : courant, soutenu, technique, familier.\n4. **L'usage** : e-mail pro, sous-titres, texte littéraire, notice technique.\n\n**Comment je procède :** je traduis le **sens** puis je réécris selon les usages de la langue cible — une bonne traduction ne calque pas la syntaxe de départ. Exemple : « *je suis d'accord* » ne se traduit pas mot à mot mais par l'équivalent idiomatique.\n\n**Ce que je fournis :** la traduction, puis les **choix délicats** expliqués (expressions, faux amis, formules de politesse).`,
    chips: ['Traduis en anglais', 'Traduis en arabe', 'Explique les faux amis'],
  };
}

export function answerOpinion(question) {
  const s = subjectOf(question);
  return {
    text: `**Mon conseil sur : ${s}**\n\nPlutôt que « ce qui est bien », regardons **ce qui dépend de votre situation**. Trois questions à trancher :\n\n1. **Quel est votre objectif réel ?** (apprendre, gagner du temps, sécuriser, prendre du plaisir)\n2. **Quelle contrainte domine ?** (temps, argent, énergie, risque acceptable)\n3. **Quel est le coût de l'erreur ?** Si l'erreur est réversible et peu coûteuse → essayez vite. Si elle est irréversible → vérifiez davantage.\n\n**Ma recommandation par défaut :** choisissez l'option qui vous fait **apprendre le plus vite**, même si elle est un peu moins confortable — à condition que l'erreur reste réversible.\n\n**Ce que j'éviterais :** décider sous le coup de l'urgence, ou copier la solution de quelqu'un dont les contraintes ne sont pas les vôtres.\n\nDonnez-moi les 2 ou 3 options qui s'offrent à vous : je les compare critère par critère.`,
    chips: ['Compare mes options', 'Et si je me trompe ?', 'Un exemple concret'],
  };
}

export function answerList(question) {
  const s = subjectOf(question);
  return {
    text: `**${capitalize(s)} — panorama structuré**\n\n**1. Les éléments de base**\nCe qui constitue ${s} : les composants indispensables, ceux sans lesquels rien ne tient.\n\n**2. Les variantes**\nLes formes proches mais distinctes. C'est souvent là que se cachent les confusions en examen.\n\n**3. Les applications**\nÀ quoi cela sert concrètement, dans quels contextes on le rencontre.\n\n**4. Les limites**\nCe que ${s} ne permet pas de faire, ou les cas où la notion ne s'applique plus.\n\n**5. Pour aller plus loin**\nLes notions voisines à relier : c'est le passage de la liste au raisonnement.\n\n> Pour une liste **factuelle et sourcée** (noms, dates, chiffres exacts), activez 🔎 **Recherche web** : je citerai Wikipédia et les pages trouvées.`,
    chips: ['Détaille chaque point', 'Donne des exemples', 'Fais-moi un quiz dessus'],
  };
}

export function answerThanks() {
  return {
    text: pick([
      'Avec plaisir ! 😊 Dites-moi si vous voulez aller plus loin sur un point précis.',
      'De rien ! N\'hésitez pas si vous voulez un exemple, un exercice ou une version plus courte.',
      'C\'était un plaisir. On continue sur un autre sujet, ou on approfondit celui-ci ?',
    ]),
    chips: ['Approfondir', 'Un exercice', 'Autre sujet'],
  };
}

/* ══════════════════════════════════════════════════════════════
   RÉPONSE GÉNÉRALE (question ouverte) — structurée, honnête
   ══════════════════════════════════════════════════════════════ */

export function answerGeneral(question, { level = 'moyen', domain = null } = {}) {
  const s = subjectOf(question);
  const S = capitalize(s);
  const depth = { simple: 4, moyen: 6, approfondi: 9 }[level] || 6;
  const parts = [];

  parts.push(`**${S}** — voici une réponse structurée.`);
  parts.push(
    `**1. L'essentiel**\n${S} se comprend en trois questions : *de quoi parle-t-on exactement*, *comment cela fonctionne*, et *à quoi cela sert*. Répondre à ces trois questions, c'est déjà maîtriser le sujet.`,
  );
  parts.push(
    `**2. Comment l'aborder**\n- **Définir** : délimitez le terme pour éviter les confusions.\n- **Décomposer** : séparez en éléments simples (causes / composants / étapes).\n- **Relier** : cherchez les liens avec ce que vous savez déjà.\n- **Illustrer** : un exemple concret vaut trois définitions.`,
  );
  if (depth >= 6) {
    parts.push(
      `**3. Ce qu'on attend de vous**\nSur ce type de question, une réponse solide comporte : une définition précise, un mécanisme expliqué, un exemple, et une nuance (limite ou cas particulier). C'est la structure qui fait la différence, plus que la quantité.`,
    );
  }
  if (depth >= 9) {
    parts.push(
      `**4. Aller plus loin**\nInterrogez les présupposés : la question suppose-t-elle déjà une réponse ? Quelles positions s'opposent ? Quelles conséquences pratiques en découlent ? Ce dernier niveau transforme une bonne réponse en réponse remarquable.`,
    );
  }
  parts.push(
    `**Pour aller plus loin :** dites-moi votre **niveau** (collège, lycée, supérieur) et votre **objectif** (comprendre, réviser, rédiger) — j'adapte la réponse. Activez 🔎 **Recherche web** pour des faits sourcés.`,
  );

  return {
    text: parts.join('\n\n'),
    chips: ['Explique plus simplement', 'Donne un exemple', 'Teste-moi dessus', 'Cherche des sources'],
    meta: { domain: domain?.label || null },
  };
}

/* ══════════════════════════════════════════════════════════════
   CORRECTION ORTHOGRAPHIQUE (heuristique locale)
   ══════════════════════════════════════════════════════════════ */

const COMMON = {
  'sa va': 'ça va',
  'sa fait': 'ça fait',
  'comme meme': 'quand même',
  'malgres': 'malgré',
  'parmis': 'parmi',
  'aujourd hui': "aujourd'hui",
  'peut etre': 'peut-être',
  'c est': "c'est",
  'qu est': "qu'est",
  'il a': 'il a',
  'a cause de': 'à cause de',
  'biensur': 'bien sûr',
  'sa': 'sa',
  'malgrés': 'malgré',
  'definir': 'définir',
  'developper': 'développer',
  'entrainer': 'entraîner',
  'interressant': 'intéressant',
  'courrir': 'courir',
  'recois': 'reçois',
  'apercevoir': 'apercevoir',
};

export function correctText(text = '') {
  let out = String(text);
  const notes = [];
  for (const [bad, good] of Object.entries(COMMON)) {
    if (bad === good) continue;
    const rx = new RegExp(`\\b${bad.replace(/ /g, '\\s+')}\\b`, 'gi');
    if (rx.test(out)) {
      out = out.replace(rx, good);
      notes.push({ from: bad, to: good, rule: 'Orthographe lexicale courante' });
    }
  }
  // espaces avant ponctuation haute (règle française : espace insécable avant :) ; ! ?)
  const before = out;
  out = out.replace(/\s+([,.;])/g, '$1').replace(/([^\s])([:;!?])/g, '$1 $2');
  if (out !== before) notes.push({ from: 'ponctuation', to: 'espacement français', rule: 'Typographie française' });
  out = out.replace(/\s{2,}/g, ' ').trim();
  return { corrected: out, notes };
}
