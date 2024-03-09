function Convert-SpeedTransfer {
    [CmdletBinding()]
    param (
        #[Parameter(Mandatory=$false, ValueFromPipeline=$true, ValueFromPipelineByPropertyName=$true)]
        [double]$GigaBytes = $null,
        
        #[Parameter(Mandatory=$false)]
        [double]$MegaBytes = $null,

        #[Parameter(Mandatory=$false)]
        [double]$KiloBytes = $null
    )

    $DataMb = 0

    switch ($true) {
        { $GigaBytes -ne $null } {
            
            $DataG_B = $DataMb
            $DataG_B = $GigaBytes * 1024 / 8

            if ($GigaBytes -le 0.781) {
                $DataGb = "0.0$([math]::floor($DataG_B))"
            }
            elseif ($GigaBytes -ge 0.782 -and $GigaBytes -lt 8) {
                $DataGb = "0.$([math]::floor($DataG_B))"
            }
            elseif ($GigaBytes -ge 8 -and $GigaBytes -lt 80) {
                $DataGb = "$($DataG_B.ToString().Insert(1, '.'))"
            }
            elseif ($GigaBytes -ge 80) {
                $DataGb = "$($DataG_B.ToString().Insert(2, '.'))"
            }
            else {
                Write-Host "Erreur"
                return
            }

            Write-Host "La capacité de transfert du support est de $($DataG_B) Mb/s"
            Write-Host "La capacité de transfert du support est de $($DataGb) Gb/s"
            
        }
        { $MegaBytes -ne $null } {

            $KBDataKb = $MegaBytes * 8000
            $KBDataMb = $MegaBytes * 8
            $KBDataGb = $MegaBytes / 125 

            Write-Host "La capacité de transfert du support est de $($KBDataGb) Gb/s"
            Write-Host "La capacité de transfert du support est de $($KBDataMb) Mb/s"
            Write-Host "La capacité de transfert du support est de $($KBDataKb) Kb/s"
        }
        { $KiloBytes -ne $null } {

            $DataGb = $KiloBytes / 125000
            $DataKb = $KiloBytes * 8
            $DataMb = $KiloBytes / 125 

            Write-Host "La capacité de transfert du support est de $($DataGb) Gb/s"
            Write-Host "La capacité de transfert du support est de $($DataMb) Mb/s"
            Write-Host "La capacité de transfert du support est de $($DataKb) Kb/s"
        }
        default {
            Write-Host "Aucune valeur valide fournie."
            return
        }
    }
}