# Story Haven — Démos web

Ce dépôt contient deux applications web autonomes (un seul fichier HTML chacune, sans dépendances).

## 📁 Fichiers

| Fichier | Description |
|---|---|
| `index.html` | **X — Clone Pro** : clone du réseau social X (Twitter) — fil d'actualité, réponses, citations, sondages, profils, messages, notifications, thèmes… |
| `story.html` | **Story Haven** : contes illustrés en anglais, arabe et français. |

## 🚀 Lancer en local

```bash
python3 -m http.server 8080
# puis ouvrir http://localhost:8080 (X Clone Pro) ou /story.html
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
