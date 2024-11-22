function Get-IPDetails {
    param (
        [string]$ipWithCidr
    )

    # Séparer l'adresse IP et le CIDR
    $ip, $cidr = $ipWithCidr -split '/'

    # Convertir l'adresse IP en objet IPAddress
    [System.Net.IPAddress]$ipAddress = [System.Net.IPAddress]::Parse($ip)

    # Calculer le masque de sous-réseau
    $subnetMask = [System.Net.IPAddress]::HostToNetworkOrder(-bnot ([System.Net.IPAddress]::NetworkToHostOrder(-1) -shl (32 - $cidr)))

    # Calculer l'adresse réseau
    $networkAddress = [System.Net.IPAddress]::HostToNetworkOrder([System.BitConverter]::ToUInt32($ipAddress.GetAddressBytes(), 0) -band $subnetMask)

    # Calculer l'adresse de broadcast
    $broadcastAddress = $networkAddress -bor -bnot $subnetMask

    # Calculer le nombre d'hôtes par réseau
    $hostsPerNet = [System.Math]::Pow(2, (32 - $cidr))

    # Afficher les résultats
    Write-Host "Address:   $ip $($ipAddress.ToString())"
    Write-Host "Netmask:   $([System.Net.IPAddress]::TryParse($subnetMask).ToString()) = $cidr $($subnetMask)"
    Write-Host "Wildcard:  $([System.Net.IPAddress]::TryParse(-bnot $subnetMask).ToString())"
    Write-Host "Network:   $([System.Net.IPAddress]::HostToNetworkOrder($networkAddress).ToString())/$cidr $($networkAddress)"
    Write-Host "HostMin:   $([System.Net.IPAddress]::HostToNetworkOrder($networkAddress + 1).ToString())"
    Write-Host "HostMax:   $([System.Net.IPAddress]::HostToNetworkOrder($broadcastAddress - 1).ToString())"
    Write-Host "Broadcast: $([System.Net.IPAddress]::HostToNetworkOrder($broadcastAddress).ToString())"
    Write-Host "Hosts/Net: $hostsPerNet"
    
    # Déterminer la classe de l'adresse IP
    if ($ipAddress.Address -band 0x80000000 -eq 0) {
        Write-Host "Class A, Public Internet"
    } elseif ($ipAddress.Address -band 0xC0000000 -eq 0x80000000) {
        Write-Host "Class B, Public Internet"
    } elseif ($ipAddress.Address -band 0xE0000000 -eq 0xC0000000) {
        Write-Host "Class C, Public Internet"
    } elseif ($ipAddress.Address -band 0xF0000000 -eq 0xE0000000) {
        Write-Host "Class D, Multicast"
    } elseif ($ipAddress.Address -band 0xF8000000 -eq 0xF0000000) {
        Write-Host "Class E, Reserved"
    } else {
        Write-Host "Class Unknown"
    }
}

# Exemple d'utilisation
Get-IPDetails "192.168.0.1/24"
