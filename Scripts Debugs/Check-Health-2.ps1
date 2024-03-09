[System.Diagnostics.PerformanceCounterCategory]::GetCategories()
$computerName = (Get-WmiObject Win32_ComputerSystem).Name

$PE1 = Get-Counter "\Carte réseau(*)\Paquets envoyés/s" 
$carteReseauIntel1 = $PE1.CounterSamples | Where-Object { $_.InstanceName -like '*Ethernet*' -and $_.InstanceName -notlike "*hyper-v*"} | Select-Object -Property Path
$carteReseauIntel1 = $carteReseauIntel1.Path
#$networkInterfaceName1 = (Get-Counter $carteReseauIntel1) 

$PE2 = Get-Counter "\Carte réseau(*)\Paquets reçus/s" 
$carteReseauIntel2 = $PE2.CounterSamples | Where-Object { $_.InstanceName -like '*Ethernet*' -and $_.InstanceName -notlike "*hyper-v*"} | Select-Object -Property Path
$carteReseauIntel2 = $carteReseauIntel2.Path
#$networkInterfaceName2 = (Get-Counter $carteReseauIntel2) 

$pc_prc = new-object System.Diagnostics.PerformanceCounter("Processor", "% Processor Time", "_Total")
$pc_ram = new-object System.Diagnostics.PerformanceCounter("Memory", "Available MBytes")

# Catégorie pour le disque
$pc_disk_transfers_sec = new-object System.Diagnostics.PerformanceCounter("PhysicalDisk", "Disk Transfers/sec", "_Total")
$pc_disk_space_used = new-object System.Diagnostics.PerformanceCounter("LogicalDisk", "% Free Space", "C:")

$boucle = 1

while($boucle -ne 10) {

    $networkInterfaceName1 = (Get-Counter $carteReseauIntel1)  
    $results1 = $networkInterfaceName1.CounterSamples[0].CookedValue
    $networkInterfaceName2 = (Get-Counter $carteReseauIntel2)
    $results2 = $networkInterfaceName2.CounterSamples[0].CookedValue

    $time = Get-Date
    echo ======================
    echo $computerName
    Write-Host $time
    echo ======================
    
    # Processus et mémoire
    $pc_prc_value = $pc_prc.NextValue()
    $pc_ram_value = $pc_ram.NextValue()
    echo " + Processor Load:   $pc_prc_value %"
    echo " + Available Memory: $pc_ram_value MB"

    # Réseau
    $network_bytes_sent = $networkInterfaceName1
    $network_bytes_received = $networkInterfaceName2
    echo " + Network Sent:      $results1  Bytes/sec"
    echo " + Network Received:  $results2  Bytes/sec"

    # Disque
    $disk_transfers_sec = $pc_disk_transfers_sec.NextValue()
    $disk_space_used = 100 - $pc_disk_space_used.NextValue() # % Free Space to Space Used
    echo " + Disk Transfers:    $disk_transfers_sec Transfers/sec"
    echo " + Disk Space Used:   $disk_space_used %"
    echo ""
    sleep 1
    $boucle++
}

#[System.Diagnostics.PerformanceCounter]::CategoryName()