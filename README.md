# Story Haven — Démos web

Ce dépôt contient deux applications web autonomes (un seul fichier HTML chacune, sans dépendances).

## 📁 Fichiers

| Fichier | Description |
|---|---|
| `index.html` | **X — Clone Pro** : clone du réseau social X (Twitter) — fil d'actualité, réponses, citations, sondages, profils, messages, notifications, thèmes… |
| `story.html` | **Story Haven** : contes illustrés en anglais, arabe et français. |
| `lumen/` | **✦ Lumen** : assistant IA **francophone** gratuit et illimité — chat structuré, 3 niveaux de profondeur, base de connaissances vérifiée, documents volumineux, quiz corrigés, recherche web sourcée. Interface type DeepSeek. Voir `lumen/README.md`. |
| `mudhakir/` | **مذاكر (Mudhakir)** : assistant d'études IA auto-hébergé — bibliothèque de centaines de fichiers volumineux, questions/réponses sourcées, exercices corrigés, flashcards, recherche web, planning. AR/FR, gratuit et illimité. Voir `mudhakir/README.md`. |

## 🚀 Lancer en local

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080 (X Clone Pro) ou /story.html

# ✦ Lumen (assistant IA français) :
cd lumen && npm install && npm start      # → http://localhost:3100

# مذاكر (assistant d'études) :
cd mudhakir && npm install && npm start   # → http://localhost:3000
```

## ✨ X Clone Pro — fonctionnalités (v3)

- Fil **Pour vous / Abonnements**, composer 280 caractères avec anneau de progression
- **Upload d'images réel** (redimensionnées côté client) + visionneuse plein écran
- **Pages de détail** des publications avec fils de réponses
- **Citations** de publications, republications, **modification** et **épinglage** de ses posts
- **Profils complets** pour tous les utilisateurs (biographie, stats, suivi dynamique)
- **Hashtags et mentions cliquables**, recherche (publications + personnes)
- Sélecteur d'**émojis**, sondages interactifs persistants
- **Fil en direct simulé** (nouvelles publications + notifications en cours de session)
- Messages privés avec indicateur « écrit… », notifications avec onglets
- 3 thèmes (clair / pénombre / sombre), raccourcis clavier (`?` pour l'aide)
- Persistance complète en `localStorage`
- Entièrement responsive (barre mobile, FAB, modales plein écran)
