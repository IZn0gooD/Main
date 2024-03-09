#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ChoixPrint = "▌ Saisissez 1, 2, 3 ou 4" 
$tmp = Test-Path -Path "C:\Temp" 
Install-Module PSWriteColor
Import-Module PSWriteColor
Install-Module -Name Terminal-Icons -Repository PSGallery
Import-Module -Name Terminal-Icons
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
║                                   $ScriptName                                       ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
"@

$text3 = @"

 _____     ______     ______     __  __     ______        __    __     ______     __   __     __  __   
/\  __-.  /\  ___\   /\  == \   /\ \/\ \   /\  ___\      /\ "-./  \   /\  ___\   /\ "-.\ \   /\ \/\ \
\ \ \/\ \ \ \  __\   \ \  __<   \ \ \_\ \  \ \ \__ \     \ \ \-./\ \  \ \  __\   \ \ \-.  \  \ \ \_\ \ 
 \ \____-  \ \_____\  \ \_____\  \ \_____\  \ \_____\     \ \_\ \ \_\  \ \_____\  \ \_\\"\_\  \ \_____\  
  \/____/   \/_____/   \/_____/   \/_____/   \/_____/      \/_/  \/_/   \/_____/   \/_/ \/_/   \/_____/   


   ___________________________________________________________________________________
 / \                                                                                  \.
|   |                                                                                 |.
 \_ |   ◈ 1 ) ➞ Apps                    ◈ 11 ) ➞ Power                              |.
    |                                                                                 |.
    |   ◈ 2 ) ➞ Audio                   ◈ 12 ) ➞ Printer                            |.
    |                                                                                 |.
    |   ◈ 3 ) ➞ BITS                    ◈ 13 ) ➞ Search                             |.
    |                                                                                 |.
    |   ◈ 4 ) ➞ Bluetooth               ◈ 14 ) ➞ Speech                             |.
    |                                                                                 |.
    |   ◈ 5 ) ➞ DeviceCenter            ◈ 15 ) ➞ Video                              |.
    |                                                                                 |.
    |   ◈ 6 ) ➞ IEBrowseWeb             ◈ 16 ) ➞ WindowsMediaPlayerConfiguration    |.
    |                                                                                 |.
    |   ◈ 7 ) ➞ IESecurity              ◈ 17 ) ➞ WindowsMediaPlayerMediaLibrary     |.
    |                                                                                 |.
    |   ◈ 8 ) ➞ Keyboard                ◈ 18 ) ➞ WindowsMediaPlayerPlayDVD          |.
    |                                                                                 |.
    |   ◈ 9 ) ➞ Networking              ◈ 19 ) ➞ WindowsUpdate                      |.
    |                                                                                 |.
    |   ◈ 10 ) ➞ PCW                    ◈ 20 ) ➞ Device (spécial)                   |.
    |   ______________________________________________________________________________|___
    |  /                                                                                 /.
    \_/_________________________________________________________________________________/.
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

write-host $text3 
Write-Host
Write-Host "▌ㅤ" -NoNewline 
Write-Host -ForegroundColor Yellow "Quel commande de Debug souhaitez vous utiliser ? " -NoNewline
Write-Host "ㅤ↩" 
Write-Host "▌ㅤ"

$choix = $null

while ($choix -eq $null) {
    $saisie = Read-Host $ChoixPrint

    if ($saisie -match '^(?:[1-9]|1\d|20)$') {
        $choix = $saisie
    } else {
        Write-Host "La valeur entrée n'est pas valide. Veuillez réessayer."
    }
}

# Exécute l'instruction switch en fonction de la valeur entrée
switch ($choix) {
    '1' {
        Write-Output "▌ㅤVérification des Apps"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Apps”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '2' {
        Write-Output "▌ㅤVérification de l'Audio "
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Audio”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas2
    }
    '3' {
        Write-Output "▌ㅤVérification des BITS"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\BITS”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas3
    }
    '4' {
        Write-Output "▌ㅤVérification du Bluetooth"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Bluetooth”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas3
    }
    '5' {
        Write-Output "▌ㅤVérification du DeviceCenter"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\DeviceCenter”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '6' {
        Write-Output "▌ㅤVérification de IEBrowserWeb"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\IEBrowseWeb”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '7' {
        Write-Output "▌ㅤVérification de IESecurity"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\IESecurity”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '8' {
        Write-Output "▌ㅤVérification du Clavier"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Keyboard”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '9' {
        Write-Output "▌ㅤVérification du Réseau"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Networking”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '10' {
        Write-Output "▌ㅤVérification de PCW"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\PCW”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '11' {
        Write-Output "▌ㅤVérification de Power"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Power”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '12' {
        Write-Output "▌ㅤVérification de l'imprimante"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Printer”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '13' {
        Write-Output "▌ㅤVérification de la recherche"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Search”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '14' {
        Write-Output "▌ㅤVérification des Speech"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Speech”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '15' {
        Write-Output "▌ㅤVérification de la Vidéo"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Video”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '16' {
        Write-Output "▌ㅤVérification de WindowsMediaPlayerConfiguration"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\WindowsMediaPlayerConfiguration”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '17' {
        Write-Output "▌ㅤVérification de WindowsMediaPlayerMediaLibrary"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\WindowsMediaPlayerMediaLibrary”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '18' {
        Write-Output "▌ㅤVérification de WindowsMediaPlayerPlayDVD"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\WindowsMediaPlayerPlayDVD”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '19' {
        Write-Output "▌ㅤVérification de Windows Update"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\WindowsUpdate”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    '20' {
        Write-Output "▌ㅤVérification des Devices"
        Get-PnpDevice | Select-Object -Property Name, DeviceID
        Write-Host "▌ㅤSéléctionner l'ID (à droite) du device (à gauche) que vous souhaitez vérifiez"
        $Diag = Get-TroubleshootingPack -Path “C:\Windows\Diagnostics\System\Device”
        $Diag | Invoke-TroubleshootingPack
        # Autres commandes pour cas1
    }
    default {
        Write-Output "Commande par défaut si aucun cas ne correspond"
        # Autres commandes par défaut
    }
}

https://learn.microsoft.com/en-us/powershell/module/troubleshootingpack/invoke-troubleshootingpack?view=windowsserver2022-ps
https://techgenix.com/powershell-troubleshooting-packs/