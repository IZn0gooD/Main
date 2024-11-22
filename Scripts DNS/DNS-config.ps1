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

$IF0 = Read-Host "Avez-vous besoin de mettre en place un suffixe DNS ou des règles de pare feu ? (oui ou non) : "

if ($IF0 -eq "oui") {
# Pour set le suffixe DNS dans les machines
Write-Host -ForegroundColor Yellow "Mise en place du suffixe DNS"
Write-Host

$SUFDNS = Read-Host "Quel est le suffixe DNS : "
Set-DnsClientGlobalSetting -SuffixSearchList $SUFDNS

Write-Host -ForegroundColor Yellow "Mise en place du suffixe DNS terminée"
Write-Host

# Les règles de Firewall au cas ou 
Write-Host -ForegroundColor Yellow "Mise en place des règles de Firewall"
Write-Host

New-NetFirewallRule -Name "Autoriser Ping V4" -DisplayName "Allow ICMPv4 Echo Request" -Protocol ICMPv4 -IcmpType 8 -Enabled True -Action Allow
New-NetFirewallRule -Name "Autoriser Ping V6" -DisplayName "Allow ICMPv6 Echo Request" -Protocol ICMPv6 -IcmpType 128 -Enabled True -Action Allow

Write-Host -ForegroundColor Yellow "Mise en place des règles de terminée"
Write-Host

} else {

    Write-Host
    $IF1 = Read-Host "Votre machine est elle un serveur DNS ? (oui ou non) : "

    if ($IF1 -eq "oui") {

        Write-Host
        $IF2 = Read-Host "Voulez vous créer une zone secondaire pour un autre server ? (oui ou non) : "

        if ($IF2 -eq "oui") {

            Write-Host -ForegroundColor Yellow "Création d'un NS Record pour le second serveur DNS"
            Write-Host

            $HoteA = Get-DnsServerResourceRecord -ZoneName "aston.local" -RRType A | Where-Object { $_.HostName -like "SRV*" }
            $hostName = $HoteA.HostName
            $RecordData = $HoteA.RecordData
            $IPAddress = $RecordData.IPv4Address
            $IP = $IPAddress.IPAddressToString
            Add-DnsServerResourceRecord -ZoneName "aston.local" -A -Name "@" -IPv4Address $IP
            Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses ("127.0.0.1",$IP)

            $nsRecords = Get-DnsServerResourceRecord -ZoneName $zoneName -RRType NS | Where-Object { $_.HostName -like "@" }
            Add-DnsServerZoneTransferPolicy -ZoneName aston.local -Name $nsRecord.HostName

            Write-Host -ForegroundColor Yellow "Création d'un NS Record pour le second serveur DNS terminée"
            Write-Host

            Write-Host -ForegroundColor Yellow "Création d'une zone secondaire dans le deuxième serveur DNS"
            Write-Host

            $IPAddresses = (Get-NetIPAddress -AddressFamily IPv4).IPAddress
            $IP1 = $IPAddresses[0]
            Invoke-Command -ComputerName "$($hostName).aston.local" -Credential ASTON\Administrateur -ScriptBlock {
            
              Add-DnsServerSecondaryZone -Name "aston.local" -ZoneFile "aston.local.dns" -MasterServers $IP1

                }

            Write-Host -ForegroundColor Yellow "Création d'une zone secondaire dans le deuxième serveur DNS terminée"
            Write-Host

        } else {

            Write-Host
            $IF3 = Read-Host "Votre DNS doit'il contenir une zone de stub ? (oui ou non) : "

            if ($IF3 -eq "oui") {

                # Création d'une nouvelle zone de stub DNS nommée "aston.local"
                Write-Host -ForegroundColor Yellow "Création d'une nouvelle zone de stub"
                Write-Host

                $SDIR = Read-Host "Quel est le nom de la zone de stub ? : "
                $MIP = Read-Host "Quel est l'IP du serveur Master ? : "
                Add-DnsServerStubZone -Name $SDIR -MasterServers $MIP -ZoneFile "$($SDIR).dns"

                Write-Host -ForegroundColor Yellow "Création d'une nouvelle zone de stub terminée"
                Write-Host

                # Actualisation et vérification de la zone de Stub "aston.local"
                Write-Host -ForegroundColor Yellow "Actualisation et vérification de la zone de Stub"
                Write-Host

                Update-DnsServerZone -Name $SDIR
                Get-DnsServerZone -Name $SDIR

                Write-Host -ForegroundColor Yellow "Actualisation et vérification de la zone de Stub terminée"
                Write-Host
            } else {

            # Importer le module DNS
            Import-Module DnsServer

            # Création d'une nouvelle zone de recherche directe DNS nommée "aston.local"
            Write-Host -ForegroundColor Yellow "Création d'une nouvelle zone de recherche directe"
            Write-Host

            $ZDIR = Read-Host "Quel est le nom de la zone de recherche directe ? : "
            Add-DnsServerPrimaryZone -Name $ZDIR -ZoneFile "$($ZDIR).dns" -DynamicUpdate None

            Write-Host -ForegroundColor Yellow "Création d'une nouvelle zone de recherche directe terminée"
            Write-Host

            # Ajout d'un nouvel hôte A à la zone "aston.local"
            Write-Host -ForegroundColor Yellow "Ajout d'un nouvel hôte A"
            Write-Host

            $HA = Read-Host "Quel est le nouvel hôte (nom) : "
            $IP = Read-Host "Quel est le nouvel hôte (IP) : "
            Add-DnsServerResourceRecordA -ZoneName "$ZDIR" -Name $HA -IPv4Address $IP

            Write-Host -ForegroundColor Yellow "Ajout d'un nouvel hôte A terminé"
            Write-Host

            # Vérification que la zone et l'enregistrement ont été créés
            Write-Host -ForegroundColor Yellow "Vérification que la zone et l'enregistrement ont été créés"
            Write-Host

            Get-DnsServerResourceRecord -ZoneName $ZDIR -Name $HA

            Write-Host -ForegroundColor Yellow "Vérification que la zone et l'enregistrement ont été créés terminée"
            Write-Host
            }
        }

    } else {

    Exit
 
    }
}