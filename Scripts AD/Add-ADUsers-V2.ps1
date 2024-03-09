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

New-ADOrganizationalUnit -Name "Utilisateurs" -Path "DC=test,DC=fr"
New-ADOrganizationalUnit -Name "IT" -Path "OU=Utilisateurs,DC=test,DC=fr"
New-ADOrganizationalUnit -Name "Compta" -Path "OU=Utilisateurs,DC=test,DC=fr"
New-ADOrganizationalUnit -Name "Direction" -Path "OU=Utilisateurs,DC=test,DC=fr"


New-ADGroup -Name "Direction" -GroupCategory Security -GroupScope Global -Path "OU=Direction,OU=Utilisateurs,DC=test,DC=fr"
New-ADGroup -Name "Compta" -GroupCategory Security -GroupScope Global -Path "OU=Compta,OU=Utilisateurs,DC=test,DC=fr"
New-ADGroup -Name "IT" -GroupCategory Security -GroupScope Global -Path "OU=IT,OU=Utilisateurs,DC=test,DC=fr"


$Domain = ""
while ($Domain -eq "") {

            $Domain = Read-Host "Renseigner le Domaine (Ex : test.fr) "

            }

$PWD = ""
while ($PWD -eq "") {

            $PWD = Read-Host "Renseigner le MDP de tout les users " -AsSecureString

            }

Foreach($Utilisateur in $CSVData){

    $UtilisateurPrenom = $Utilisateur.Prenom
    $UtilisateurNom = $Utilisateur.Nom
    $UtilisateurLogin = $Utilisateur.Prenom
    $UtilisateurEmail = "$UtilisateurLogin@"+$Domain
    $UtilisateurMotDePasse = $PWD
    $UtilisateurFonction = $Utilisateur.Fonction
    $UtilisateurGroupe = $Utilisateur.Groupe
    $UtilisateurOU = $Utilisateur.OU

    if (Get-ADUser -Filter {SamAccountName -eq $UtilisateurLogin})
    {
        Write-Warning "L'identifiant $UtilisateurLogin existe déjà dans l'AD"
    }
    else
    {
          
        New-ADUser -Name $UtilisateurPrenom `
                    -DisplayName $UtilisateurPrenom `
                    -GivenName $UtilisateurPrenom `
                    -Surname $UtilisateurNom `
                    -SamAccountName $UtilisateurLogin `
                    -UserPrincipalName "$UtilisateurLogin@test.fr" `
                    -EmailAddress $UtilisateurEmail `
                    -Title $UtilisateurFonction `
                    -Path $UtilisateurOU `
                    -AccountPassword(ConvertTo-SecureString $UtilisateurMotDePasse -AsPlainText -Force) `
                    -ChangePasswordAtLogon $true `
                    -Enabled $true

        Write-Output "Création de l'utilisateur : $UtilisateurLogin ($UtilisateurNom $UtilisateurPrenom)"
    }
}


Foreach($Utilisateur in $CSVData){

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