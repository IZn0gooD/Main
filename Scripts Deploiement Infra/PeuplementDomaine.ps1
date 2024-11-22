# sn,givenName,sAMAccountName,cn,l,department,displayName,name
Import-Module ActiveDirectory

# Récupération du domaine

$ADDomain = Get-ADDomain | Select-Object -Property DistinguishedName,DNSRoot,NetBIOSName

# Importation du fichier csv des users à créer

$ImportCSV = Import-Csv -Delimiter ',' -Path 'C:\Users.csv'

# Création des OU

$ListeOU = $ImportCSV | Select-Object -ExpandProperty department -Unique

$ListeOU | ForEach-Object {
Write-Host "Création de l'OU $PSItem"
$OU = $PSItem
try {New-ADOrganizationalUnit $PSItem -Path $ADDomain.DistinguishedName -ProtectedFromAccidentalDeletion $false} catch {"l'OU $OU Existe Déjà"} 
}

# Création des Users

$Pass = ConvertTo-SecureString -String 'Pa$$w0rd' -AsPlainText -Force

$ImportCSV | ForEach-Object {
$UserName = $PSItem.name
Write-Host "Création de l'utilisateur $UserName"
try {New-ADUser -name $_.name -Path ('OU=' + $_.Department + ',' + $ADDomain.DistinguishedName) -Displayname ($PsItem.displayName) -AccountPassword $Pass -City $PsItem.l -Company $ADDomain.NetBIOSName -Department $PsItem.Department -Enabled $true -SamAccountName $PsItem.sAMAccountName -Surname $PsItem.sn -GivenName $PsItem.givenName -UserPrincipalName ($PsItem.name + '@' + $ADDomain.DNSRoot)}
catch {Write-Host "L'utilisateur $UserName existe déjà"}
}

# Création des Groupes

$ListeOU | ForEach-Object {
    $Group = $PSItem
    Write-Host "Création du groupe $PSItem"
    try {New-ADGroup -Name $PSItem -SamAccountName $PSItem -DisplayName $PSItem -GroupScope Global -Path ('OU=' + $PsItem + ',' + $ADDomain.DistinguishedName)}
    catch {Write-Host "Le groupe $Group existe déjà"}
      
# Ajout des Users dans les Groupes

    $OUCible = $PSItem
    Get-ADUser -Filter * -SearchBase ('OU=' + $PsItem + ',' + $ADDomain.DistinguishedName) | ForEach-Object {Add-ADGroupMember -Identity $OUCible  -Members $_}
}