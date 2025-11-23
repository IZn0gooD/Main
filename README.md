# Valorant Team Manager

Application Electron pour gérer votre équipe Valorant avec statistiques détaillées et suivi de progression.

## Fonctionnalités

- 🏠 **Page d'accueil** : Vue d'ensemble de l'équipe avec statistiques rapides
- 👥 **Gestion des joueurs** : Ajout, modification et suppression de joueurs avec leurs agents, rôles et rangs
- 📊 **Gestion des matchs** : Suivi des matchs avec détails des rounds (gagnant, côté, type, notes)
- 📈 **Statistiques** : 
  - Statistiques par map
  - Statistiques détaillées des rounds (par type et par côté)
  - Graphiques interactifs (Plotly.js) :
    - Graphique des victoires/défaites
    - Performance par map
    - Statistiques des rounds
    - Évolution temporelle
    - Utilisation des agents
- 🎯 **Progression personnelle** : Suivi détaillé de vos performances avec analyse des points positifs/négatifs
- 🎯 **Agents par map** : Configuration des agents que chaque joueur connaît pour chaque map

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Lancer l'application :
```bash
npm start
```

## Build

Pour créer un exécutable Windows :

```bash
npm run build:win
```

Les fichiers seront générés dans le dossier `dist/`.
