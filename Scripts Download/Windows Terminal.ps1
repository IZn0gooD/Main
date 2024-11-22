# Import du module Use Windows Powershell
Import-Module Appx -UseWindowsPowerShell

# CD Download
cd C:\Users\Administrateur\Downloads

# Install Prerequisites
Invoke-WebRequest -Uri https://aka.ms/Microsoft.VCLibs.x64.14.00.Desktop.appx -outfile Microsoft.VCLibs.x86.14.00.Desktop.appx
Add-AppxPackage Microsoft.VCLibs.x86.14.00.Desktop.appx

# Le package et le .json dans Download 
Copy-Item -Path "D:\scripts\Scripts Download\Microsoft.WindowsTerminalPreview_1.19.2831.0_8wekyb3d8bbwe.msixbundle" -Destination C:\Users\Administrateur\Downloads
Copy-Item -Path "D:\scripts\Scripts Download\settings.json" -Destination C:\Users\Administrateur\Downloads

# Install de terminal windows
Add-AppxPackage Microsoft.WindowsTerminalPreview_1.19.2831.0_8wekyb3d8bbwe.msixbundle

# Remplacement du .json
Move-Item -Path .\Downloads\settings.json -Destination C:\Users\Administrateur\AppData\Local\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState

wt -d "D:\scripts\Scripts Download" -p "Windows PowerShell"