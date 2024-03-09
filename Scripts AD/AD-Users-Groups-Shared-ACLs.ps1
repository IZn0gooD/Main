#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ScriptName = $MyInvocation.MyCommand.Name
Install-Module PSWriteColor
Import-Module PSWriteColor

$text = @"
                                                            
                          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓         
                         ▓▓        ▓▓▒▒▓▓      ▓▓           ▓▓▓▓        
                         ▓▓        ▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓       ▓▓▒▒▓▓       
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▓▓▓     ▓▓       ▓▓▒▒▓▓       
                        ▓▓           ▓▓░░░▓▓      ▓▓      ▓▓▒▒▒▒▓▓      
                       ▓▓            ▓▓░░░▓▓     ▓▓       ▓▓▒▒▒▒▒▓▓     
                      ▓▓▓           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▓▓    
                      ▓▓                                 ▓▓▒▒▒▒▒▒▓▓     
                     ▓▓                                 ▓▓▒▒▒▒▒▒▒▓▓     
                     ▓▓         ▓▓▓▓▓     ▓▓▓▓▓         ▓▓▒▒▒▒▒▒▒▓▓     
                    ▓▓▓▓▓▓▓    ▓▓▒▒▓▓    ▓▓▓▓▓▓        ▓▓▒▒▒▒▒▒▒▓▓      
                   ▓▓▓   ▓▓    ▓▓▒▒▓▓   ▓▓   ▓▓        ▓▓▒▒▒▒▒▒▒▓▓      
                   ▓▓   ▓▓▓▓▓▓▓▓▒▒▒▓   ▓▓▓  ▓▓        ▓▓▒▒▒▒▒▒▒▓▓       
                  ▓▓    ▓▓    ▓▓▒▒▓▓   ▓▓   ▓▓        ▓▓▒▒▒▒▒▒▒▓▓       
                  ▓▓   ▓▓▓▓▓▓▓▓▒▒▒▓▓▓▓▓▓   ▓▓        ▓▓░░░░░░░▓▓        
                 ▓▓         ▓▓▒▒▒▒▒▒▓▓     ▓▓        ▓▓░░░░░░░▓▓        
                 ▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▓▓   ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░▒▓▓        
                  ▓▓         ▓▓░░░░░░░▓▓▓            ▓▓▒░░░░░▓▓         
                   ▓▓         ▓▓▒░░░░░▓▓▓▓▓▓▓         ▓▓▓░░░░▓▓         
                    ▓▓▓        ▓▓▓░░░▓▓     ▓▓          ▓▓░░▓▓          
                      ▓▓         ▓▓░▓▓       ▓▓          ▓▓▓▓▓          
                       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           
                                                     
"@

$text2 = @"
╔═════════════════════════════════════════════════════════════════════════════════════╗ 
║                                   $ScriptName                                  ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
"@

Clear-Host
Write-Host $text
Write-Host  
Write-Host $text2 

# Vérif si j'ai lancé le script en admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$ME = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ( $ME -eq $false ) {
    write-host 
    write-host -ForegroundColor Red "LE SCRIPT DOIT ETRE LANCE DANS UN POWERSHELL AVEC LES DROITS ADMINISTRATEURS"
    exit
}
else {
    write-host -NoNewline '▌ㅤScript lancé dans un shell Administrateurs ➞  '
    Write-Host -ForegroundColor Green 'OK' 
}

# Importer le module Active Directory
Import-Module ActiveDirectory

$CSVFile = "C:\Users.csv"
$CSVData = Import-CSV -Path $CSVFile -Delimiter ";" -Encoding UTF8

# Etape 1: Création des UO
Write-Host -ForegroundColor Yellow " Etape 1/7: Création des unités organisationnelles (UO)..."
Write-Host

New-ADOrganizationalUnit -Name "Utilisateurs" -Path "DC=test,DC=fr"
$OUPath = "OU=Utilisateurs,DC=test,DC=fr"
$OUNames = "IT", "Compta", "Direction"
$OUNames | ForEach-Object {
    New-ADOrganizationalUnit -Name $_ -Path $OUPath
}

