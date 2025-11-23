# Plan d'amélioration du projet Valorant Team Manager

## 🚀 Fonctionnalités prioritaires

1. Optimisation des performances
   - Lazy loading des modules/composants/ressources
   - Déporter les traitements lourds via Web Workers/processus en arrière-plan
   - Profiling (Chrome DevTools, contentTracing) et corrections des goulets CPU/mémoire
   - Optimisation du bundling (réduire les require synchrones)

2. Robustesse et gestion mémoire
   - Détection proactive des fuites mémoire
   - Amélioration du cache des données calculées, invalidations fines
   - Gestion du cycle de vie des fenêtres/listeners (création, nettoyage, destruction rapide)

3. Gestion avancée des fichiers et sauvegardes
   - Backups automatiques versionnés et plus granulaires
   - Détection/notification de corruption sur JSON de sauvegarde
   - Restauration d’une version antérieure (outil de rollback)

4. Interface utilisateur et expérience
   - Disposition personnalisable (drag & drop des panneaux, redimensionnement)
   - Modes plein écran et compact

5. Notifications avancées et rappels
   - Rappels planifiés (matchs à venir, rappels périodiques)
   - Personnalisation du type et de la fréquence des alertes

6. Sécurité et confidentialité
   - Sécurisation du stockage local (clés API, données sensibles)
   - Nettoyage automatique programmé des données sensibles

7. API et synchronisation
   - Implémentation de l'API Riot Games officielle 
   - Finaliser/fiabiliser VAL-STATUS (mapping plateformes, retries/backoff)
   - Politique de cache TTL par endpoint, gestion fine des erreurs 401/403/404

8.  Export/rapport
   - Rapport HTML/PDF enrichi (sections paramétrables, thèmes)
   - Exports CSV ciblés (par joueur, par période, par map)

9.  Qualité et observabilité
   - Tests de fumée UI critiques, validations de schémas de données
   - Journalisation d’erreurs centralisée (renderer/main), métriques clés

## ✅ Améliorations terminées

### 1. Modularisation du code (En cours)
- ✅ Création de la structure de dossiers modulaires
- ✅ Extraction des modèles de données :
  - `js/models/Player.js` - Modèle Player avec méthodes utilitaires
  - `js/models/Round.js` - Modèle Round
  - `js/models/Match.js` - Modèle Match avec statistiques
  - `js/models/Team.js` - Modèle Team avec méthodes de gestion
- ✅ Création des utilitaires :
  - `js/utils/constants.js` - Constantes de l'application (agents, maps, rôles, rangs)
- ✅ Création des services :
  - `js/services/StorageService.js` - Service de gestion du stockage avec cache
- ✅ Intégration des modules dans `index.html`

### 2. Gestion du cache et stockage
- ✅ `StorageService` avec système de cache (5 secondes par défaut)
- ✅ Méthode `validateJSONFile()` pour contrôle d'intégrité
- ✅ Support de la sauvegarde automatique (à activer)

### 3. Performance & Robustesse (livrées)
- ✅ Lazy load: Plotly, `js/ui/charts.js`, `js/ui/statistics.js`
- ✅ Lazy load: `TutorialService`, `ReportService`
- ✅ Nettoyage mémoire au changement d’onglet (purge de listeners par remplacement de noeud)

### 4. Notifications avancées
- ✅ Rappels de matchs: J-1, 1h, 15 min (replanification à l’ajout/suppression)

### 5. Sécurité et confidentialité
- ✅ `EncryptionService` (AES‑GCM 256, PBKDF2)
- ✅ Chiffrement optionnel des backups (5 min) via phrase secrète
- ✅ Modale “Sécurité” pour définir/retirer la phrase secrète

### 6. Export / Rapport
- ✅ Exports CSV ciblés: par map, par joueur (synthèse), par période (30 jours)
- ✅ Rapport HTML thémé (paramètre de thème transmis)
 - ✅ Export PDF thémé (aperçu imprimable avec couverture et sections)
 - ✅ Filtres d’export (joueur, map, période “de/à”)
 - ✅ Export Excel (XLS) filtré (période/map + tableau joueurs)

