$UserCreds = "Administrateur"
$Password = ConvertTo-SecureString -String "Pa$$w0rd" -AsPlainText -Force
$Credential = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $UserCreds, $Password

# Rechercher tout les modules qui contiennent les mots "Hyper-V"
$test = Get-WindowsOptionalFeature -Online | Where-Object {$_.FeatureName -like "*Hyper-V*"} | Select-Object -Property FeatureName | Select-String -Pattern "Microsoft-Hyper-V" | foreach {$_.Matches.Value} | Get-Unique
#$test2 = $test[1] | Select-Object -Property FeatureName | Select-String -Pattern "Microsoft-Hyper-V" | foreach {$_.Matches.Value}

# Activer le module Hyper-V
Enable-WindowsOptionalFeature -FeatureName Microsoft-Hyper-V -Online

# Créer une nouvelle VM, l'allumer et l'éteindre
New-VM -NewVHDPath C:\HV\vhdx\vm01.vhdx -Name VM01 -Generation 2 -NewVHDSizeBytes 30GB -Path C:\HV\vms 
Start-VM VM01
Stop-VM VM01

# Ajouter un lecteur DVD avec l'iso
Add-VMDvdDrive -VMName VM01 -Path C:\HV\iso\wsrv19.iso 

# Créer un nouveau switch "Privé"
New-VMSwitch -Name Privé -SwitchType Private

# Supprimer les cartes réseaux de la VM
Remove-VMNetworkAdapter -VMName VM01  

# Créer une carte réseau nommé "Privé"
Add-VMNetworkAdapter -VMName VM01 -Name Privé

# Ajouté à la carte réseau le switch "Privé"
Get-VM "VM01" | Get-VMNetworkAdapter | Connect-VMNetworkAdapter -SwitchName "Privé"

# Set de l'adresse IP / Rename de la carte réseau / Rename de la VM
Invoke-Command -VMName VM01 -Credential $Credential -ScriptBlock {

Get-NetAdapter | New-NetIPAddress -AddressFamily IPv4 -IPAddress 192.168.10.10 -PrefixLength 24 -DefaultGateway 192.168.10.1 
Get-NetAdapter | Set-DnsClientServerAddress -ServerAddresses 192.168.10.10
Get-NetAdapter | Rename-NetAdapter -NewName "Privé"
Rename-Computer -NewName "DC01" -LocalCredential $Credential -Restart
}

# Installation du Rôle ADDS et promotion en contrôleur de domaine
Invoke-Command -VMName VM01 -Credential $Credential -ScriptBlock {

Get-WindowsFeature

Install-WindowsFeature -Name AD-Domain-Services -IncludeManagementTools

Import-Module ADDSDeployment
Install-ADDSForest `
    -DomainName "aston.local" `
    -DomainNetbiosName "ASTON" `
    -DomainMode "WinThreshold" `
    -ForestMode "WinThreshold" `
    -InstallDns:$true `
    -SafeModeAdministratorPassword $Password `
    -Force:$true `
    -NoRebootOnCompletion:$false `
    -CreateDnsDelegation:$false `
    -DatabasePath "C:\Windows\NTDS" `
    -LogPath "C:\Windows\NTDS" `
    -SysvolPath "C:\Windows\SYSVOL"

}