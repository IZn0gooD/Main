function SGA-Long-Mask {

    <#
    .SYNOPSIS
    Test test etst
    #>
    Param(
        [int]$cidr
    )
    # Calcul des bits à décaler pour obtenir le masque de sous-réseau
    $decal = 64 - $cidr
    
    # Initialisation de l'adresse IP de sous-réseau à 0
    [System.Net.IPAddress]$maskr = 0

    # Si le CIDR est plus petit que 33 
    if ($cidr -lt 33) {

        # Si le CIDR n'est pas égal à 0
        if ($cidr -ne 0) {

            # On calcule le sous-réseau en effectuant un décalage vers la gauche (-shl) sur la valeur maximale d'un entier 64 bits
            $maskr = [System.Net.IPAddress]::HostToNetworkOrder([int64]::MaxValue -shl $decal)

            # On écrit le résultat
            Write-Host -NoNewline "| Masque de sous-réseau pour un CIDR de $cidr ➞ㅤ: "
            Write-Output $maskr.IPAddressToString

        } else {

            Write-Host "Erreur, CIDR égal à 0"
        }
     } else {

        Write-Host " Erreur, CIDR supérieur à 32"
    } 

}
SGA-Long-Mask -cidr 18
