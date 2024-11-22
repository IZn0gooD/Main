Stop-Service BITS
Write-Host -ForegroundColor red "Arret du service BITS"
Stop-Service CryptSvc
Write-Host -ForegroundColor red "Arret du service CryptSvc"
Stop-Service wuauserv
Write-Host -ForegroundColor red "Arret du service wuauserv"

rm -Recurse C:\Windows\SoftwareDistribution\*
Write-Host -ForegroundColor Yellow "Supression de C:\Windows\SoftwareDistribution\*"
ls C:\Windows\SoftwareDistribution\
rm -Recurse C:\Windows\System32\catroot2\*
Write-Host -ForegroundColor Yellow "Supression de C:\Windows\System32\catroot2\*"
ls C:\Windows\System32\catroot2\

Start-Service BITS
Write-Host -ForegroundColor Green "Redemarrage du service BITS"
Start-Service CryptSvc
Write-Host -ForegroundColor Green "Redemarrage du service CryptSvc"
Start-Service wuauserv
Write-Host -ForegroundColor Green "Redemarrage du service wuauserv"