function Convert-Throughput {
   <#
    .Synopsis
    Permet de convertir un débit de données de Bytes en bits. De préférence en GigaBytes mais vous pouvez aussi le faire en MegaBytes et autres. Il faut juste diviser par 10/100/1000 la valeur en fonction des Gigabytes.
    Exemple : Si vous souhaitez calculer combien font 500 MégaBytes, vous devrez rentrer 0.500 après le paramètres "-GigaBytes". 0.0500 si c'est des KiloBytes


    .Description
    Calcul du débit avec la formule (débit) * 1024 /8 

    .Parameter GigaBytes            
    
    
    .Example
    Convert-Throughput 8
    .Example
    Convert-Throughput -GigaBytes 10
    .Link
    Convert-Throughput

#>
    [CmdletBinding()]
    param (
        [Parameter(Mandatory=$true, ValueFromPipeline=$true, ValueFromPipelineByPropertyName=$true)]
        [double]$GigaBytes
    )

    $DataMb = $GigaBytes * 1024 / 8

    if ($GigaBytes -le 0.781) {
        $DataGb = "0.0$([math]::floor($DataMb))"
    }
    elseif ($GigaBytes -ge 0.782 -and $GigaBytes -lt 8) {
        $DataGb = "0.$([math]::floor($DataMb))"
    }
    elseif ($GigaBytes -ge 8 -and $GigaBytes -lt 80) {
        $DataGb = "$($DataMb.ToString().Insert(1, '.'))"
    }
    elseif ($GigaBytes -ge 80) {
        $DataGb = "$($DataMb.ToString().Insert(2, '.'))"
    }
    else {
        Write-Host "Erreur"
        return
    }

    Write-Host "La capacité de transfert du support est de $($DataMb) Mb/s"
    Write-Host "La capacité de transfert du support est de $($DataGb) Gb/s"
}

