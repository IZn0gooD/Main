# création d'une liste de VM avec disque de differenciation
# ----------------------------------------------------------

# by Christophe LECAT @mail : tophegun@gmail.com
# on se place dans le repertoire contenant les scripts et les fichiers de donnees
Set-Location $PSScriptRoot

#.\is_bases.ps1             # psedit .\is_bases.ps1
#.\new_vm_switch02.ps1      # psedit .\new_vm_switch02.ps1
$SwitchName = Get-VMSwitch -SwitchType Private

$fichier = "new_vm_list.csv"      # psedit .\$fichier
$importCSV = Get-Content $fichier | Where-Object { !$_.StartsWith("#") } | ConvertFrom-Csv -Delimiter ";"

cls
$importCSV | Out-Host

$exec_deb = Get-Date # on lit l'heure de début (chronometre)

foreach($vm in $importCSV)
{
$vm_name = $vm.vm_name
Write-Host "traitement de la VM : " $vm_name
write-host "--------------------------------------------------------------------------------------------"
$ParentPath = "C:\vm\bases\" + $vm.base

if(get-vm $vm_name -ErrorAction:SilentlyContinue){"Is VM : $vm_name"} 
else 
	{
	write-host "nom  : $vm_name"
	write-host "base : $ParentPath"
	write-host "switch : "$SwitchName[0].Name
	write-host "--------------------------------------------------------------------------------------------"

    # 1 - créé un disque dur virtuel de differenciation
    new-vhd -Path C:\vm\tempo\diff_$vm_name.vhdx -ParentPath $ParentPath | Out-Null

    # 2 - créé une machine virtuelle (G2 1024-dyn vhdx-->diff_nom.vhdx)
    New-VM -Name $vm_name -SwitchName $SwitchName[0].Name  -MemoryStartupBytes 1gb -Generation 2 -VHDPath C:\vm\tempo\diff_$vm_name.vhdx -Path C:\vm\tempo
        # 2.1 - configurer la mémoire dynamique
        Set-VMMemory -VMName $vm_name -DynamicMemory $true 
        # 2.2 : désactiver les points de controles auto (windows 10)
        if((Get-WmiObject -class Win32_OperatingSystem).Caption -match "Windows 10"){
        Set-VM -AutomaticCheckpointsEnabled $false -Name $vm_name}

    # 3 - déplacer la VM
    Move-VMStorage -Name $vm_name -DestinationStoragePath c:\vm\$vm_name

    # 4 - démarrer la VM
    start-vm -Name $vm_name
	}
}

$exec_fin = Get-Date # on lit l'heure de fin
$exec_duree = ((Get-Date $exec_fin) - (Get-Date $exec_deb)).tostring()

Write-Host -ForegroundColor Green "-création de VM-----------------------------------------------------------------------------"
Write-Host -ForegroundColor Green "----------------------------- durée du script :" $exec_duree
write-Host -ForegroundColor Green "--------------------------------------------------------------------------------------------"