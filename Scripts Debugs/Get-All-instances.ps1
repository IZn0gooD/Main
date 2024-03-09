<#
Pour voir tout ce qu'il est possible de monitorer :

typeperf -q : ca va lister tout les objects
typeperf "objet" : ca va donner toutes les données de l'object exemple : typeperf "\EsifDeviceInformation(*)\Temperature"

Prennez ensuite les chemins donnés et faites la commande Get-Counter :
Get-Counter "\\LAPTOP-19\EsifDeviceInformation(PCI\VEN_8086&DEV_1903&SUBSYS_08161028&REV_08\3&11583659&0&20_0)\Temperature"

Exemple de si vous voulez isoler la valeur qui vous intéresse :
$networkInterfaceName1 = (Get-Counter "\\LAPTOP-19\Carte réseau(Intel[R] Ethernet Connection [4] I219-LM)\Paquets envoyés/s")  
$results1 = $networkInterfaceName1.CounterSamples[0].CookedValue
#>

# Liste des catégories de PerformanceCounter
$categories = [System.Diagnostics.PerformanceCounterCategory]::GetCategories()
Get-Counter -ListSet *
$paths = (Get-Counter -ListSet TCPv4).paths
Get-Counter -Counter $paths

foreach ($category in $categories) {
    # Nom de la catégorie
    $categoryName = $category.CategoryName
    Write-Host "Catégorie : $categoryName"

    # Liste des compteurs pour cette catégorie
    $counters = $category.GetCounters()
    foreach ($counter in $counters) {
        # Nom du compteur
        $counterName = $counter.CounterName
        Write-Host "  Compteur : $counterName"

        # Liste des instances pour ce compteur
        $instances = $category.GetInstanceNames()
        foreach ($instance in $instances) {
            Write-Host "    Instance : $instance"
        }
    }

    Write-Host ""
}

# Liste des machines disponibles
$machines = [System.Diagnostics.PerformanceCounterCategory]::GetMachineNames()
Write-Host "Machines disponibles :"
foreach ($machine in $machines) {
    Write-Host "  $machine"
}
