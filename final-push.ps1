# Script pour ajouter les modifications directement sur ValorantTeamManager
# Le merge a échoué car les histoires sont non liées

Write-Host "🔧 Ajout des modifications sur ValorantTeamManager..." -ForegroundColor Cyan

# Aller dans le dossier du projet
Set-Location $PSScriptRoot

# Vérifier sur quelle branche on est
$currentBranch = git branch --show-current
Write-Host "📍 Branche actuelle: $currentBranch" -ForegroundColor Cyan

# S'assurer qu'on est sur ValorantTeamManager
if ($currentBranch -ne "ValorantTeamManager") {
    Write-Host "🔄 Passage à la branche ValorantTeamManager..." -ForegroundColor Cyan
    git checkout ValorantTeamManager
}

# Récupérer les dernières modifications de GitHub
Write-Host "📥 Récupération des dernières modifications..." -ForegroundColor Cyan
git pull origin ValorantTeamManager

# Vérifier les fichiers modifiés sur master
Write-Host "`n📊 Fichiers modifiés sur master:" -ForegroundColor Cyan
git diff master --name-only

# Copier les fichiers modifiés depuis master
Write-Host "`n📋 Copie des fichiers modifiés depuis master..." -ForegroundColor Cyan

# Les fichiers principaux à copier
$filesToCopy = @(
    "main.js",
    "renderer.js", 
    "index.html"
)

foreach ($file in $filesToCopy) {
    if (Test-Path "../master/$file" -ErrorAction SilentlyContinue) {
        Write-Host "  📄 Copie de $file..." -ForegroundColor Gray
        git show master:$file > $file 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $file copié" -ForegroundColor Green
        }
    } else {
        # Essayer de récupérer depuis master directement
        git checkout master -- $file 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ $file récupéré depuis master" -ForegroundColor Green
        }
    }
}

# Alternative: utiliser git show pour récupérer les fichiers
Write-Host "`n📥 Récupération des fichiers depuis master..." -ForegroundColor Cyan
git show master:main.js > main.js
git show master:renderer.js > renderer.js  
git show master:index.html > index.html

# Vérifier les différences
Write-Host "`n📊 Différences avec la version distante:" -ForegroundColor Cyan
git status --short

# Ajouter les fichiers modifiés
Write-Host "`n➕ Ajout des fichiers modifiés..." -ForegroundColor Cyan
git add main.js renderer.js index.html

# Vérifier s'il y a des changements
$status = git status --porcelain
if ($status) {
    Write-Host "💾 Création d'un commit avec les corrections..." -ForegroundColor Cyan
    git commit -m "Corrections: Event listener bouton Ajouter Joueur + Gestion chemins app.asar

- Correction de l'attachement de l'event listener pour le bouton 'Ajouter Joueur'
- Utilisation de app.getPath('userData') pour les fichiers de données en mode packagé
- Correction de l'erreur ENOTDIR lors de la création du dossier Data
- Amélioration du protocole app:// pour fonctionner avec app.asar
- Ajout de logs de diagnostic et système de retry automatique
- Gestion d'erreurs améliorée dans main.js"
    
    Write-Host "✅ Commit créé" -ForegroundColor Green
    
    # Pousser vers GitHub
    Write-Host "`n🚀 Push vers GitHub..." -ForegroundColor Cyan
    git push origin ValorantTeamManager
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Modifications poussées vers GitHub avec succès!" -ForegroundColor Green
        Write-Host "🔗 Dépôt: https://github.com/IZn0gooD/Main/tree/ValorantTeamManager" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Erreur lors du push." -ForegroundColor Red
    }
} else {
    Write-Host "⚠️ Aucun changement détecté. Les fichiers sont peut-être déjà à jour." -ForegroundColor Yellow
    Write-Host "💡 Vérifiez manuellement avec: git diff origin/ValorantTeamManager" -ForegroundColor Gray
}

