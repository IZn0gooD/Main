# Script de déploiement de VMs à partir d'un fichier csv
#

#Récupération des infos de l'hôte HV

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

$TestP = Test-Path -Path C:\HV 

if ($TestP -eq $false) {

    write-host 
    write-host -ForegroundColor Red "Le Dossier C:\HV n'existe pas, merci de le créer lui ainsi que tout ces sous dossiers."

}

$HVHost = Get-VMHost
$HV_VHD_Path = $HVHost.VirtualHardDiskPath
$HV_path = (get-item $HV_VHD_Path).parent.FullName

# Import du fichier csv

$VMs = Import-Csv -Delimiter "," -Path "$HV_path\vms.csv"
$Switchs = Import-Csv -Delimiter "," -Path "$HV_path\switchs.csv"
$Nics = Import-Csv -Delimiter "," -Path "$HV_path\nics.csv"


# Création des switchs

$Switchs | ForEach-Object {
    $SwitchName = $PSItem.SwitchName
    $SwitchType = $PSItem.SwitchType
    
    New-VMSwitch -Name $SwitchName -SwitchType $SwitchType
    
}

# Création des vhds

$VMs | ForEach-Object {
    $VMName = $PSItem.VMName
    $RAM = $PSItem.RAM
    $RAMInt64 = [int64]$RAM.Replace('MB','') * 1MB
    $ProcNb = $PSItem.CPU
    $OS = $PSItem.OS
    $NicNb = $PSItem.NicNb

    Switch ($OS)
    {
        'C'
        {
            $Master = "$HV_path\masters\MASTERW11G2.vhdx"
        }

       'S'
        {
            $Master = "$HV_path\masters\MASTER2019G2.vhdx"
        }
    }

#Création des VHDs
    
    Write-Host -ForegroundColor Yellow "Création du vhd de la VM $VMName"
    Write-Host
    
    New-VHD -Path "$HV_VHD_Path\$VMName.vhdx" -ParentPath $Master -Differencing

   Write-Host
    Write-Host -ForegroundColor Yellow "Création du vhd de la VM $VMName terminée"
    Write-Host

#Création des VMs

   Write-Host -ForegroundColor Yellow "Création de la VM $VMName"
    Write-Host
    
    New-VM -Name $VMName -MemoryStartupBytes $RAMInt64 -VHDPath "$HV_VHD_Path\$VMName.vhdx" -SwitchName Externe -Generation 2

   Write-Host
    Write-Host -ForegroundColor Yellow "Création de la VM $VMName terminée"
    Write-Host

#Configuration des VMs

   Write-Host -ForegroundColor Yellow "Configuration de la VM $VMName"
    Write-Host
    
    Set-VM -Name $VMName -DynamicMemory -ProcessorCount $ProcNb -CheckpointType ProductionOnly
    Get-VM $VMName | Enable-VMIntegrationService -name "Interface de services d’invité"

   Write-Host
    Write-Host -ForegroundColor Yellow "Configuration de la VM $VMName terminée"
    Write-Host

#Ajout des Nics des VMs

    Write-Host -ForegroundColor Yellow "Ajout des cartes réseau de la VM $VMName"
    Write-Host
    
    if ($NicNb -gt 1) {
        for ($i=1; $i -lt $NicNb; $i++)
        {
            Add-VMNetworkAdapter -VMName $VMName
        }
        
    }

    Write-Host
    Write-Host -ForegroundColor Yellow "Ajout des cartes réseau de la VM $VMName terminée"
    Write-Host

#Affectation des Nics des VMs aux switchs

   Write-Host -ForegroundColor Yellow "Affectation des cartes réseau aux switchs de la VM $VMName"
    Write-Host
    
    $VMNics = $Nics | Where-Object {$PsItem.VMName -eq $VMName}
    
    $HVVMNics = Get-VMNetworkAdapter -VMName $VMName
       
    for ($i=0; $i -lt $NicNb; $i++)
    {
        Connect-VMNetworkAdapter -VMNetworkAdapter $HVVMNics[$i] -SwitchName $VMNics[$i].SwitchName
    }
    
    Write-Host
    Write-Host -ForegroundColor Yellow "Affectation des cartes réseau aux switchs de la VM $VMName terminée"
    Write-Host

    

   
#Démarrage des VMs

   Write-Host -ForegroundColor Yellow "Démarrage de la VM $VMName"
    Write-Host
    
    Start-VM $VMName

   Write-Host
    Write-Host -ForegroundColor Yellow "Démarrage de la VM $VMName terminée"
    Write-Host
    

}

