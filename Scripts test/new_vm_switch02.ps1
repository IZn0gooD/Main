cls
 Set-ExecutionPolicy bypass -Force 
$vm_name_list = (Get-VM).Name
$vm_switch_name = "private01"
$SwitchType = "Private"

# on deconnecte les vm et on supprime le switch
if((get-vm).count -ne 0){
Disconnect-VMNetworkAdapter -VMName $vm_name_list
}

if((Get-VMSwitch -Name $vm_switch_name -ErrorAction SilentlyContinue).count -ne 0){
Get-VMSwitch -Name $vm_switch_name | Remove-VMSwitch -Confirm:$false -Force -ErrorAction SilentlyContinue
}

# on crée un nouveau switch privé
New-VMSwitch -SwitchType $SwitchType -Name $vm_switch_name | Out-Null

# connection des VM au switch
if((get-vm).count -ne 0){
Connect-VMNetworkAdapter    -VMName $vm_name_list -SwitchName $vm_switch_name -ErrorAction SilentlyContinue
#Get-VM -name $vm_name_list | Get-VMNetworkAdapter | ft VMName,SwitchName 
}

write-host "Le switch privé utilisé sera : " -NoNewline
(Get-VMSwitch -SwitchType $SwitchType).name




