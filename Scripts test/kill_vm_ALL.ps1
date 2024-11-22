# -----------------------------------------------------------------------------
#                        suppression d'une machine virtuelle
# -----------------------------------------------------------------------------
$exec_deb = Get-Date # on lit l'heure de début
cls
# ---------------------------------------------------------------------
    $root_vm_disk = "c:"
    $vm_dir = "vm"
    $root_vm = $root_vm_disk + "\" + $vm_dir
    $new_vm_subdir = "tempo"
    $new_vm_dir = $root_vm + "\" + $new_vm_subdir 
    $log = $new_vm_dir + "\LogVM_$Date.txt" #Chemin du fichier de log
# ====================================================================================================================

# la cible du kill :-)
# ---------------------------------------------------------------------
$vm_name = "fil02"
$vm_list = (get-vm).name | ?{$_ -match ""}
$vm_list

# -----------------------------------------------------------------------------
#                        suppression de machine virtuelle
# -----------------------------------------------------------------------------



foreach ($vm_name in $vm_list){
"--------------------------------------------------"
"on kill la machine $vm_name"
"--------------------------------------------------"
    $new_vm_path =            $new_vm_dir + "\" + $vm_name   # répertoire temporaire ou est créée la VM
    $DestinationStoragePath = $root_vm    + "\" + $vm_name   # répertoire final ou est stockée la VM
# suppression de la vm
# ---------------------------------------------------------------------
    # arret de la vm
        get-vm -Name  $vm_name -ErrorAction SilentlyContinue | Get-VMHardDiskDrive | Remove-VMHardDiskDrive -ErrorAction SilentlyContinue
        Stop-VM -Name $vm_name -TurnOff -Force -ErrorAction SilentlyContinue | Out-null
    # suppression de la vm
        Remove-VM -Name $vm_name -Force -Passthru -ErrorAction SilentlyContinue | Out-Null
    # suppression du repertoire de la vm
        Remove-Item -Path $new_vm_path            -Force -Recurse -ErrorAction SilentlyContinue | Out-null
        Remove-Item -Path $DestinationStoragePath -Force -Recurse -ErrorAction SilentlyContinue | Out-null

# ---------------------------------------------------------------------
}

get-vm

$exec_fin = Get-Date # on lit l'heure de fin
$exec_duree = ((Get-Date $exec_fin) - (Get-Date $exec_deb)).tostring()

Write-Host -ForegroundColor Green "--------------------------------------------------------------------------------------------"
Write-Host -ForegroundColor Green "----------------------------- durée du script :" $exec_duree
write-Host -ForegroundColor Green "--------------------------------------------------------------------------------------------"