Read-host "Appuyer sur une touche lorsque les VMs seront démarrées..."

# Paramétrage de l'authentification pour accéder aux VMs en Powershell Direct

    $UserCreds = ".\localadmin"                                                                                                                                                                                      
    $Passcreds = ConvertTo-SecureString -string 'Pa$$w0rd' -AsPlainText -Force                                                                                                                                       
    $LocalCreds = New-Object -TypeName System.Management.Automation.PSCredential -ArgumentList $UserCreds,$Passcreds                                                                                                 

$VMs | ForEach-Object {
    $VMName = $PSItem.VMName
    $NicNb = $PSItem.NicNb


    $VMNics = $Nics | Where-Object {$PsItem.VMName -eq $VMName}
    $HVVMNics = Get-VMNetworkAdapter -VMName $VMName

    for ($i=0; $i -lt $NicNb; $i++)
    {
        $HVVMMacAddress = (Get-VMNetworkAdapter -VMName $VMName)[$i].MacAddress
        $SwitchName = (Get-VMNetworkAdapter -VMName $VMName)[$i].SwitchName
        $VMMACList = Invoke-Command -VMName $VMName -ScriptBlock {Get-NetAdapter} -Credential $LocalCreds | Select-Object -Property Name,MACAddress

        for ($j=0; $j -lt $NicNb; $j++)
        {
            $VMMACAddress = $VMMACList[$j].MacAddress.replace('-','')
            $NicName = $VMMACList[$j].Name

            if ($HVVMMacAddress -eq $VMMACAddress) {
                 
                Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $SwitchName, $NicName -ScriptBlock { Param($SwitchName, $NicName) Rename-NetAdapter -Name $NicName -NewName $SwitchName}
            }
        }
    }
 

# Renommage des cartes réseau des VMs

}

#Configuration IP des VMs


# Read-host "Appuyer sur une touche lorsque les VMs seront démarrées..."

    
$VMs | ForEach-Object {
    $VMName = $PSItem.VMName
    $NicNb = $PSItem.NicNb

    $VMNics = $Nics | Where-Object {$PsItem.VMName -eq $VMName}
    $HVVMNics = Get-VMNetworkAdapter -VMName $VMName
       
    for ($i=0; $i -lt $NicNb; $i++)
    {
        Connect-VMNetworkAdapter -VMNetworkAdapter $HVVMNics[$i] -SwitchName $VMNics[$i].SwitchName
    }

    $VMNics | ForEach-Object {
        $IP = $_.IP
        $GWY = $_.GWY
        $DNS = $_.DNS
        $SwitchName = $_.SwitchName
        
        Write-Host -ForegroundColor Yellow "Configuration IP de la VM $VMName - Carte $SwitchName"
        Write-Host
        
        if ([string]::IsNullOrEmpty($GWY)) {

        Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $IP, $GWY, $SwitchName -ScriptBlock { Param($IP, $GWY, $SwitchName) New-NetIPAddress -InterfaceAlias $SwitchName -AddressFamily IPv4 -IPAddress $IP -PrefixLength 24}
        
        }
        
        else {

        Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $IP, $GWY, $SwitchName -ScriptBlock { Param($IP, $GWY, $SwitchName) New-NetIPAddress -InterfaceAlias $SwitchName -AddressFamily IPv4 -IPAddress $IP -PrefixLength 24 -DefaultGateway $GWY}

        }

        if (-not([string]::IsNullOrEmpty($DNS))) {

        Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $DNS, $SwitchName -ScriptBlock { Param($DNS, $SwitchName) Set-DnsClientServerAddress -InterfaceAlias $SwitchName -ServerAddresses $DNS}
        
        }
        
        Write-Host
        Write-Host -ForegroundColor Yellow "Configuration IP de la VM $VMName - Carte $SwitchName terminée"
        Write-Host
        
    }

#Renommage des VMs

    Write-Host -ForegroundColor Yellow "Renommage de la VM $VMName"
    Write-Host
    
    Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $VMName -ScriptBlock {Param($VMName) rename-computer -NewName $VMName -Restart -force}
    
    Write-Host
    Write-Host -ForegroundColor Yellow "Renommage de la VM de la VM $VMName terminée"
    Write-Host
    }

    Read-host "Appuyer sur une touche lorsque les VMs seront démarrées..."

