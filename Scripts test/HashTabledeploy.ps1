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

Write-Host -ForegroundColor Yellow -BackgroundColor Black "Déploiement de VMs"
Write-Host

[hashtable]$Table = @{
Name = "CLI10", "CLI11","SRV10","SRV11";
Type = "C", "C", "S", "S";
RAM = 1024MB, 1024MB, 1024MB, 1500MB; 
Proc = 1, 1, 2, 1;
Master = "MASTER2019G2.vhdx", "MASTERW11G2.vhdx" 
}

Write-Host -ForegroundColor Yellow "Création des vhd des"$Table.Name
Write-Host

New-VHD -Path "C:\hv\vhds\$($Table.Name[0]).vhdx" -ParentPath "C:\hv\masters\$($Table.Master[1])" -Differencing
New-VHD -Path "C:\hv\vhds\$($Table.Name[1]).vhdx" -ParentPath "C:\hv\masters\$($Table.Master[1])" -Differencing
New-VHD -Path "C:\hv\vhds\$($Table.Name[2]).vhdx" -ParentPath "C:\hv\masters\$($Table.Master[0])" -Differencing
New-VHD -Path "C:\hv\vhds\$($Table.Name[3]).vhdx" -ParentPath "C:\hv\masters\$($Table.Master[0])" -Differencing

Write-Host -ForegroundColor Yellow "Création des vhd terminé"
Write-Host

Write-Host -ForegroundColor Yellow "Création des VMs "$Table.Name
Write-Host

New-VM -Name $Table.Name[0] -MemoryStartupBytes $Table.RAM[0] -VHDPath "C:\hv\vhds\$($Table.Name[0]).vhdx" -SwitchName Externe -Generation 2
New-VM -Name $Table.Name[1] -MemoryStartupBytes $Table.RAM[1] -VHDPath "C:\hv\vhds\$($Table.Name[1]).vhdx" -SwitchName Externe -Generation 2
New-VM -Name $Table.Name[2] -MemoryStartupBytes $Table.RAM[2] -VHDPath "C:\hv\vhds\$($Table.Name[2]).vhdx" -SwitchName Externe -Generation 2
New-VM -Name $Table.Name[3] -MemoryStartupBytes $Table.RAM[3] -VHDPath "C:\hv\vhds\$($Table.Name[3]).vhdx" -SwitchName Externe -Generation 2

Write-Host -ForegroundColor Yellow "Création des VMs terminée"
Write-Host

Write-Host -ForegroundColor Yellow "Configuration des VM "$Table.Name
Write-Host

Set-VM -Name $Table.Name[0] -ProcessorCount $Table.Proc[0] -DynamicMemory -CheckpointType ProductionOnly
Set-VM -Name $Table.Name[1] -ProcessorCount $Table.Proc[1] -DynamicMemory -CheckpointType ProductionOnly
Set-VM -Name $Table.Name[2] -ProcessorCount $Table.Proc[2] -DynamicMemory -CheckpointType ProductionOnly
Set-VM -Name $Table.Name[3] -ProcessorCount $Table.Proc[3] -DynamicMemory -CheckpointType ProductionOnly

Write-Host -ForegroundColor Yellow "Configuration des VMs terminée"
Write-Host

Write-Host -ForegroundColor Yellow "Démarrage des VMs "$Table.Name
Write-Host

Start-VM -Name $Table.Name[0]
Start-VM -Name $Table.Name[1]
Start-VM -Name $Table.Name[2]
Start-VM -Name $Table.Name[3]

Write-Host -ForegroundColor Yellow "Démarrage des VMs terminé"
Write-Host