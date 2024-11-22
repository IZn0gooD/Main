#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ChoixPrint = "▌ Saisissez 1, 2, 3, 4 ..." 
$tmp = Test-Path -Path "C:\Temp" 
Install-Module PSWriteColor
Import-Module PSWriteColor
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

   ______________________________
 / \                             \.
|   |                            |.
 \_ |   ◈ 1 ) ➞ SFC /SCANNOW    |.
    |                            |.
    |   ◈ 2 ) ➞ CHKDSK          |.
    |                            |.
    |   ◈ 3 ) ➞ DISM Analyse    |.
    |                            |.
    |   ◈ 4 ) ➞ DISM Réparation |.
    |                            |.
    |   ◈ 5 ) ➞ Check santé DSK |.
    |                            |.
    |   ◈ 6 ) ➞ Répar Vol C:    |.
    |                            |.
    |   ◈ 7 ) ➞                 |.
    |                            |.
    |   ◈ 8 ) ➞                 |.
    |   _________________________|___
    |  /                            /.
    \_/____________________________/.

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

Write-Host
Write-Host "▌ㅤ" -NoNewline 
Write-Host -ForegroundColor Yellow "Quel commande de Debug souhaitez vous utiliser ? " -NoNewline
Write-Host "ㅤ↩" 
Write-Host
write-host $text3 
Write-Host
$Choix = Read-Host $ChoixPrint

if ($Choix -eq "1" ) {
  
  write-host
  Write-Color Démarrage de la commande SFC /SCANNOW -Color Yellow
  sfc /scannow 

  } elseif ( $Choix -eq "2" ) {

    write-host
    Write-Color Démarrage de la commande CHKDSK -Color Yellow
    chkdsk /F /R c:

      } elseif ( $Choix -eq "3") {
        
        write-host
        Write-Color Démarrage de la commande Dism /Online /Cleanup-image /ScanHealth -Color Yellow
        Dism /Online /Cleanup-image /ScanHealth

        write-host
        Write-Color Démarrage de la commande Dism /Online /Cleanup-image /CheckHealth -Color Yellow
        Start-Sleep -Seconds 3
        Dism /Online /Cleanup-image /CheckHealth

        } elseif ( $Choix -eq "4" ) {
          
          write-host
          Write-Color Démarrage de la commande Dism /Online /CleanupImage /RestoreHealth -Color Yellow
          Dism /Online /Cleanup-image /RestoreHealth

          } elseif ( $Choix -eq "5" ) {
          
            write-host
            Write-Color "Démarrage de la commande Get-PhysicalDisk  Get-StorageReliabilityCounter" -Color Yellow
            Get-PhysicalDisk | Get-StorageReliabilityCounter

            }  elseif ( $Choix -eq "6" ) {
          
               write-host
               Write-Color "Démarrage de la commande Repair-Volume -DriveLetter C -OfflineScanAndFix" -Color Yellow
               Repair-Volume -DriveLetter C -OfflineScanAndFix

      }