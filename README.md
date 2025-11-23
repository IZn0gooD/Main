# Test Lecteur Vidéo Electron

Projet de test pour vérifier que le lecteur vidéo en arrière-plan fonctionne correctement dans Electron.

## Installation

```bash
npm install
```

## Utilisation

1. Placez un fichier vidéo nommé `background.mp4` dans le dossier `assets/`
2. Lancez l'application :

```bash
npm start
```

## Structure

- `main.js` : Processus principal Electron avec le protocole personnalisé `app://`
- `index.html` : Interface avec la vidéo en arrière-plan
- `assets/background.mp4` : Fichier vidéo à placer ici

## Vérification

La console développeur s'ouvre automatiquement pour afficher les logs. Vérifiez :
- Si le protocole `app://` est bien enregistré
- Si la vidéo se charge correctement
- Les messages d'erreur éventuels