# Etape 2: Création des groupes
Write-Host -ForegroundColor Yellow "Etape 2/7: Création des groupes..."
Write-Host

$GroupNames1 = "IT", "Compta", "Direction"
$GroupNames1 | ForEach-Object {
    New-ADGroup -Name $_ -GroupCategory Security -GroupScope Global -Path "OU=$_,$OUPath"
}

$ouList = @("Direction", "Compta", "IT")
$groupList = @("RW", "RO")

foreach ($ou in $ouList) {
    foreach ($group in $groupList) {
        $groupName = "${ou}_${group}"
        $ouPath = "OU=$ou,OU=Utilisateurs,DC=test,DC=fr"

        New-ADGroup -Name $groupName -GroupCategory Security -GroupScope DomainLocal -Path $ouPath

        if ($group -eq "RW") {
            Add-ADGroupMember -Identity "${groupName}" -Members "CN=$ou,$ouPath"
        }
        if ($group -eq "RO") {
            Add-ADGroupMember -Identity "${groupName}" -Members "CN=$ou,$ouPath"
        }
    }
}

# Etape 3: Configuration du domaine
Write-Host -ForegroundColor Yellow "Etape 3/7: Configuration des utilisateurs"
Write-Host

$Domain = Read-Host -Prompt "Entrez le nom de domaine (Ex : test.fr)"
$PWD = Read-Host -AsSecureString -Prompt "Entrez le mot de passe commun à tous les utilisateurs"

# Etape 4 Création des utilisateurs
Write-Host -ForegroundColor Yellow "Etape 4/7 Création des utilisateurs..."
Write-Host

Foreach ($Utilisateur in $CSVData) {
    $UtilisateurPrenom = $Utilisateur.Prenom
    $UtilisateurNom = $Utilisateur.Nom
    $UtilisateurLogin = $Utilisateur.Prenom
    $UtilisateurEmail = "$UtilisateurLogin@$Domain"
    $UtilisateurMotDePasse = $PWD
    $UtilisateurFonction = $Utilisateur.Fonction
    $UtilisateurGroupe = $Utilisateur.Groupe
    $UtilisateurOU = $Utilisateur.OU

    if (-not (Get-ADUser -Filter {SamAccountName -eq $UtilisateurLogin})) {
        New-ADUser -Name $UtilisateurPrenom -DisplayName $UtilisateurPrenom -GivenName $UtilisateurPrenom -Surname $UtilisateurNom `
            -SamAccountName $UtilisateurLogin -UserPrincipalName "$UtilisateurLogin@$Domain" -EmailAddress $UtilisateurEmail `
            -Title $UtilisateurFonction -Path $UtilisateurOU -AccountPassword(ConvertTo-SecureString $UtilisateurMotDePasse -AsPlainText -Force) -ChangePasswordAtLogon $true -Enabled $true
        Write-Host "Création de l'utilisateur : $UtilisateurLogin ($UtilisateurNom $UtilisateurPrenom)"
    } else {
        Write-Warning "L'identifiant $UtilisateurLogin existe déjà dans l'AD"
    }

    $UtilisateurLogin = $Utilisateur.Prenom
    $UtilisateurGroupe = $Utilisateur.Groupe

    if ($UtilisateurGroupe -eq "Direction") {

    Add-ADGroupMember -Identity Direction -Members $UtilisateurLogin 
    Write-Output "Ajout  de l'utilisateur $UtilisateurLogin dans le groupe : $UtilisateurGroupe"

    } elseif ($UtilisateurGroupe -eq "Compta"){

    Add-ADGroupMember -Identity Compta -Members $UtilisateurLogin 
    Write-Output "Ajout  de l'utilisateur $UtilisateurLogin dans le groupe : $UtilisateurGroupe"

    } else {

    Add-ADGroupMember -Identity IT -Members $UtilisateurLogin 
    Write-Output "Ajout  de l'utilisateur $UtilisateurLogin dans le groupe : $UtilisateurGroupe"

    }

}
# Etape 5 Création des dossiers partagés
Write-Host -ForegroundColor Yellow "Etape 5/7 Création des dossiers partagés..."
Write-Host

