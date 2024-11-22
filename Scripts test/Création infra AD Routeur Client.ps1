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

$name1 = ""
while ($name1 -eq "") {
        $name1 = Read-host "Nom de la première VM (DC/DNS/DHCP)"
    }
$name2 = ""
while ($name2 -eq "") {
        $name2 = Read-host "Nom de la deuxième VM (ROUTEUR)"
    }
$name3 = ""
while ($name3 -eq "") {
        $name3 = Read-host "Nom de la troisième VM (CLIENT)"
    }
$gen = 1
$proc = 2
$iso1 = "C:\ISO\Microsoft\Windows_Server_2019.iso"
$iso2 = "C:\ISO\Microsoft\Windows10.iso"

	#Creation VHD
New-VHD -Path  C:\Disques\$name1.vhdx -SizeBytes 32GB -Dynamic
New-VHD -Path  C:\Disques\$name2.vhdx -SizeBytes 32GB -Dynamic
New-VHD -Path  C:\Disques\$name3.vhdx -SizeBytes 32GB -Dynamic

	#Creation VM
New-VM -Name $name1 -MemoryStartupBytes 2GB -Generation $gen -VHDPath D:\Disques\$name1.vhdx 
New-VM -Name $name2 -MemoryStartupBytes 2GB -Generation $gen -VHDPath D:\Disques\$name2.vhdx 
New-VM -Name $name3 -MemoryStartupBytes 2GB -Generation $gen -VHDPath D:\Disques\$name3.vhdx 

    #Memoire
Set-VMMemory -VMName $name1 -DynamicMemory $false
Set-VMMemory -VMName $name2 -DynamicMemory $false
Set-VMMemory -VMName $name3 -DynamicMemory $false
	#Checkpoint
Set-VM -AutomaticCheckpointsEnabled $false -Name $name1 -ProcessorCount $proc
Set-VM -AutomaticCheckpointsEnabled $false -Name $name2 -ProcessorCount $proc
Set-VM -AutomaticCheckpointsEnabled $false -Name $name3 -ProcessorCount $proc

	#Deplacer VM
Move-VMStorage -Name $name1 -DestinationStoragePath C:\Ordinateurs\$name1
Move-VMStorage -Name $name2 -DestinationStoragePath C:\Ordinateurs\$name2
Move-VMStorage -Name $name3 -DestinationStoragePath C:\Ordinateurs\$name3

	#Mettre Lecteur DVD + ISO
Add-VMDvdDrive -VMName $name1 -Path $iso1
Add-VMDvdDrive -VMName $name2 -Path $iso1
Add-VMDvdDrive -VMName $name3 -Path $iso2

	#Imbrication 
Set-VMProcessor -VMName $name1 -ExposeVirtualizationExtensions $true
Set-VMProcessor -VMName $name2 -ExposeVirtualizationExtensions $true
Set-VMProcessor -VMName $name3 -ExposeVirtualizationExtensions $true

	#Demarrer
Start-VM -Name $name1
Start-VM -Name $name2
Start-VM -Name $name3

Write-Host "Connectez vous aux VM et configurer leur installation, Passer à la partie suivante quand vous atterissez sur le bureau"
Pause

$interface = ""
    while ($interface -eq "") {
        $interface = Read-Host "Numéro de l'interface"
    }

    # Demander l'adresse IP
$ipAddress = ""
    while ($ipAddress -eq "") {
        $ipAddress = Read-Host "Adresse IP"
    }

    # Demander le préfixe
$prefix = ""
    while ($prefix -eq "") {
        $prefix = Read-Host "masque"
    }

    # Demander la passerelle par défaut
$defaultGateway = ""
    while ($defaultGateway -eq "") {
        $defaultGateway = Read-Host "Passerelle par défaut"
    }

    # Demander le DNS
$dns = ""
    while ($dns -eq "") {
        $dns = Read-Host "DNS"
    }

Get-VMNetworkAdapter -VMName $name1 | Set-VMNetworkConfiguration -IPAddress $ipAddress -Subnet $prefix -DNSServer $dns -DefaultGateway $defaultGateway

$interface = ""
    while ($interface -eq "") {
        $interface = Read-Host "Numéro de l'interface"
    }

    # Demander l'adresse IP
$ipAddress = ""
    while ($ipAddress -eq "") {
        $ipAddress = Read-Host "Adresse IP"
    }

    # Demander le préfixe
$prefix = ""
    while ($prefix -eq "") {
        $prefix = Read-Host "masque"
    }

    # Demander la passerelle par défaut
$defaultGateway = ""
    while ($defaultGateway -eq "") {
        $defaultGateway = Read-Host "Passerelle par défaut"
    }

    # Demander le DNS
$dns = ""
    while ($dns -eq "") {
        $dns = Read-Host "DNS"
    }

Get-VMNetworkAdapter -VMName $name2 | Set-VMNetworkConfiguration -IPAddress $ipAddress -Subnet $prefix -DNSServer $dns -DefaultGateway $defaultGateway

$interface = ""
    while ($interface -eq "") {
        $interface = Read-Host "Numéro de l'interface"
    }

    # Demander l'adresse IP
$ipAddress = ""
    while ($ipAddress -eq "") {
        $ipAddress = Read-Host "Adresse IP"
    }

    # Demander le préfixe
$prefix = ""
    while ($prefix -eq "") {
        $prefix = Read-Host "masque"
    }

    # Demander la passerelle par défaut
$defaultGateway = ""
    while ($defaultGateway -eq "") {
        $defaultGateway = Read-Host "Passerelle par défaut"
    }

    # Demander le DNS
$dns = ""
    while ($dns -eq "") {
        $dns = Read-Host "DNS"
    }

Get-VMNetworkAdapter -VMName $name3 | Set-VMNetworkConfiguration -IPAddress $ipAddress -Subnet $prefix -DNSServer $dns -DefaultGateway $defaultGateway

$name = ""
    while ($name -eq "") {
        $name = Read-Host "Quel est le nom de la machine 1 ? (DC01, R1, Client1) "
    }
Set-VM -Name $name1 -ComputerName $name

$name = ""
    while ($name -eq "") {
        $name = Read-Host "Quel est le nom de la machine 2 ? (DC01, R1, Client1) "
    }
Set-VM -Name $name2 -ComputerName $name

$name = ""
    while ($name -eq "") {
        $name = Read-Host "Quel est le nom de la machine 3 ? (DC01, R1, Client1) "
    }
Set-VM -Name $name3 -ComputerName $name

# Install AD pour DC01
Invoke-Command -Computer $name1 -ScriptBlock {"C:\Scripts" |  ADinstall.ps1}