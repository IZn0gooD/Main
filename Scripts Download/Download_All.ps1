#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ChoixPrint = "▌ Saisissez 1, 2, 3, 4, 5, 6 ou 7" 
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

Write-Host
Write-Host "▌ㅤ" -NoNewline 
Write-Host -ForegroundColor Yellow "Quel Logiciel souhaitez vous installer ? " -NoNewline
Write-Host "ㅤ↩" 
Write-Host
write-host "   ◈ 1 ) ➞ㅤ Google Chrome"
write-host "   ◈ 2 ) ➞ㅤ Dell Command Update"
write-host "   ◈ 3 ) ➞ㅤ Notepadd ++"
write-host "   ◈ 4 ) ➞ㅤ 7zip"
write-host "   ◈ 5 ) ➞ㅤ VLC"
write-host "   ◈ 6 ) ➞ㅤ Wireshark"
write-host "   ◈ 7 ) ➞ㅤ TeamViewver"
write-host "   ◈ 8 ) ➞ㅤ Assistant de mise à jour Windows"
Write-Host
$Choix = Read-Host $ChoixPrint

if ( $Choix -eq "1"  ) {
    
    # Téléchargement de Chrome
    Write-Host
    Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de Google Chrome"
    Write-Host

    # VAR / URL
    $url = "https://dl.google.com/chrome/install/latest/chrome_installer.exe"
    $output = "C:\Temp\chrome_installer.exe"

    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host -ForegroundColor Green ' OK'
    Write-Host

    Start-Process -FilePath $output 

    } elseif ( $Choix -eq "2"  ) {

        # Téléchargement de DCU
        Write-Host
        Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de Dell Command Update"
        Write-Host

        # VAR / URL
        $output = "C:\Temp\Dell-Update-Windows-Universal-Application.EXE"
        $url = "https://www.dell.com/support/home/fr-fr/drivers/DriversDetails?driverId=534C4"
        $pageContent = Invoke-WebRequest -Uri $url

        # Extraire les balises <a> (href) contenant "dl.dell.com"
        $links = $pageContent.ParsedHtml.getElementsByTagName("a") | Where-Object { $_.href -like "*dl.dell.com*" }

        # Stocker les liens dans une variable
        $dlDellLinks = $links.href

        # Display la variable pour être sur d'avoir récup le bon lien 
        Write-Host -ForegroundColor cyan "$dlDellLinks"
        
        # Download le lien
        Invoke-WebRequest -Uri $dlDellLinks -OutFile $output
        Write-Host -ForegroundColor Green ' OK'
        Write-Host

        Start-Process -FilePath $output

    } elseif ( $Choix -eq "3" ) {
            
            # Téléchargement de Notepadd++
            Write-Host
            Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de Notepadd++"
            Write-Host

            # VAR / URL
            $output = "C:\Temp\Notepadd++.exe"
            $url = "https://notepad-plus-plus.org/downloads/v8.5.8/"
            $content = Invoke-WebRequest -Uri $url -UseBasicParsing

            # Récupère le contenu de la balise href
            $href = $content.links | Where-Object { $_.href -eq "https://github.com/notepad-plus-plus/notepad-plus-plus/releases/download/v8.5.8/npp.8.5.8.Installer.x64.exe" }

            # Affiche le contenu de la balise href
            Write-Host $href.href[0]

            #Download le lien
            Invoke-WebRequest -Uri $href -OutFile $output
            Write-Host -ForegroundColor Green ' OK'
            Write-Host

            Start-Process -FilePath $output

        } elseif ( $Choix -eq "4" ) {

                # Téléchargement de la dernière version de 7zip
                Write-Host
                Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de 7zip"
                Write-Host

                # VAR / URL
                $url = "https://www.7-zip.org/download.html"
                $output = Invoke-WebRequest -Uri $url -UseBasicParsing

                # Récupération de l'URL de téléchargement de la dernière version stable de 7zip
                $downloadUrl = $output.Links | Where-Object {$_.innerHTML -match "Download"} | Select-Object -ExpandProperty href
                $download1 = @($downloadUrl)

                # Download le lien
                Invoke-WebRequest -Uri "https://www.7-zip.org/$($download1[0])" -OutFile "C:\Temp\7zip.exe"
                Write-Host -ForegroundColor Green ' OK'
                Write-Host

                Start-Process -FilePath "C:\Temp\7zip.exe"

            } elseif ( $Choix -eq "5" ) {

                    # Téléchargement de VLC
                    Write-Host
                    Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de VLC"
                    Write-Host

                    # Download le lien
                    Invoke-WebRequest -Uri "https://ftp.free.org/mirrors/videolan/vlc/3.0.20/win64/vlc-3.0.20-win64.exe" -OutFile "C:\Temp\VLC.exe"
                    Write-Host -ForegroundColor Green ' OK'
                    Write-Host

                    Start-Process -FilePath "C:\Temp\VLC.exe"

                } elseif ( $Choix -eq "6" ) {

                        # Téléchargement de Wireshark
                        Write-Host
                        Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de Wireshark"
                        Write-Host

                        # VAR / URL
                        $url = "https://www.wireshark.org/download.html"
                        $output = Invoke-WebRequest -Uri $url

                        # Récupération de l'URL de téléchargement de la dernière version stable de Wireshark
                        $downloadUrl = $output.Links | Where-Object {$_.outerText -match "Windows x64 Installer"} | Select-Object -ExpandProperty href
                        $download1 = @($downloadUrl) 

                        # Download le lien
                        Invoke-WebRequest -Uri $download1[0] -OutFile "C:\Temp\Wireshark-x64.exe"
                        Write-Host -ForegroundColor Green ' OK'
                        Write-Host

                        Start-Process -FilePath "C:\Temp\Wireshark-x64.exe"

                    } elseif ( $Choix -eq "7" ) {

                            # Téléchargement de TeamViewer
                            Write-Host
                            Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de TeamViewer" -NoNewline
                            

                            # VAR / URL
                            $url = "https://download.teamviewer.com/download/TeamViewerQS_x64.exe"

                            # Download le lien
                            Invoke-WebRequest -Uri $url -OutFile "C:\Temp\TeamViewerQS_x64.exe"
                            Write-Host -ForegroundColor Green ' OK'
                            Write-Host

                            Start-Process -FilePath "C:\Temp\TeamViewerQS_x64.exe"
                        } elseif ( $Choix -eq "8" ) {

                                # Téléchargement de assistant de mise à jour Windows 10
                                Write-Host
                                Write-Host -ForegroundColor Yellow "▌⇥ㅤInstallation de assistant de mise à jour Windows 10" -NoNewline
                                
    
                                # VAR / URL
                                $url = "https://www.microsoft.com/fr-fr/software-download/windows10"
                                $output = Invoke-WebRequest -Uri $url
                                $downloadUrl = $output.Links | Where-Object {$_.innerText -match "Mettre Ã  jour maintenant"} | Select-Object -ExpandProperty href

                                # Download le lien
                                Invoke-WebRequest -Uri $downloadUrl -OutFile "C:\Temp\Assistant-MAJ-W10.exe"
                                Write-Host -ForegroundColor Green ' OK'
                                Write-Host

                                Start-Process -FilePath "C:\Temp\Wireshark-x64.exe"
                            }
write-host "$([char]0x20D2)"

Write-Color test -Color Black
Write-Color test -Color Blue
Write-Color test -Color Cyan
Write-Color test -Color DarkBlue
Write-Color test -Color DarkGray
Write-Color test -Color DarkGreen
Write-Color test -Color DarkMagenta
Write-Color test -Color DarkRed
Write-Color test -Color DarkYellow
Write-Color test -Color Gray
Write-Color test -Color Green
Write-Color test -Color Magenta
Write-Color test -Color Red
Write-Color test -Color White
Write-Color test -Color Yellow
Write-Color "test" , "test" -Color Black,Red

#Start-BitsTransfer -Source "https://download.teamviewer.com/download/TeamViewerQS_x64.exe" -Destination "C:\Temp\TeamViewerQS_x64.exe"