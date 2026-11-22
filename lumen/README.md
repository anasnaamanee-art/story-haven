# ✦ Lumen — assistant IA français, gratuit et illimité

Un assistant IA **francophone** qui tourne chez vous : aucune inscription, aucune clé API, **aucune limite** de messages. Interface inspirée des grands assistants modernes (DeepSeek / ChatGPT), avec mode sombre, historique local, export et documents.

```bash
cd lumen && npm install && npm start   # → http://localhost:3000
```

> **Honnêteté technique.** Lumen n'est pas un modèle de langage de 100 milliards de paramètres : c'est un **moteur de compréhension et de rédaction française** (analyse d'intention, base de connaissances vérifiée, génération structurée, recherche documentaire BM25, recherche web). Résultat : des réponses utiles, instantanées, hors ligne et illimitées — avec des limites claires sur la culture générale très pointue. Pour les faits précis, activez 🔎 **Web** : il cite ses sources.

---

## ✨ Ce qu'il sait faire

| Fonction | Détail |
|---|---|
| **Chat structuré** | Réponses en markdown : titres, listes, tableaux, blocs de code copiables, blocs repliables |
| **24 intentions détectées** | définition, comparaison, procédure, explication causale, plan de travail, quiz, lettre/e-mail, code, recette, traduction, correction, poème, liste, avis, salutation… |
| **3 niveaux de profondeur** | Simple · Moyen · Approfondi (bouton 🎚️) |
| **Calcul** | Expressions, pourcentages (« 15 % de 240 »), opérations en mots (« 3 fois 7 ») avec étapes |
| **Base de connaissances** | 25 fiches scolaires vérifiées (photosynthèse, ADN, Révolution, Pythagore, dérivées, effet de serre, IA, subjonctif, méthode de révision…) |
| **Documents volumineux** | PDF, Word, PowerPoint, Excel, EPUB, texte, HTML — jusqu'à **300 fichiers** par lot, **3 Go** par fichier |
| **Résumé & plan** | Résumé en 4/9/16 phrases, plan du document, définitions repérées |
| **Exercices corrigés** | Quiz générés depuis **vos documents** (texte à trous, vrai/faux, questions ouvertes) ou depuis la base |
| **Recherche web** | Wikipédia (fr/en/ar) + DuckDuckGo + arXiv, sans clé API, avec citations |
| **Boîte à outils** | Résumeur, correcteur orthographique, calculatrice de pourcentages |
| **Confort** | Historique local, régénérer, « plus simple » / « détailler », copier, exporter en HTML (→ PDF), thème sombre, raccourcis ⌘K / ⌘/ |

---

## 🚀 Installation

```bash
cd lumen
npm install        # express, multer, pdfjs-dist, mammoth, jszip, xlsx
npm start          # http://localhost:3000
```

Variables d'environnement :

| Variable | Défaut | Rôle |
|---|---|---|
| `PORT` | `3100` | Port HTTP |
| `DATA_DIR` | `./data` | Stockage des documents et de l'index |
| `MAX_FILE_BYTES` | `3 Go` | Taille maximale par fichier |
| `UPLOAD_CONCURRENCY` | `4` | Fichiers traités en parallèle |

Aucune connexion sortante n'est nécessaire : le chat, les documents, les résumés, les quiz et les calculs fonctionnent **hors ligne**. Seule la recherche web utilise Internet.

---

## 🧠 Comment il « pense »

```
Message
  ├─ 1. Détection de langue (fr / en / ar)
  ├─ 2. Résolution du sujet (mémoire conversationnelle : « développe », « et l'inverse ? »)
  ├─ 3. Classification d'intention (24 classes, règles ordonnées par priorité)
  ├─ 4. Base de connaissances → fiche vérifiée si le sujet est couvert
  ├─ 5. Documents joints → recherche BM25 (radicalisation française, mots vides)
  │      + seuil de couverture pour éviter les réponses hors sujet
  ├─ 6. Générateur adapté à l'intention (plan, tableau, code, quiz…)
  └─ 7. Recherche web optionnelle → résumé + sources citées
```

Points techniques : BM25 (k1 = 1,5 ; b = 0,75) sur fragments de 1 200 caractères, index écrit sur disque, uploads enregistrés sur disque (mémoire stable même avec des fichiers de plusieurs Go), rendu markdown maison sans dépendance.

---

## 📁 Structure

```
lumen/
├── server.js           # API HTTP : chat, upload, résumé, correction, web
├── lib/
│   ├── brain.js        # intentions + générateurs de réponses
│   ├── kb.js           # base de connaissances (25 fiches vérifiées)
│   ├── quiz.js         # quiz corrigés (fiches + documents)
│   ├── lang.js         # normalisation FR, radicalisation, résumé, segmentation
│   ├── library.js      # bibliothèque + index BM25
│   ├── extract.js      # PDF, DOCX, PPTX, XLSX, EPUB, HTML, CSV, OCR
│   └── search.js       # Wikipédia / DuckDuckGo / arXiv
└── public/index.html   # interface complète (aucune librairie externe)
```

---

## 🔒 Vie privée

- Les conversations restent dans **votre navigateur** (`localStorage`).
- Les documents restent dans `data/` sur votre machine ; ils ne sont jamais envoyés à un tiers.
- La recherche web transmet uniquement votre requête aux sources publiques interrogées.

## 🛠️ Dépannage

| Problème | Solution |
|---|---|
| « Aucun texte extrait » | PDF scanné : utilisez une version texte, ou activez l'OCR (`npm i tesseract.js`) |
| Recherche web vide | Le serveur n'a pas d'accès Internet sortant — le reste fonctionne quand même |
| Réponse trop générique | Reformulez avec un sujet précis, joignez un document, ou passez en niveau « Approfondi » |
| Fichier très lourd | Augmentez `MAX_FILE_BYTES`, gardez `UPLOAD_CONCURRENCY` à 2–4 |

## 📌 Feuille de route

- [ ] Connexion à un modèle local (Ollama / llama.cpp) en option, pour une culture générale illimitée
- [ ] Flashcards avec répétition espacée
- [ ] Export PDF natif côté serveur
- [ ] Mode multi-utilisateurs avec comptes locaux