New-Item -ItemType Directory -Path "C:\" -Name "Direction"
New-SmbShare -Name Direction -Path "C:\Direction" -ReadAccess "Tout le monde"

# Etape 6 Création des paratges
Write-Host -ForegroundColor Yellow "Etape 6/7 Création des partages..."
Write-Host

$SharedFolders = "IT", "Compta", "Direction"
$SharedFolders | ForEach-Object {
    New-Item -ItemType Directory -Path "C:\" -Name $_
    New-SmbShare -Name $_ -Path "C:\$_" -FullAccess  "Tout le monde"
}

# Etape 7 Création des utilisateurs
Write-Host -ForegroundColor Yellow "Etape 7/7 Création des ACL/AGDLP..."
Write-Host


# Parcourir les dossiers et les utilisateurs pour configurer les ACL
# Définir les dossiers et les utilisateurs
$dossiers = "C:\Direction", "C:\Compta", "C:\IT"

# Parcourir les dossiers pour configurer les ACL
foreach ($dossier in $dossiers) {
    # Obtient l'ACL actuelle du dossier
    $acl = Get-Acl $dossier

    # Définit les autorisations pour le groupe "Direction_RW"
    $autorisationDirectionRW = "FullControl"
    $ruleDirectionRW = New-Object System.Security.AccessControl.FileSystemAccessRule("Direction_RW", $autorisationDirectionRW, "ContainerInherit,ObjectInherit", "None", "Allow")

    # Définit les autorisations pour le groupe "Direction_RO"
    $autorisationDirectionRO = "Read"
    $ruleDirectionRO = New-Object System.Security.AccessControl.FileSystemAccessRule("Direction_RO", $autorisationDirectionRO, "ContainerInherit,ObjectInherit", "None", "Allow")

    # Définit les autorisations pour le groupe "Compta_RW"
    $autorisationComptaRW = "FullControl"
    $ruleComptaRW = New-Object System.Security.AccessControl.FileSystemAccessRule("Compta_RW", $autorisationComptaRW, "ContainerInherit,ObjectInherit", "None", "Allow")

    # Définit les autorisations pour le groupe "IT_RW"
    $autorisationITRW = "FullControl"
    $ruleITRW = New-Object System.Security.AccessControl.FileSystemAccessRule("IT_RW", $autorisationITRW, "ContainerInherit,ObjectInherit", "None", "Allow")

    # Définit les autorisations pour le groupe "IT_RO"
    $autorisationITRO = "Read"
    $ruleITRO = New-Object System.Security.AccessControl.FileSystemAccessRule("IT_RO", $autorisationITRO, "ContainerInherit,ObjectInherit", "None", "Allow")

    # Ajoute les règles d'ACL au dossier en fonction des besoins
    if ($dossier -eq "C:\Direction") {
        $acl.SetAccessRuleProtection($true,$false)
        $acl.AddAccessRule($ruleDirectionRW)
    } elseif ($dossier -eq "C:\Compta") {
        $acl.SetAccessRuleProtection($true,$false)
        $acl.AddAccessRule($ruleComptaRW)
        $acl.AddAccessRule($ruleITRO)
        $acl.AddAccessRule($ruleDirectionRO)
    } elseif ($dossier -eq "C:\IT") {
        $acl.SetAccessRuleProtection($true,$false)
        $acl.AddAccessRule($ruleITRW)
        $acl.AddAccessRule($ruleDirectionRO)
    }

    # Applique les modifications d'ACL au dossier
    Set-Acl -Path $dossier -AclObject $acl

    # Affiche les ACL mises à jour
    Get-Acl $dossier | Format-List
}