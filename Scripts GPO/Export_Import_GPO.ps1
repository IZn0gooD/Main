#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ChoixPrint = "▌ Saisissez 1, 2, 3, 4, 5, 6 ou 7" 
$tmp = Test-Path -Path "C:\Temp" 
Install-Module PSWriteColor
Import-Module PSWriteColor
[Console]::OutputEncoding = [System.Text.Encoding]::GetEncoding(1252)
$ScriptName = $MyInvocation.MyCommand.Name

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
    write-host -ForegroundColor Red "LE SCRIPT DOIT ETRE LANCÉ DANS UN POWERSHELL AVEC LES DROITS ADMINISTRATEURS"
    exit
}
else {
    write-host -NoNewline '▌ㅤScript lancé dans un shell Administrateurs ➞  '
    Write-Host -ForegroundColor Green 'OK' 
}

if ( $tmp -eq $false)
{
    New-Item -ItemType Directory -Path "C:\Temp"
    write-host -NoNewline '▌ㅤDossier "Temp" déjà crée ➞  '
    Write-Host -ForegroundColor Red 'NO'

} elseif ( $tmp -eq $true ) {

    write-host -NoNewline '▌ㅤDossier "Temp" déjà crée ➞  '
    Write-Host -ForegroundColor Green 'OK'
}

$OUPath = "DC=test,DC=fr"
$OUNames = @("Sales", "Development", "IT", "Research", "Managers", "Marketing")
$groupList = @("RW", "RO")

#Importation du module GPO 
Import-Module GroupPolicy

# Lister les GPO 
get-gpo -all | Filter DisplayName,Id,GpoStatus

# Faire une backup des GPO 
Backup-GPO -Name "Default Domain Policy" -Path C:\Temp

# Pour importer une GPO
# Créer une Nouvelle GPO
New-GPO "Test"

# On importe une GPO sauvegardé 
Import-GPO -BackupGpoName "Nom de la GPO sauvegardé" -TargetName "Test" -Path C:\Temp

# 
Remove-GPO "template"

<#
#Importation du module GPO 
Import-Module grouppolicy

# Faire une backup des GPO 
Backup-GPO -All -Path C:\Temp

# Exportation de toutes les GPO dans un CSV 
$ListGPO = Get-GPO -all | Select-Object DisplayName 
$ListGPO | Export-Csv -Path C:\Temp\ListGPO.csv -NoTypeInformation -Encoding UTF8

# On créer une GPO pour chaque Ligne dans le CSV
$CSVS = Import-Csv -Path "C:\Temp\ListGPO.csv" -encoding UTF8
foreach ($CSV in $CSVS)            
{            
	$GPO = $CSV.DisplayName
    New-GPO "$GPO"          
}

# On importe les GPO du CSV dans les GPO créer sur le DC 
$Path = "C:\Temp"
$CSVS = Import-Csv -Path "C:\Temp\ListGPO.csv" -encoding UTF8
foreach ($CSV in $CSVS)            
{            
	$GPO = $CSV.DisplayName
    Import-GPO -BackupGpoName "$GPO" -TargetName "$GPO" -Path "$Path"
}
#>