# Installation des rôles

$VMs | ForEach-Object {
    $VMName = $_.VmName
    $VMRole = $_.Role
    
    If ($VMRole -eq "D") {
    
        Invoke-Command -VMName $VMName -Credential $LocalCreds -ScriptBlock {Install-WindowsFeature -name AD-Domain-Services -IncludeAllSubFeature -IncludeManagementTools -Restart}
        $DomainName = Read-Host -Prompt "Veuillez saisir le nom DNS de la forêt à créer, svp ..."
        $NetbiosDomainName = $DomainName.split(".")[0].ToUpper()
        #
        # Script Windows PowerShell pour le déploiement d’AD DS
        #

        Invoke-Command -VMName $VMName -Credential $LocalCreds -ArgumentList $DomainName, $NetbiosDomainName, $Passcreds -ScriptBlock {Param($DomainName, $NetbiosDomainName, $Passcreds) Import-Module ADDSDeployment ; Install-ADDSForest `
        -CreateDnsDelegation:$false `
        -DatabasePath "C:\Windows\NTDS" `
        -DomainMode "WinThreshold" `
        -DomainName $DomainName `
        -DomainNetbiosName $NetbiosDomainName `
        -ForestMode "WinThreshold" `
        -InstallDns:$true `
        -LogPath "C:\Windows\NTDS" `
        -NoRebootOnCompletion:$false `
        -SysvolPath "C:\Windows\SYSVOL" `
        -Force:$true `
        -SafeModeAdministratorPassword:$Passcreds}

    }    

    If ($VMRole -eq "R") {
    
        Invoke-Command -VMName $VMName -Credential $LocalCreds -ScriptBlock {Install-WindowsFeature -name Routing -IncludeAllSubFeature -IncludeManagementTools -Restart}
        Invoke-Command -VMName $VMName -Credential $LocalCreds -ScriptBlock {Install-RemoteAccess -VpnType RoutingOnly -Passthru}
        Invoke-Command -VMName $VMName -Credential $LocalCreds -ScriptBlock {cmd.exe /c "netsh routing ip rip install" ; cmd.exe /c "netsh routing ip rip add interface WAN"}
 
    }    

}

    Read-host "Appuyer sur une touche lorsque les VMs seront démarrées..."

$VMs | ForEach-Object {
    $VMName = $_.VmName
    $VMRole = $_.Role
    
    If ($VMRole -eq "D") {
    
        Copy-VMFile -Name $VMName -SourcePath "C:\hv\PeuplementDomaine.ps1" -DestinationPath "C:\" -CreateFullPath -FileSource Host -Force
        Copy-VMFile -Name $VMName -SourcePath "C:\hv\users.csv" -DestinationPath "C:\" -CreateFullPath -FileSource Host -Force
        Invoke-Command -VMName $VMName -Credential $LocalCreds -ScriptBlock {c:\PeuplementDomaine.ps1}

    }    

}