### 7. OCR Scoreboard Valorant (nouveau)
- ✅ Modale “🧠 Import Scoreboard via OCR” (toolbar)
- ✅ Chargement d’image par drag & drop / fichier, aperçu canvas
- ✅ ROI (zone de sélection à la souris) avec overlay précis
- ✅ Prétraitements: niveaux de gris, contraste, débruitage, binarisation (seuil auto ou manuel)
- ✅ OCR Tesseract.js lazy‑load (eng+fra), timeouts gérés
- ✅ Lecture ciblée:
  - Bandeau “score” (entête) et bandeau “CARTE - …”
  - Zone tableau (auto ou ROI)
  - Lecture par bandes (10 lignes) avec upscale x2, seuil adaptatif clair/foncé, tentative inversée
- ✅ Parsing robuste du scoreboard (gauche → droite):
  - Nom, Score de combat (ACS), EMA = K/D/A, Score d’éco, Premiers sangs, Poses, Désamorçages
  - Détection de la map et du score final (13‑11, etc.)
- ✅ Préremplissage de match:
  - Bouton “Préremplir le match”: ouvre l’éditeur avec Date/Map/Adversaire/Score et tableau Joueurs & Statistiques (10 lignes max) déjà remplis
  - Colonnes de l’éditeur: Équipe, Nom, K, D, A, ACS, Éco, 1ers sangs, Poses, Désamorçages
- ✅ Fallback automatique quand la ROI masque le tableau
- ✅ Métriques: ocr_open, ocr_run, ocr_map_fields, ocr_import_players (remplacé par préremplissage)


## 🗺️ Roadmap (ligne directrice)

### Sécurité renforcée (priorité continue)
- Charger uniquement du contenu sécurisé (HTTPS, ou `app://` personnalisé; éviter `file://`).
- Désactiver Node.js dans les rendus et activer `contextIsolation` (main process).
- Activer `sandbox: true` sur les BrowserWindow.
- Définir un CSP strict (fait): `default-src 'self' app:`; `script-src 'self' https://cdn.plot.ly https://cdn.jsdelivr.net`; `style-src 'self' 'unsafe-inline'`; `worker-src blob:`; `connect-src 'self' https://cdn.plot.ly https://cdn.jsdelivr.net data: blob:`; `frame-src 'none'`; `object-src 'none'`.
- Valider l’émetteur des messages IPC (whitelist de canaux et origin côté main/renderer).
- Interdire/limiter `<webview>` (aucun par défaut).
- Chiffrement local et nettoyage périodique (déjà implémentés).
- Maintenir Electron à jour.

### Optimisation des performances et robustesse
- Lazy loading étendu (UI/services lourds).
- Calculs lourds dans Web Workers/process dédiés.
- Profiling régulier pour goulots CPU/mémoire.
- Gestion mémoire: purge listeners, cleanup agressif des ressources.
- Cycle de vie fenêtres/process: libération et teardown propre.

### Expérience utilisateur et outils
- Personnalisation avancée de la disposition (drag & drop, redimensionnement).
- Modes plein écran/compact/présentation.
- Notifications/rappels configurables (types, fréquence).
- Backups auto versionnés avec détection de corruption + notifications.
- Journalisation centralisée + métriques d’usage (observabilité).

### Phase 1 — Import/Export avancé (S1–S2)
- État:
  - ✅ Exports CSV ciblés (par map, joueurs, période + options de colonnes)
  - ✅ Export XML (équipe/joueurs/matchs)
  - ✅ Import CSV matchs (preview, mapping souple, validation basique)
  - ✅ Export Excel (XLS) joueurs+matchs, filtre map/période/joueur
  - ✅ Export Excel natif (XLSX) avec SheetJS (+ fallback XLS)
  - ✅ Export PNG des graphiques (stats, comparaison)
  - ✅ Exports Valoplants (HTML/PDF) par map/side
  - ⏳ Tests de fumée/validation étendue (à ajouter)
  - ⏳ Export XLSX natif (au lieu de XLS HTML) (à faire)

### Phase 2 — Notifications et rappels (S3)
- État:
  - ✅ Rappels de matchs (J-1 / 1h / 15 min)
  - ✅ Centre de préférences (types + seuils winrate/agents + son)
  - ✅ Journalisation centralisée (Logger + modale Logs)
  - ✅ Journal d’alertes (modale) + export/vider
  - ⏳ Calculs réels par agent (statistiques d’agent à formaliser)
  - ⏳ Alerte agent: pipeline de calcul par agent (à faire)

