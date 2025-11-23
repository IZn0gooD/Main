# Guide pour envoyer le code sur GitHub

## Étapes à suivre

### 1. Initialiser le dépôt Git (si ce n'est pas déjà fait)

```powershell
cd C:\Users\Admin\VSCODE\VideoPlayerTest
git init
```

### 2. Vérifier le .gitignore

Le fichier `.gitignore` est déjà configuré pour exclure :
- `node_modules/`
- Les fichiers de build (`dist/`, `*.exe`, etc.)
- Les données sensibles (`Data/*.json`)

### 3. Ajouter tous les fichiers

```powershell
git add .
```

### 4. Créer le commit initial

```powershell
git commit -m "Initial commit - Valorant Team Manager"
```

### 5. Créer une nouvelle branche depuis Main

```powershell
# Créer et basculer sur une nouvelle branche
git checkout -b nouvelle-branche

# Ou si vous voulez nommer la branche différemment :
git checkout -b feature/overlay-mode
```

### 6. Configurer le remote GitHub

**Option A : Si le dépôt GitHub existe déjà**

```powershell
# Remplacer USERNAME et REPO_NAME par vos informations
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Vérifier que le remote est bien configuré
git remote -v
```

**Option B : Si vous devez créer un nouveau dépôt sur GitHub**

1. Allez sur https://github.com/new
2. Créez un nouveau dépôt (ne cochez PAS "Initialize with README")
3. Copiez l'URL du dépôt (ex: `https://github.com/USERNAME/REPO_NAME.git`)
4. Exécutez :

```powershell
git remote add origin https://github.com/USERNAME/REPO_NAME.git
```

### 7. Pousser la branche vers GitHub

```powershell
# Pousser la branche actuelle vers GitHub
git push -u origin nouvelle-branche

# Ou si vous avez nommé la branche différemment :
git push -u origin feature/overlay-mode
```

### 8. (Optionnel) Créer une Pull Request

1. Allez sur votre dépôt GitHub
2. Cliquez sur "Compare & pull request"
3. Sélectionnez votre nouvelle branche comme source
4. Remplissez les détails et créez la PR

## Commandes utiles

### Vérifier l'état
```powershell
git status
```

### Voir les branches
```powershell
git branch -a
```

### Changer de branche
```powershell
git checkout main
git checkout nouvelle-branche
```

### Mettre à jour depuis GitHub
```powershell
git fetch origin
git pull origin main
```

## Notes importantes

- ⚠️ **Ne commitez JAMAIS** :
  - Les fichiers `Data/*.json` (contiennent des données sensibles)
  - Les clés API dans le code
  - Les mots de passe ou tokens
  
- ✅ **Fichiers à commiter** :
  - Code source (`.js`, `.html`, `.css`)
  - Configuration (`package.json`, `package-lock.json`)
  - Documentation (`README.md`, `docs/`)
  - Assets (images, vidéos)