### Phase 3 — Profils utilisateurs multiples (S4)
- État:
  - ✅ Profils locaux (sauver/appliquer/supprimer)
  - ✅ Import/Export de profils (JSON)
  - ⏳ Sélecteur au démarrage, packs consolidés, éventuelle synchro cloud

### Phase 4 — Métriques avancées (S5)
- État:
  - ✅ Métriques d’usage (modale “📈”) + export/réinit
  - ✅ Insights de base (meilleure map, tendance, top adversaires) intégrés aux Graphiques
  - ⏳ API interne calculs avancés + Workers étendus

### Phase 5 — Comparaison joueurs/équipes (S6)
- État:
  - ✅ Écran Comparaison (KPIs A/B, import JSON, graph barres)
  - ✅ Exports: CSV/Excel/HTML/PDF, options de colonnes
  - ✅ Export PNG du graphique de comparaison
  - ✅ Graphiques supplémentaires (radar, empilé)

### Phase 6 — Interface/UX et Thèmes (S7)
- État:
  - ✅ Améliorations UI (Stratégie: galerie avec notes, hover actions, preview)
  - ✅ Drag & drop + collage d’images (Stratégie)
  - ✅ Réorganisation responsive (Comparaison)
  - ✅ Gestion avancée des thèmes (sauvegarder/appliquer/supprimer, import/export, thème actif persistant)
  - ⏳ Panneau “Apparence” complet + thèmes sauvegardables (à faire)

### Phase 7 — Sécurité et robustesse (S8)
- État:
  - ✅ Chiffrement local (AES‑GCM) + modale Sécurité
  - ✅ Backups auto versionnés (5 min) avec chiffrement optionnel
  - ✅ Restauration via liste et sélecteur rapide
  - ⏳ Historique/Diff/Restore ciblée (à faire)

## 📖 Guide rapide — OCR Scoreboard

1) Ouvrir la modale via le bouton “🧠” dans la barre d’outils.
2) Charger la capture (1080p+ recommandé). Optionnel: tracer une ROI serrée autour du tableau (sans le bandeau “VICTOIRE”).
3) Ajuster les options:
   - Contraste, Niveaux de gris, Denoise
   - Seuil (binarisation): 0 = auto; sinon 0–255 (plus bas si fond clair)
   - Langue: fra/eng; Gabarit: Valorant (post‑match) par défaut
4) Exécuter l’OCR. Le JSON affiche:
   - fields: map/score/opponent si détectés
   - players: liste des joueurs avec { name, k, d, a, acs, eco, firstBloods, plants, defuses }
5) Cliquer “Préremplir le match” pour ouvrir l’éditeur avec les champs pré‑remplis. Vérifier/éditer puis Enregistrer.

Notes:
- Si peu de lignes détectées, l’app relance automatiquement une lecture sur la zone tableau et en “bandes”.
- Les fonds alternés du tableau sont traités par un seuillage adaptatif et une tentative inversée.
- Les colonnes sont mappées strictement dans l’ordre Valorant: Nom | ACS | K/D/A | Éco | 1ers sangs | Poses | Désamorçages.

## 📁 Structure des modules

```
js/
├── models/          # Modèles de données
│   ├── Player.js
│   ├── Round.js
│   ├── Match.js
│   └── Team.js
├── ui/             # Interface utilisateur (à créer)
│   ├── tabs.js
│   ├── modals.js
│   ├── statistics.js
│   └── charts.js
├── utils/          # Utilitaires
│   ├── constants.js
│   ├── validators.js (à créer)
│   └── formatters.js (à créer)
└── services/       # Services métier
    ├── StorageService.js
    ├── NotificationService.js (à créer)
    └── ExportService.js (à créer)
```

## 🚀 Prochaines étapes prioritaires
1. Profiling et corrections ciblées (CPU/mémoire)
2. Web Workers pour calculs de stats
3. Rapport PDF thémé (export imprimable)
4. Exports CSV/Excel filtrés (sélecteurs période/map/joueur)
5. Logger centralisé (renderer/main) et métriques d’usage

## 📝 Notes

- Les modules sont chargés dans l'ordre : Round → Player → Match → Team (dépendances)
- Le StorageService utilise un cache de 5 secondes par défaut
- La validation JSON est déjà implémentée dans StorageService
- La sauvegarde automatique peut être activée avec `enableAutoSave()`

