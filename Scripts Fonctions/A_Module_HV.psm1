# Module DOS 030 

Function SGA-IPValide
{
   <#
    .Synopsis
    Vérification du format d'un IP V4.

    .Description
    Vérification des 4 octets d'une IPV4 et déterminer si elle peut-être
    utilisée ou non 

    .Parameter AdressIP             
    
    
    .Example
    SGA-IPValide '192.168.10.25'
    .Example
    SGA-IPValide -IPValide '192.168.10.25'
    .Link
    SGA-IPValide

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$AdressIP)

    if ($AdressIP -match "^([1-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){2}(\.([1-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5]))$")
    {
        return $True
    }
    else
    {
        return $false
    }

}

Function SGA-IPValide2
{
   <#
    .Synopsis
    Vérification du format d'un IP V4.

    .Description
    Vérification des 4 octets d'une IPV4 et déterminer si elle peut-être
    utilisée ou non 

    .Parameter AdressIP             
    
    
    .Example
    SGA-IPValide2 '192.168.10.25'
    .Example
    SGA-IPValide2 -IPValide '192.168.10.25'
    .Link
    SGA-IPValide2

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$AdressIP)

    $IPSplit = $AdressIP.Split('.')
    
    if ($IPSplit.Length -ne 4)
    {
        Write-Host '4 octets nécessaire'
        return $false
    }
    $bit0 = $IPSplit[0].ToInt32($bit0)
    $bit1 = $IPSplit[1].ToInt32($bit1)
    $bit2 = $IPSplit[2].ToInt32($bit2)
    $bit3 = $IPSplit[3].ToInt32($bit3)
    
    if (($bit0 -ge 1) -and ($bit0 -le 255))
    {
        Write-Host $True
    }
    else
    {
        Write-Host "attention $bit0 doivent etre compris entre 1 et 255"
        return $false
    }
    
    if (($bit1 -ge 0) -and ($bit1 -le 255))
    {
        Write-Host $True
    }
    else
    {
        Write-Host "attention $bit1 doivent etre compris entre 0 et 255"
        return $false
    }

    if (($bit2 -ge 0) -and ($bit2 -le 255))
    {
        Write-Host $True
    }
    else
    {
        Write-Host "attention $bit2 doivent etre compris entre 0 et 255"
        return $false
    }

    if (($bit3 -ge 1) -and ($bit3 -le 255))
    {
        Write-Host $True
    }
    else
    {
        Write-Host "attention $bit3 doivent etre compris entre 1 et 255"
        return $false
    }
    return $True
}


Function SGA-FreeSpaceDyn
{
    <#
    .Synopsis
    Espace disponible sur le disque.

    .Description
    Renvoi l'espace disponible sur le disque passé en paramètre
    retour : Taille en Go de l'espace disponible.
    
    .Parameter Lettre             
    Lettre du lecteur testé. C: par défaut
    Parametre dynamique de la liste des lecteur disponible
    
    .Example
    SGA-FreeSpaceDyn 

    .Example
    SGA-FreeSpaceDyn -Lettre C:

    .Link
    

    #>

    [CmdletBinding()]
    Param()
    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'Lettre'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $false
            $ParameterAttribute.Position = 1

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            $arrSet = Get-WmiObject Win32_LogicalDisk| Where Size -ne $Null | Select-Object -ExpandProperty DeviceID
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }

    begin 
    {
        # Bind the parameter to a friendly variable
        $Lettre = $PsBoundParameters[$ParameterName]
    } 
 
    process 
    {  
        
        $Drives=Get-WmiObject Win32_LogicalDisk| Where Size -ne $Null
        Foreach($Drive in $Drives)
        {
            If($Drive.DeviceID -eq $Lettre)
            {
                $res=[Math]::Round($Drive.FreeSpace/1GB,2)
                Write-Verbose "Le disque existe"
                Return $res

            }
        }
        Write-Verbose "Le disque est introuvable"
        return 0
    }
} 

Function SGA-FreeSpace
{
   <#
    .Synopsis
    Indique le taux d'espace libre.

    .Description
    La fonction SGA-FreeSpace indique le taux d'espace libre     
    calculé à partir de l'appel à WMI. 

    .Parameter Lettre             
    Entrez la lettre de lecteur telle que C:.
    
    .Example
    SGA-FreeSpace 'C:'
    .Example
    SGA-FreeSpace -Lettre 'C:'
    .Link
    SGA-FreeSpace

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Lettre)

    $FreeSpace = Get-WmiObject Win32_LogicalDisk `
    |Where-Object DeviceID -eq $Lettre
    
    if ($FreeSpace)
    {
        $res=[Math]::Round($FreeSpace.FreeSpace/1GB,2)
        Write-Verbose "Le disque existe"
        Return $res
    }
    else
    {
        Write-Verbose "Le disque est introuvable"
        return 0
    }
}

# Fonctions utilisateurs
Function SGA-TestUser
{
   <#
    .Synopsis
    Test l'existence d'un Utilisateur.

    .Description
    La fonction SGA-TestUser indique si l'utilisateur 
    passé en paramètre existe ou non dans la base AD
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Example
    SGA-TestUser 'Stephane'
    .Example
    SGA-TestUser -User 'Stephane'
    .Link
    SGA-TestUser

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User)
    
    try
    {
        $tSGA = Get-ADUser -Identity $User -errorAction Stop
        Write-Verbose "L'utilisateur $User existe"
        return $true
    }
    catch
    {
        Write-Verbose "L'utilisateur $User n'existe pas"
        return $false
    }
}

Function SGA-CreatUser
{
   <#
    .Synopsis
    Creation d'un Utilisateur.

    .Description
    La fonction SGA-CreatUser Créé l'utilisateur 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Example
    SGA-CreatUser 'Stephane'
    .Example
    SGA-CreatUser -User 'Stephane'
    .Link
    SGA-CreatUser

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User)

    if (!(SGA-TestUser -user $User -Verbose:$false))
    {
        New-ADUser -Name $User
        Set-ADUser -Identity $User -Surname $User 
        Write-Verbose "L'utilisateur $User a été créé"  
        return $true
    }
    else
    {
        Write-Verbose "L'utilisateur $User existe déjà (Création impossible)"  
        return $false
    }
}

Function SGA-CreatUserTry
{
   <#
    .Synopsis
    Creation d'un Utilisateur.

    .Description
    La fonction SGA-CreatUser2 Créé l'utilisateur 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Example
    SGA-CreatUser2 'Stephane'
    .Example
    SGA-CreatUser2 -User 'Stephane'
    .Link
    SGA-CreatUser2

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User)

    try
    {
        New-ADUser -Name $User -ErrorAction Stop
        Set-ADUser -Identity $User -Surname $User 
        Write-Verbose "L'utilisateur $User a été créé"  
        return $true
    }
    catch
    {
        Write-Verbose "L'utilisateur $User existe déjà (Création impossible) TRY"  
        return $false
    }
}

Function SGA-UserPW
{
   <#
    .Synopsis
    Réinitialisation du mot de passe d'un Utilisateur.

    .Description
    La fonction SGA-UserPW Modifie le mot de passe de 
    l'utilisateur passé en paramètre Uniquement si il
    existe dans la base AD
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Parameter Password             
    Entrez le mot de passe de l'utilisateur tel que 
    Pa$$w0rd (Attention, le mot de passe doit être
    conforme au contrainte de l'AD)

    .Example
    SGA-UserPW 'Stephane' 'Pa$$w0rd'
    .Example
    SGA-UserPW -User 'Stephane' -Password 'Pa$$w0rd'
    .Link
    SGA-UserPW

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User,
    [Parameter(Mandatory=$True)][string]$Password)
    
    if (SGA-TestUser -user $User -Verbose:$false)
    {
        if (Get-ADUser -filter * | Where-Object name -eq $User | Where-Object enabled -eq $false)
        {
            $Secur = ConvertTo-SecureString -String $Password -AsPlainText -Force
            try
            {
                Set-ADAccountPassword -Identity $User -NewPassword $Secur -Reset -ErrorAction Stop
                Write-Verbose "Le mot de passe de l'utilisateur $User est modifié"  
                return $true
            }
            catch
            {
                Write-Verbose "Le mot de passe de l'utilisateur $User n'est pas modifié (complexité)"  
                return $false
            }
        }
        else
        {
            Write-Verbose "Le compte de l'utilisateur $User est activé"  
            return $false

        }
    }
    else
    {
        Write-Verbose "L'utilisateur $User n'existe pas"  
        return $false
    }
}

Function SGA-UserActive
{
   <#
    .Synopsis
    Activation / désactivation d'un Utilisateur.

    .Description
    La fonction SGA-UserActive Modifie l'activation de 
    l'utilisateur passé en paramètre Uniquement si il
    existe dans la base AD
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Parameter DesActive             
    Ajouter ke switch pour désactiver le compte utilisateur

    .Example
    SGA-UserActive 'Stephane' 
    .Example
    SGA-UserActive -User 'Stephane' -DesActive
    .Link
    SGA-UserActive

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User,
    [Switch]$DesActive)
    
    if (SGA-TestUser -user $User -Verbose:$false)
    {
        if (!($DesActive))
        {
            try
            {
                Enable-ADAccount -Identity $User -ErrorAction Stop
                Write-Verbose "L'utilisateur $User a été activé"  
                return $true
            }
            catch
            {
                Write-Verbose "L'utilisateur $User n'a pas été activé (complexité)"  
                return $false
            }
        }
        else
        {
            Disable-ADAccount -Identity $User
            Write-Verbose "L'utilisateur $User a été désactivé"  
            return $true
        }
    }
    else
    {
        Write-Verbose "l'utilisateur $User n'existe pas"  
        return $false
    }
}

Function SGA-DeleteUser
{
   <#
    .Synopsis
    Suppression d'un Utilisateur.(désactivation)

    .Description
    La fonction SGA-DeleteUser supprime l'utilisateur 
    passé en paramètre Uniquement si il existe 
    dans la base AD. Le switch -Force supprime définitivement 
    l'utilisateur
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane

    .Parameter Force
    Switch qui supprime définitivement le compte utilisateur
    
    .Example
    SGA-DeleteUser 'Stephane'
    .Example
    SGA-DeleteUser -User 'Stephane' -Force
    .Link
    SGA-DeleteUser

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User,
    [switch]$Force)
    
    if (SGA-TestUser -user $User -Verbose:$false)
    {
        if ($Force)
        {
            Remove-ADUser -Identity $User 
            Write-Verbose "L'utilisateur $User a été supprimé définitivement" 
            return $true
        }
        else
        {
            Disable-ADAccount -Identity $User 
            Write-Verbose "L'utilisateur $User a été supprimé (désactivé)" 
            return $true

        }
    }
    else
    {
        Write-Verbose "L'utilisateur $User n'existe pas"  
        return $false
    }
}



# Fonctions Groupes
Function SGA-TestGroup
{
   <#
    .Synopsis
    Test l'existence d'un Groupe.

    .Description
    La fonction SGA-TestGroup indique si le groupe 
    passé en paramètre existe ou non dans la base AD
    
    .Parameter Group             
    Entrez le nom du groupe tel que Informatique
    
    .Example
    SGA-TestGroup 'Informatique'
    .Example
    SGA-TestGroup -Group 'Informatique'
    .Link
    SGA-TestGroup

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Group)
    
    try 
    {
        $tSGA = Get-ADGroup -Identity $Group -ErrorAction Stop
        Write-Verbose "Le groupe $Group existe"
        return $true
    }
    catch
    {
        Write-Verbose "Le groupe $Group n'existe pas"
        return $false
    }
}

Function SGA-CreatGroup
{
   <#
    .Synopsis
    Creation d'un Utilisateur.

    .Description
    La fonction SGA-CreatGroup Créé le groupe 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter Group             
    Entrez le nom du groupe tel que Informatique
    
    .Parameter Scope
    Etendue du groupe parmis les valeurs suivantes "DomainLocal","Global","Universal"
    Par défaut, le groupe sera "Global"

    .Example
    SGA-CreatGroup 'Informatique'
    .Example
    SGA-CreatGroup -Group 'Informatique' -Scope Global
    .Link
    SGA-CreatGroup

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Group,
    [validateset("DomainLocal","Global","Universal")][string]$Scope="Global")
    
    if (SGA-TestGroup -Group $Group -Verbose:$false)
    {
        Write-Verbose "Le groupe $Group existe déjà"  
        return $false
    }
    else
    {
        New-ADGroup -Name $Group -GroupScope $Scope
        Write-Verbose "Le groupe $Group a été créé"  
        return $true
    }
}

Function SGA-CreatGroupTry
{
   <#
    .Synopsis
    Creation d'un groupe.

    .Description
    La fonction SGA-CreatGroupTry Créé le groupe 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter Group             
    Entrez le nom du groupe tel que Informatique
    
    .Parameter Scope
    Etendue du groupe parmis les valeurs suivantes "DomainLocal","Global","Universal"
    Par défaut, le groupe sera "Global"

    .Example
    SGA-CreatGroupTry 'Informatique'
    .Example
    SGA-CreatGroupTry -Group 'Informatique'
    .Link
    SGA-CreatGroupTry

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Group,
    [validateset("DomainLocal","Global","Universal")][string]$Scope="Global")
    
    try
    {
        New-ADGroup -Name $Group -GroupScope $Scope -ErrorAction Stop
        Write-Verbose "Le groupe $Group a été créé"  
        return $true
    }
    catch
    {
        Write-Verbose "Le groupe $Group existe déjà (Création impossible) TRY"  
        return $false
    }
}

Function SGA-DeleteGroup
{
   <#
    .Synopsis
    Suppresssion d'un Groupe.

    .Description
    La fonction SGA-DeleteGroup Supprime le groupe 
    passé en paramètre Uniquement si il existe 
    dans la base AD
    
    .Parameter Group             
    Entrez le nom du groupe tel que Informatique
    
    .Example
    SGA-DeleteGroup 'Informatique'
    .Example
    SGA-DeleteGroup -Group 'Informatique'
    .Link
    SGA-DeleteGroup

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Group)
    
    if (SGA-TestGroup -Group $Group -Verbose:$false)
    {
        Remove-ADGroup -Identity $Group
        Write-Verbose "Le groupe $Group a été supprimé" 
        return $true
    }
    else
    {
        Write-Verbose "Le groupe $Group n'existe pas"  
        return $false
    }
}

# Fonctions Unités d'organisation
Function SGA-TestUO
{
   <#
    .Synopsis
    Test l'existence d'une unité d'organisation.

    .Description
    La fonction SGA-TestUO indique si l'Unité d'organisation 
    passé en paramètre existe ou non dans la base AD
    
    .Parameter UO             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-TestUO 'UO_LYON'
    .Example
    SGA-TestUO -Group 'UO_LYON'
    .Link
    SGA-TestUO

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$UO)
    
    if (Get-ADOrganizationalUnit -Filter * | Where-Object name -eq $UO)
    {
        Write-Verbose "L'unité d'organisation $UO existe"
        return $true
    }
    else
    {
        Write-Verbose "L'unité d'organisation $UO n'existe pas"
        return $false
    }
}

Function SGA-CreatUO
{
   <#
    .Synopsis
    Creation d'une Unité d'organisation.

    .Description
    La fonction SGA-CreatUO Créé l'unité d'organisation 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter UO             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-CreatUO 'UO_LYON'
    .Example
    SGA-CreatUO -UO 'UO_LYON'
    .Link
    SGA-CreatUO

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$UO)
    
    if (SGA-TestUO -UO $UO -Verbose:$false)
    {
        Write-Verbose "L'unité d'organisation $UO existe déjà"  
        return $false
    }
    else
    {
        Write-Verbose "L'unité d'organisation $UO a été créé"  
        New-ADOrganizationalUnit -Name $UO
        return $true
    }
}

Function SGA-CreatUOTry
{
   <#
    .Synopsis
    Creation d'une Unité d'organisation.

    .Description
    La fonction SGA-CreatUOTry Créé l'unité d'organisation 
    passé en paramètre Uniquement si il n'existe pas
    dans la base AD
    
    .Parameter UO             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-CreatUOTry 'UO_LYON'
    .Example
    SGA-CreatUOTry -UO 'UO_LYON'
    .Link
    SGA-CreatUOTry

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$UO)
    
    Try
    {
        New-ADOrganizationalUnit -Name $UO -ErrorAction Stop
        Write-Verbose "L'unité d'organisation $UO a été créé"  
        return $true
    }
    catch
    {
        Write-Verbose "L'unité d'organisation $UO existe déjà (Création impossible) TRY"  
        return $false
    }
}

Function SGA-DeleteUO
{
   <#
    .Synopsis
    Suppresssion d'une unité d'organisation.

    .Description
    La fonction SGA-DeleteUO Supprime l'unité d'organisation 
    passé en paramètre Uniquement si il existe 
    dans la base AD
    
    .Parameter UO             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-DeleteUO 'UO_LYON'
    .Example
    SGA-DeleteUO -UO 'UO_LYON'
    .Link
    SGA-DeleteUO

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$UO,
    [switch]$Force)
    
    if (SGA-TestUO -UO $UO -Verbose:$false)
    {
        if (SGA-TestContenuUO -UO $UO -Verbose:$false)
        {
            Write-Verbose "L'Unité d'organisation $UO ne peut pas être suprimée (non vide)"
            return $false
        }
        else
        {
            $Unite = Get-ADOrganizationalUnit -Filter * | Where-Object name -eq $UO
            if ($Force)
            {
                Set-ADOrganizationalUnit -Identity $Unite -ProtectedFromAccidentalDeletion $false
            }
            try
            {
                Remove-ADOrganizationalUnit -Identity $Unite -Confirm:$false -err
                Write-Verbose "L'Unité d'organisation $UO est supprimée"
                return $true
            }
            catch
            {
                Write-Verbose "L'Unité d'organisation $UO n'est pas supprimée (protection)"
                return $false
            }
        }
    }
    else
    {
        Write-Verbose "L'unité d'organisation $UO n'existe pas"  
        return $false
    }
}

Function SGA-TestContenuUO
{
   <#
    .Synopsis
    Test l'existence d'objets dans une unité d'organisation.

    .Description
    La fonction SGA-TestContenuUO indique si l'Unité d'organisation 
    passé en paramètre contient des objets AD ou non dans la base AD
    
    .Parameter UO             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-TestContenuUO 'UO_LYON'
    .Example
    SGA-TestContenuUO -Group 'UO_LYON'
    .Link
    SGA-TestContenuUO

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$UO)
    
    if (SGA-TestUO -UO $UO -Verbose:$false)
    {
        $Search = Get-ADOrganizationalUnit -Filter * | Where-Object name -eq $UO
        Write-Verbose $Search
        if (Get-ADObject -Filter * -SearchBase $Search | Where-Object name -ne $UO)
        {
            Write-Verbose "L'Unité d'organisation $UO contient des objets"
            return $true
        }
        else
        {
            Write-Verbose "L'Unité d'organisation $UO ne contient pas d'objet"
            return $false
        }
    }
    else
    {
        Write-Verbose "L'Unité d'organisation $UO n'existe pas"
        return $false
    }
}

# Objets dans l'AD
Function SGA-TestObjet
{
   <#
    .Synopsis
    Test l'existence d'un objet AD.

    .Description
    La fonction SGA-TestObjet indique si l'objet 
    passé en paramètre existe ou non dans la base AD
    
    .Parameter Objet             
    Entrez le nom de l'unité d'organisation tel que UO_LYON
    
    .Example
    SGA-TestObjet 'UO_LYON'
    .Example
    SGA-TestObjet -Objet 'UO_LYON'
    .Link
    SGA-TestObjet

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Objet)
    
    if (Get-ADObject -Filter * | Where-Object name -eq $Objet)
    {
        Write-Verbose "L'objet $Objet existe"
        return $true
    }
    else
    {
        Write-Verbose "L'objet $Objet n'existe pas"
        return $false
    }
}

Function SGA-AddGroupMembre
{
   <#
    .Synopsis
    Ajoute un objet en tant que membre du groupe 

    .Description
    La fonction SGA-AddGroupMembre Ajoute un objet 
    comme membre du groupe passé 
    en paramètre Uniquement si les deux paramètres 
    existent dans la base AD
    
    .Parameter Objet             
    Entrez le nom de l'utilisateur ou du groupe 
    tel que Stephane ou Compta

    .Parameter Group             
    Entrez le nom du groupe 
    tel que Informatique
    
    .Example
    SGA-AddGroupMembre 'Stephane' 'Informatique'
    .Example
    SGA-AddGroupMembre -Objet 'Stephane' -Group 'Informatique'
    .Link
    SGA-AddGroupMembre

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Objet,
    [Parameter(Mandatory=$True)][string]$Group)
    
    if (SGA-TestObjet -Objet $Objet -Verbose:$false)
    {
        if (SGA-TestGroup -Group $Group -Verbose:$false)
        {
            $Member = Get-ADObject -Filter * | Where-Object name -eq $Objet
            $Identity = Get-ADGroup -Filter * | Where-Object Name -eq $Group
            Add-ADGroupMember -Identity $identity -Members $Member
            Write-Verbose "L'objet $Objet est membre du groupe $Group"
            return $True
        }
        Write-Verbose "Le groupe $Group n'existe pas"
        return $false
    }
    else
    {
        Write-Verbose "L'objet $Objet n'existe pas"
        return $false
    }
}

Function SGA-MoveObjet-UO
{
   <#
    .Synopsis
    Déplace un objet (utilisateur ou groupe) a une unité 
    d'organisation.

    .Description
    La fonction SGA-MoveObjet-UO Déplace l'objet utilisateur 
    ou groupe vers l'unité d'organisation passé 
    en paramètre Uniquement si les deux paramètres 
    existent dans la base AD
    
    .Parameter Objet             
    Entrez le nom de l'objet à déplacer 
    tel que Stephane

    .Parameter UO             
    Entrez le nom de l'unité d'organisation 
    tel que UO_Paris
    
    .Example
    SGA-MoveObjet-UO ' Stephane' 'UO_Paris'
    .Example
    SGA-MoveObjet-UO -Objet 'Stephane' -UO 'UO_Paris'
    .Link
    SGA-MoveObjet-UO

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Objet,
    [Parameter(Mandatory=$True)][string]$UO)
    
    if (SGA-TestUO -UO $UO -Verbose:$false)
    {
        if (SGA-TestObjet -Objet $Objet -Verbose:$false)
        {
            $Identity = Get-ADObject -Filter * | Where-Object name -eq $Objet
            $Target = Get-ADObject -Filter * | Where-Object Name -eq $UO
            Move-ADObject -Identity $Identity -TargetPath $Target
            Write-Verbose "L'objet $Objet est déplacé vers l'UO $UO"
            return $True
        }
        Write-Verbose "L'objet $Objet n'existe pas"
        return $false
    }
    else
    {
        Write-Verbose "L'unité d'organisation $UO n'existe pas"
        return $false
    }
}

Function SGA-TestComputer
{
   <#
    .Synopsis
    Test l'existence d'un ordinateur.

    .Description
    La fonction SGA-TestComputer indique si l'ordinateur 
    passé en paramètre existe ou non dans la base AD
    
    .Parameter Computer             
    Entrez le nom de l'ordinateur tel que PC27
    
    .Example
    SGA-TestComputer 'PC27'
    .Example
    SGA-TestComputer -Computer 'PC27'
    .Link
    SGA-TestComputer

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Computer)
    
    try
    {
        $tSGA = Get-ADComputer -Identity $Computeur -ErrorAction Stop
        Write-Verbose "L'ordinateur $Computeur existe"
        return $true
    }
    catch
    {
        Write-Verbose "L'ordinateur $Computeur n'existe pas"
        return $false
    }
}


Function SGA-UpdateUser
{
   <#
    .Synopsis
    Modification d'un Utilisateur.

    .Description
    La fonction SGA-UpdateUser modifie l'utilisateur 
    passé en paramètre Uniquement si il existe
    dans la base AD
    Les modifications sur les paramètres 
    sont possibles
    
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Parameter Prenom
    Prenom de l'utilisateur 
    
    .Parameter Mail
    Mail de l'utilisateur

    .Parameter Tel
    Téléphone de l'utilisateur

    .Example
    SGA-UpdateUser 'Stephane' 
    .Example
    SGA-UpdateUser -User 'Stephane' -Prenom -Mail -Tel
    .Link
    SGA-UpdateUser

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$User,
    [string]$Prenom,
    [string]$Tel,
    [string]$Mail)
    
    if (SGA-TestUser -user $User -Verbose:$false)
    {
        Write-Verbose "L'utilisateur $User est modifié avec :"

        Set-ADUser -Identity $User -Surname $User 
        if ($Prenom.Length -gt 1)
        {
            $Txt = 'Prenom = ' + $Prenom
            Write-Verbose $Txt
            Set-ADUser -Identity $User -GivenName $Prenom 
        }
        if ($Tel.Length -gt 1)
        {
            $Txt = 'Telephone = ' + $Tel
            Write-Verbose $Txt
            Set-ADUser -Identity $User -OfficePhone $Tel 
        }
        if ($Mail.Length -gt 1)
        {
            $Txt = 'Mail = ' + $Mail
            Write-Verbose $Txt
            Set-ADUser -Identity $User -EmailAddress $Mail 
        }
        return $True
    }
    else
    {
        return $false
    }
}

Function SGA-UpdateUser2
{
   <#
    .Synopsis
    Modification d'un Utilisateur avec l'objet.

    .Description
    La fonction UpdateUser modifie l'utilisateur 
    passé en paramètre Uniquement si il existe
    dans la base AD
    Les modifications sur les paramètres 
    sont possibles     
    Liste des propritétés : exemple : "mail=stephane@mondomaine.local", "GivenName=prenom",...
    
    AccountExpirationDate accountExpires                    AccountLockoutTime     AccountNotDelegated                  
    adminCount            AllowReversiblePasswordEncryption AuthenticationPolicy   AuthenticationPolicySilo             
    badPasswordTime       badPwdCount                       CannotChangePassword   Certificates                         
    City                  codePage                          Company                CompoundIdentitySupported            
    Country               countryCode                       Department             Description                          
    DisplayName           DistinguishedName                 Division               DoesNotRequirePreAuth                
    dSCorePropagationData EmailAddress                      EmployeeID             EmployeeNumber                       
    Enabled               Fax                               GivenName              HomeDirectory                        
    HomedirRequired       HomeDrive                         HomePage               HomePhone                            
    Initials              isCriticalSystemObject            KerberosEncryptionType LastBadPasswordAttempt               
    lastLogoff            lastLogon                         LastLogonDate          lastLogonTimestamp                   
    LockedOut             logonCount                        LogonWorkstations      Manager                              
    MemberOf              MNSLogonAccount                   MobilePhone            msDS-User-Account-Control-Computed   
    nTSecurityDescriptor  ObjectClass                       ObjectGUID             Office                               
    OfficePhone           Organization                      OtherName              PasswordExpired                      
    PasswordLastSet       PasswordNeverExpires              PasswordNotRequired    POBox                                
    PostalCode            PrimaryGroup                      primaryGroupID         PrincipalsAllowedToDelegateToAccount 
    ProfilePath           ProtectedFromAccidentalDeletion   pwdLastSet             SamAccountName                       
    sAMAccountType        ScriptPath                        ServicePrincipalNames  SID                                  
    SIDHistory            SmartcardLogonRequired            State                  StreetAddress                        
    Surname               Title                             TrustedForDelegation   TrustedToAuthForDelegation           
    UseDESKeyOnly         userAccountControl                userCertificate        UserPrincipalName                    
        
    .Parameter User             
    Entrez le nom de l'utilisateur tel que Stephane
    
    .Parameter Properties
    Collection de paramètres à modifier
    exemple
    "mail=stephane@mondomaine.local", "GivenName=prenom",..

    .Example
    SGA-UpdateUser2 'Stephane' 
    .Example
    SGA-UpdateUser2 -User 'Stephane' -Properties "mail=stephane@modomaine.local","GivenName=stephane"
    .Link
    SGA-UpdateUser2

#>
    Param(
    [Parameter(Mandatory=$True)][string]$User,
    [string[]]$Properties)
    
    if (SGA-TestUser -user $User)
    {
        foreach($Prop in $Properties)
        {
            $ObjUser = Get-ADUser -Identity $User -Properties * 

            $Param = $Prop.split('=')
            Write-Verbose "$($Param[0]) - $($Param[1])"
            if($Param[1].length -gt 0)
            {
                $ObjUser.($Param[0].trim()) = ($Param[1].trim())
            }
            else
            {
                $ObjUser.($Param[0].trim()) = $null
            }
            try
            {
                Set-ADUser -Instance $ObjUser -ErrorAction Stop
                Write-Verbose "La propriété $($Param[0]) mise à jour"
            }
            catch
            {
                Write-Verbose "La propriété $($Param[0]) n'existe pas"
            }
        }

        return $True
    }
    else
    {
        Write-Verbose "L'utilisateur $User n'existe pas"
        return $false
    }
}

Function SGA-ImportUser
{
   <#
    .Synopsis
    Import d'un fichier CSV dans les objets de l'AD

    .Description
    La fonction SGA-ImportUser import le fichier CSV en
    mémoire et intègre les différents objets dane la base
    AD
    
    .Parameter Fichier             
    Entrez le nom du fichier à intégrer
    
    .Example
    SGA-ImportUser 'c:\users.csv'
    .Example
    SGA-ImportUser -Fichier 'c:\users.csv'
    .Link
    SGA-ImportUser

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Fichier)

    $utilisateurs = Import-Csv -Path $Fichier

    foreach ($util in $utilisateurs)
    {
        SGA-CreatUser -User $util.Nom 
        SGA-CreatGroup -Group $util.Groupe 
        SGA-AddGroupMembre -Objet $util.Nom -Group $util.Groupe 
        SGA-UserPW -User $util.Nom -Password $util.Password 
        SGA-UserActive -User $util.Nom 
        SGA-UpdateUser -User $util.Nom -Prenom $util.Prenom -Tel $util.Tel -Mail $util.Mail
        SGA-UpdateUser2 -User $util.Nom -Properties "OfficePhone=$($util.Tel)","EmailAddress=$($util.Mail)","Department=$($Util.Service)"
        if ($util.UO.length -gt 1)
        {
            SGA-CreatUO -UO $util.UO
            SGA-MoveObjet-UO -Objet $util.Nom -UO $util.UO
        }

    }

}


# Module DOS 040

Function SGA-GetFileExist
{
   <#
    .Synopsis
    Test l'existence d'un fichier.

    .Description
    La fonction SGA-GetFileExist indique si le fichier 
    passé en paramètre existe ou non
    

    .Parameter File             
    Entrez le nom du fichier tel que C:\windows\explorer.exe
    
    .Example
    SGA-GetFileExist 'C:\windows\explorer.exe'
    .Example
    SGA-GetFileExist -File 'C:\windows\explorer.exe'
    .Link
    SGA-GetFileExist

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$File)
    $Exist = $true
    try
    {
        $Exist = Test-Path -Path $File -ErrorAction Stop
        Write-Verbose "Le fichier existe"
    }
    catch
    {
        $Exist = $false
        Write-Verbose "Le fichier n'existe pas"

    }
    return $Exist
}

# Installation et configuration role HYPER-V
 Function SGA-HVAddHyperVRole
{
    Install-WindowsFeature Hyper-V -IncludeManagementTools -Restart

}

Function SGA-HVDelHyperVRole
{
    Remove-WindowsFeature Hyper-V -Restart

}

Function SGA-HVDefautParam
{
       <#
    .Synopsis
    Modification des emplacements par defaut des
    Machines virtuelle et des disques virtuel.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [string]$repertoireDisk='c:\virtuel',
    [string]$repertoireVM='c:\virtuel')
    if (((SGA-GetFileExist -File $repertoireDisk) -and
    (SGA-GetFileExist -File $repertoireVM) -or ($true)))
    {
        Set-VMHost -VirtualHardDiskPath $repertoireDisk -VirtualMachinePath $repertoireVM
    }
    else
    {
        return $false
    }
}

# Gestion des VM
Function SGA-HVListeVM
{
       <#
    .Synopsis
    Liste des machines virtuelle.

    .Description
    Fournis la liste des machines virtuelles sur le serveur

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param()
    Get-VM | Select-Object Name,State,Status , @{n='RAM(MB)';e={$PSItem.MemoryAssigned / 1MB}}
    
            
}

Function SGA-HVTestVM
{
       <#
    .Synopsis
    Test l'existence d'une VM.

    .Description
    Vérifie la présence d'une machine virtuelle sur le serveur

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param([Parameter(Mandatory=$True)][string]$VMName)
    
    $vm = Get-VM | where-Object name -eq $VMName
    if ($vm)
    {
        Write-Verbose "La VM existe"
        return $true
    }
    else
    {
        Write-Verbose "La VM n'existe pas"
        return $false
    }        
}

Function SGA-HVCreatVm
{
    <#
    .Synopsis
    Creation d'une machine virtuelle.

    .Description
    Création de la VM avec les différents paramètres nécessaires

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [Uint64]$Memoire='1GB',
    [Uint64]$MemoireMax,[Uint64]$MemoireMin,
    [int]$Generation = 2,
    [string[]]$Disques,[Uint64]$TailleDefaut,
    [string[]]$Switchs,
    [validateset("Internal","Private")]
    [string]$TypeDefaut,
    [string]$ISO)

    $path = SGA-HVRepertoireVm
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        New-VM -Generation $Generation -MemoryStartupBytes $Memoire -Name $VMName -Path $Path
    }
    if (!($MemoireMax -eq 0) -and 
    !($MemoireMin -eq 0))
    {
        Set-VMMemory -VMName $VMName -DynamicMemoryEnabled $True -MaximumBytes $MemoireMax -MinimumBytes $MemoireMin -StartupBytes $Memoire
    }

    Remove-VMNetworkAdapter -VMName $VMName
    foreach ($Interface in $Switchs)
    {
        SGA-HVAddVMSwitch -VMName $VMName -Interface $Interface -TypeDefaut $TypeDefaut
    }

    foreach ($VHD in $Disques)
    {
        SGA-HVAddVHD -VMName $VMName -VHDName $VHD -TailleDefaut $TailleDefaut
    }
      
    SGA-HVAddDVD -VMName $VMName -ISOPath $ISO  
    
}

# Parametres VM
Function SGA-HVUpdateRam
{
    <#
    .Synopsis
    Modification de la mémoire d'une 
    machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [Uint64]$Memoire='1GO',
    [Uint64]$MemoireMax,[Uint64]$MemoireMin)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    if (!($MemoireMax -eq 0) -and 
    !($MemoireMax -eq 0))
    {
        Set-VMMemory -VMName $VMName -DynamicMemoryEnabled $True -MaximumBytes $MemoireMax -MinimumBytes $MemoireMin -StartupBytes $Memoire
    }
}

Function SGA-HVUpdateNbProc
{
    <#
    .Synopsis
    Modification du nombre de processeur d'une 
    machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [Uint64]$NbProc='1')

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    if (!($NbProc -eq 0))
    {
        Set-VMProcessor -VMName $VMName -Count $NbProc
    }
}

# Gestion des switch virtuels
Function SGA-HVCreateSwitchVirtuel
{
   <#
    .Synopsis
    Ajoute un switch virtuel

    .Description
    Ajoute un switch virtuel d'après le type et le nom du switch
    Si le type est définit a EXTERNAL, un nom d'interface est 
    obligatoire 
   
    .Parameter Name
    Nom du switch virtuel. Doit-être unique dans la liste des switch 
    de la machine hote

    .Parameter Type
    Type de switch à créer
    Choix : 'Internal' 'External' 'Private'

    .Parameter Interface
    Nom de l'interface physique pour les switch Externes
    L'interface doit exister sur la machine hote
        
    .Example
    SGA-HVCreateSwitchVirtuel -Name Externe -Type External -Interface Ethernet

    .Example
    SGA-HVCreateSwitchVirtuel -Name Interne -Type Internal

    .Example
    SGA-HVCreateSwitchVirtuel -Name Prive -Type Private
#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Name,
    [Parameter(Mandatory=$True)][validateSet('Internal','External','Private')][string]$Type)
        
    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'Interface'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $false
            $ParameterAttribute.Position = 2

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            #$arrSet = Get-ChildItem -Path .\ -Directory | Select-Object -ExpandProperty FullName
            $arrSet = Get-NetAdapter | Select-Object -ExpandProperty Name
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }

    begin 
    {
        # Bind the parameter to a friendly variable
        $Interface = $PsBoundParameters[$ParameterName]
    }

    Process
    {
        if (Get-VMSwitch | Where-Object name -eq $Name)
        {
            Write-Verbose 'Le nom du switch existe déjà'
            return $false
        }
        if (-not ($Type -in ('Internal','External','Private')))
        {
            Write-Verbose 'Type incorrect "Internal"/"External"/"Private"'
            return $false
        }
        if ($Type -eq 'External')
        {
            if (-not (Get-NetAdapter | Where-Object Name -eq $Interface))
            {
                Write-Verbose "L'interface physique n'existe pas"
                return $false
            }
            try
            {
                New-VMSwitch -Name $Name -NetAdapterName $Interface -ErrorAction stop
            }
            catch
            {
                Write-Verbose "L'interface physique est déjà utilisée"
                return $false
            }
        }
        else
        {
            New-VMSwitch -Name $Name -SwitchType $Type
        }
        return $True
    }
}

Function SGA-HVCreateSwitchVirtuel2
{
   <#
    .Synopsis
    Ajoute un switch virtuel

    .Description
    Ajoute un switch virtuel d'après le type et le nom du switch
    Si le type est définit a EXTERNAL, un nom d'interface est 
    obligatoire 
   
    .Parameter Name
    Nom du switch virtuel. Doit-être unique dans la liste des switch 
    de la machine hote

    .Parameter Type
    Type de switch à créer
    Choix : 'Internal' 'External' 'Private'

    .Parameter Interface
    Nom de l'interface physique pour les switch Externes
    L'interface doit exister sur la machine hote
        
    .Example
    SGA-HVCreateSwitchVirtuel -Name Externe -Type External -Interface Ethernet

    .Example
    SGA-HVCreateSwitchVirtuel -Name Interne -Type Internal

    .Example
    SGA-HVCreateSwitchVirtuel -Name Prive -Type Private
#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$Name,
    [Parameter(Mandatory=$True)][validateSet('Internal','Private')][string]$Type)
        
    if (Get-VMSwitch | Where-Object name -eq $Name)
    {
        Write-Verbose 'Le nom du switch existe déjà'
        return $false
    }
    if (-not ($Type -in ('Internal','Private')))
    {
        Write-Verbose 'Type incorrect "Internal"/"Private"'
        return $false
    }
    New-VMSwitch -Name $Name -SwitchType $Type
    return $True
}

Function SGA-HVDelSwitchVirtuel
{
   <#
    .Synopsis
    Supprime un switch virtuel

    .Description
    Supprime un switch virtuel dont le nom est en parametre
    Si *, tous les switchs seront supprimés

    .Parameter Name             
    Nom du switch à supprimer. Si '*', tous les switch 
    seront supprimés

    .Example
    SGA-HVDelSwitchVirtuel -Name Externe

#>
    
    [CmdletBinding()]
    Param()

    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'Name'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $false
            $ParameterAttribute.Position = 0

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            #$arrSet = Get-ChildItem -Path .\ -Directory | Select-Object -ExpandProperty FullName
            [object[]]$arrSet = Get-VMSwitch | Select-Object -ExpandProperty Name
            $arrSet += '*'
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }

    begin 
    {
        # Bind the parameter to a friendly variable
        $Name = $PsBoundParameters[$ParameterName]
    }

    process
    {
        if ($Name -eq '*')
        {
            Get-VMSwitch | Where-Object Name -ne 'Default Switch' | Remove-VMSwitch -Force
        }
        else
        {
            Get-VMSwitch | where-Object Name -eq $Name | Remove-VMSwitch -Force
        }
        return $True
    }        
}

Function SGA-HVAddVMSwitch
{
    <#
    .Synopsis
    Ajoute une interface reseau à la 
    machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [string]$Interface,
    [string]$TypeDefaut)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    if (!(Get-VMSwitch | Where-Object Name -eq $Interface))
    {
        if ($TypeDefaut.Length -gt 1)
        {
            SGA-HVCreateSwitchVirtuel2 -Name $Interface -Type $TypeDefaut
        }
        else
        {
            return $false
        }
    }

    Add-VMNetworkAdapter -VMName $VMName -SwitchName $Interface
}

Function SGA-HVRepertoireVm
{
      <#
    .Synopsis
    Retourne le repertoire des machines virtuels
    par défaut.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    $Rep = (Get-VMHost | Select-Object VirtualMachinePath).VirtualMachinePath
    return $Rep
}

# Gestion des disques durs virtuels
Function SGA-HVRepertoireDisk
{
    <#
    .Synopsis
    Retourne le repertoire des disques virtuels
    par défaut.

    .Description
    Paramètre définit dans Hyper-V

    .Example
     SGA-HVRepertoireDisk

    .Link

#>
    [CmdletBinding()]
    $Rep = (Get-VMHost | Select-Object VirtualHardDiskPath).VirtualHardDiskPath
    return $Rep
}

Function SGA-HVListeVHD
{
    <#
    .Synopsis
    Liste des disques virtuel.

    .Description
    Liste des disques durs virtuels dans le dossier définit par
    défaut dans le paramétrage Hyper-V

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    
    $Rep = SGA-HVRepertoireDisk

    $Liste = Get-ChildItem -Path $Rep -Filter *.vhd*
    foreach ($Disk in $Liste)
    {
        Get-VHD -Path $Disk.FullName | Select-Object `
        @{n='Name';e={$Disk.Name}},Path,VhdFormat,VhdType, `
        @{n='Size(GB)';e={$PSItem.Size / 1GB}}
    }

        
}

Function SGA-HVNewVHD
{
    <#
    .Synopsis
    Ajoute un disque dur virtuel dans le dossier spécifié 

    .Description
    Le disquye sera créé dans le dossier définit par défaut dans Hyper-V

    .Parameter File             
    
    
    .Example
     
    .Link

#>

    Param(
    [Parameter(Mandatory=$True)][string]$NomVHD,
    [Parameter(Mandatory=$True)][uint64]$Size,
    [validateSet('Dynamic','Fixe','Differentiel')][string]$Type="Dynamic",
    [string]$NomParent)

    [string]$Path = (SGA-HVRepertoireDisk) + '\' + $NomVHD
    $PathParent = (SGA-HVRepertoireDisk) + '\' + $NomParent
    if ($type -eq 'Dynamic')
    {
        New-VHD -Path $Path -SizeBytes $Size -Dynamic
    }
    elseif ($type -eq 'Fixe')
    {
        New-VHD -Path $Path -SizeBytes $Size
    }
    elseif ($type -eq 'Differentiel')
    {
        New-VHD -ParentPath $PathParent -Path $Path -SizeBytes $Size
    }

}

Function SGA-HVTestVHD
{
       <#
    .Synopsis
    Test un disque virtuel.

    .Description
    Vérification de la présence du disque virtuel dans le dossier par
    défaut des disque dans Hyper-V
    
    .Parameter Name             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param([Parameter(Mandatory=$True)][string]$Name)
    
    if (SGA-HVListeVHD | Where-Object Name -eq $Name)
    {
        return $True
    }
    else
    {
        return $false
    }
            
}

Function SGA-HVAddVHD
{
    <#
    .Synopsis
    Ajoute un disque virtuel à la 
    machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [Parameter(Mandatory=$True)][string]$VHDName,
    [Uint64]$TailleDefaut=30GB)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }

    if (!(SGA-HVTestVHD -Name $VHDName))
    {
        if ($TailleDefaut -gt 0)
        {
            SGA-HVNewVHD -NomVHD $VHDName -Size $TailleDefaut
        }
        else
        {
            return $false
        }
    }
    [string]$Repertoire = (SGA-HVRepertoireDisk) + '\' + $VHDName
    if (!(Get-VMHardDiskDrive -VMName $VMName | Where-Object path -eq $Repertoire))
    {
        Add-VMHardDiskDrive -VMName $VMName -Path $Repertoire
    }
}

Function SGA-HVAddDVD
{
    <#
    .Synopsis
    Ajoute un CD dans le lecteur de la 
    machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName,
    [string]$ISOPath)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    if ($ISOPath.Length -lt 3)
    {
        return $false
    }
    if (!(SGA-GetFileExist -File $ISOPath))
    {
        return $false
    }
    if (!(Get-VMDvdDrive -VMName $VMName))
    {
        Add-VMDvdDrive -VMName $VMName
    }
    Set-VMDvdDrive -VMName $VMName -Path $ISOPath
}


# fonction de test des commandes HV
Function SGA-TestHV
{
    SGA-HVDelSwitchVirtuel -Name *
    SGA-HVCreateSwitchVirtuel -Name Interne -Type Internal
    SGA-HVCreatVm -VMName VM01 -Memoire 2GB
    SGA-HVUpdateNbProc -VMName VM01 -NbProc 2
    SGA-HVUpdateRam -VMName VM01 -Memoire 2GB -MemoireMax 4GB -MemoireMin 1GB
    SGA-HVNewVHD -NomVHD VM01.vhdx -Size 30GB -Type Dynamic
    SGA-HVAddVHD -VMName VM01 -VHDName VM01.vhdx
    SGA-HVAddDVD -VMName VM01 -ISOPath C:\HyperV\WindowsServer2012R2.ISO
    SGA-HVAddVMSwitch -VMName VM01 -Interface Interne
    SGA-HVStartVM -VMName VM01

}

Function SGA-TestHV-2
{
    SGA-HVCreatVm -VMName VM02 -Memoire 2GB
    SGA-HVUpdateNbProc -VMName VM02 -NbProc 2
    SGA-HVUpdateRam -VMName VM02 -Memoire 2GB -MemoireMax 4GB -MemoireMin 1GB
    SGA-HVNewVHD -NomVHD VM02.vhdx -Size 30GB -Type Differentiel -NomParent Parent.vhdx
    SGA-HVAddVHD -VMName VM02 -VHDName VM02.vhdx
    SGA-HVAddVMSwitch -VMName VM02 -Interface Interne
    SGA-HVdesableAutoCtrl -VMName VM02
    SGA-HVStartVM -VMName VM02
    
    SGA-HVCreatVm -VMName VM03 -Memoire 2GB
    SGA-HVUpdateNbProc -VMName VM03 -NbProc 2
    SGA-HVUpdateRam -VMName VM03 -Memoire 2GB -MemoireMax 4GB -MemoireMin 1GB
    SGA-HVNewVHD -NomVHD VM03.vhdx -Size 30GB -Type Differentiel -NomParent Parent.vhdx
    SGA-HVAddVHD -VMName VM03 -VHDName VM03.vhdx
    SGA-HVAddVMSwitch -VMName VM03 -Interface Interne
    SGA-HVdesableAutoCtrl -VMName VM03
    SGA-HVStartVM -VMName VM03
}

Function SGA-TestHV-3
{
    SGA-HVCreatVm -VMName VM03 -Memoire 2GB
    SGA-HVUpdateNbProc -VMName VM03 -NbProc 2
    SGA-HVUpdateRam -VMName VM03 -Memoire 2GB -MemoireMax 4GB -MemoireMin 1GB
    SGA-HVNewVHD -NomVHD VM03.vhdx -Size 30GB -Type Differentiel -NomParent Parent.vhdx
    SGA-HVAddVHD -VMName VM03 -VHDName VM03.vhdx
    SGA-HVAddVMSwitch -VMName VM03 -Interface Interne
    SGA-HVdesableAutoCtrl -VMName VM03
    SGA-HVStartVM -VMName VM03

}

Function SGA-HVStartVM
{
    <#
    .Synopsis
    Démarre une machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        Start-VM -Name $VMName
    }

}

Function SGA-HVStopVM
{
    <#
    .Synopsis
    arrete une machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        Stop-VM -Name $VMName
    }

}

# gestion des points de controle

Function SGA-HVdesableAutoCtrl
{
    <#
    .Synopsis
    arrete les point de controle automatique une machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName)
        
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        Set-VM -Name $VMName -AutomaticCheckpointsEnabled $false
    }
}

Function SGA-HVEnableAutoCtrl
{
    <#
    .Synopsis
    démarre les point de controle automatique une machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    
    Param([Parameter(Mandatory=$True)][string]$VMName)
        
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        Set-VM -Name $VMName -AutomaticCheckpointsEnabled $true
    }
}

Function SGA-HVNewControle
{
   <#
    .Synopsis
    démarre les point de controle automatique une machine virtuelle.

    .Description

    .Parameter File             
    
    
    .Example
     
    .Link

#> 
    Param([Parameter(Mandatory=$True)][string]$VMName)
        
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        Checkpoint-VM -Name $VMName
    }

}

Function SGA-HVDelControle
{
   <#
    .Synopsis
    Supprime les point de controle d'une machine virtuelle.

    .Description
    Conserve toutes les données de la machine virtuelle.

    .Parameter File             
    
    
    .Example
     
    .Link

#> 
    Param([Parameter(Mandatory=$True)][string]$VMName)
        
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        if (Get-VMCheckpoint -VMName $VMName)
        {
            (Get-VMCheckpoint -VMName $VMName)[-1] | Remove-VMCheckpoint
        }
    }

}

Function SGA-HVBackControle
{
   <#
    .Synopsis
    Supprime les point de controle d'une machine virtuelle.

    .Description
    Revient à une version précédente des données de la machine virtuelle.

    .Parameter File             
    
    
    .Example
     
    .Link

#> 
    Param([Parameter(Mandatory=$True)][string]$VMName)
        
    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
        if (Get-VMCheckpoint -VMName $VMName)
        {
            (Get-VMCheckpoint -VMName $VMName)[-1] | Restore-VMCheckpoint -Confirm:$false
        }
    }

}


Function SGA-BootOrder
{
       <#
    .Synopsis
    Changement de l'ordre du BOOT
    .Description
    
    .Example

    .Link

#>
    [CmdletBinding()]
    param([Parameter(Mandatory=$True)][string]$VMName)

        if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
    # 
        Set-VMBios -VMName $VMName -StartupOrder @("LegacyNetworkAdapter","CD", "IDE", "Floppy")
    }
}

Function SGA-AddSCSIDisk
{
       <#
    .Synopsis
    Ajoute un disque SCSI
    .Description
    
    .Example

    .Link

#>
    [CmdletBinding()]
    param([Parameter(Mandatory=$True)][string]$VMName,
    [Parameter(Mandatory=$True)][string]$NomVHD)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
    # 
        [string]$Path = (SGA-HVRepertoireDisk) + '\' + $NomVHD
        Add-VMHardDiskDrive -VMName $VMName -ControllerType SCSI -Path $Path
    }
}

Function SGA-AddLegacy
{
       <#
    .Synopsis
    Ajoute un disque Interface legacy
    .Description
    
    .Example

    .Link

#>
    [CmdletBinding()]
    param([Parameter(Mandatory=$True)][string]$VMName)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    {
    # 
        Add-VMNetworkAdapter -VMName $VMName -IsLegacy $true
    }
}

Function SGA-BootOrder-G2
{
       <#
    .Synopsis
    Changement de l'ordre du BOOT Génération 2
    .Description
    
    .Example

    .Link

#>
    [CmdletBinding()]
    param([Parameter(Mandatory=$True)][string]$VMName,
    [Parameter(Mandatory=$True)][validateSet('Reseau','Disk','DVD')][string]$Type)

    if (!(SGA-HVTestVM -VMName $VMName))
    {
        return $false
    }
    else
    { 
        if ($Type -eq 'Reseau')
        {
            Set-VMFirmware $VMName -BootOrder (Get-VMNetworkAdapter $VMName),(Get-VMdvdDrive $VMName),(Get-VMHardDiskDrive $VMName)
        }
        elseif ($Type -eq 'Disk')
        {
            Set-VMFirmware $VMName -BootOrder (Get-VMHardDiskDrive $VMName),(Get-VMDvdDrive $VMName),(Get-VMNetworkAdapter $VMName)
        }
        elseif ($Type -eq 'DVD')
        {
            Set-VMFirmware $VMName -BootOrder (Get-VMDvdDrive $VMName),(Get-VMNetworkAdapter $VMName),(Get-VMHardDiskDrive $VMName)
        }

    }
}


Function SGA-ACL
{
<# 
.Synopsis 
   This script is used to give the list of users with write access to the given path.
.DESCRIPTION 
   This script is used to give the list of users with write access to the given path.
   -Recurse : The Recurse option allows you to browse also the subdirectories
   The variable $ListExclusion allows to give groups to be excluded from the result (Example: Admins Domain)
   Geo Holz https://blog.jolos.fr
.EXAMPLE 
  Access.ps1 - Path "PATH_TO_DIRECTORY" -Recurse
#> 
[CmdletBinding()]
Param (
    [ValidateScript({Test-Path $_ -PathType Container})]
    [Parameter(Mandatory=$true)]
    [string]$Path,
    [switch]$Recurse
)

$ListExclusion = "local.local\domain admins", "local.local\other_group_to_exclude"

Write-Verbose "$(Get-Date): Script begins!"
Write-Verbose "Getting domain name..."
$Domain = (Get-ADDomain).NetBIOSName
Write-Verbose "Getting ACLs for folder $Path"

If ($Recurse)
{   Write-Verbose "...and all sub-folders"
    Write-Verbose "Gathering all folder names, this could take a long time on bigger folder trees..."
    $Folders = Get-ChildItem -Path $Path -Recurse | Where { $_.PSisContainer }
}
Else
{   $Folders = Get-Item -Path $Path
}

Write-Verbose "Gathering ACL's for $($Folders.Count) folders..."
ForEach ($Folder in $Folders)
{   Write-Verbose "Working on $($Folder.FullName)..."
    $ACLs = Get-Acl $Folder.FullName | ForEach-Object { $PSItem.Access }
    ForEach ($ACL in $ACLs)
    {   
       If ($ListExclusion -notcontains $ACL.IdentityReference)
       {
        If ($ACL.IdentityReference -match "\\")
        {   If ($ACL.IdentityReference.Value.Split("\")[0].ToUpper() -eq $Domain.ToUpper())
            {   $Name = $ACL.IdentityReference.Value.Split("\")[1]
                If ((Get-ADObject -Filter 'SamAccountName -eq $Name').ObjectClass -eq "group")
                {   ForEach ($User in (Get-ADGroupMember $Name -Recursive | Select -ExpandProperty Name))
                    {   $Result = New-Object PSObject -Property @{
                            Path = $Folder.Fullname
                            Group = $Name
                            User = $User
                            FileSystemRights = $ACL.FileSystemRights
                            AccessControlType = $ACL.AccessControlType
                            Inherited = $ACL.IsInherited
                        }
                        $Result | Select Path,Group,User,FileSystemRights,AccessControlType,Inherited
                    }
                }
                Else
                {    $Result = New-Object PSObject -Property @{
                        Path = $Folder.Fullname
                        Group = ""
                        User = Get-ADUser $Name | Select -ExpandProperty Name
                        FileSystemRights = $ACL.FileSystemRights
                        AccessControlType = $ACL.AccessControlType
                        Inherited = $ACL.IsInherited
                    }
                    $Result | Select Path,Group,User,FileSystemRights,AccessControlType,Inherited
                }
            }
            Else
            {   $Result = New-Object PSObject -Property @{
                    Path = $Folder.Fullname
                    Group = ""
                    User = $ACL.IdentityReference.Value
                    FileSystemRights = $ACL.FileSystemRights
                    AccessControlType = $ACL.AccessControlType
                    Inherited = $ACL.IsInherited
                }
                $Result | Select Path,Group,User,FileSystemRights,AccessControlType,Inherited
            }
        }
      }
    }
}
Write-Verbose "$(Get-Date): Script completed!"
}

Function SGA-DeleteVHD
{
    <#
    .Synopsis
    Supprime un disque dur virtuel dans le dossier spécifié 

    .Description
    Le disquye sera supprimé dans le dossier définit par défaut dans Hyper-V

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$NomVHD)

    [string]$Path = (SGA-HVRepertoireDisk) + '\' + $NomVHD
    if (SGA-GetFileExist -File $Path)
    {
        New-VHD -Path $Path -SizeBytes $Size -Dynamic
    }

}

Function SGA-DeleteVM
{
    <#
    .Synopsis
    Supprime une Machine virtuelle du dossier spécifié 

    .Description
    La VM sera supprimé dans le dossier définit par défaut dans Hyper-V

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$VMName)

    if (SGA-HVTestVM -VMName $VMName)
    {
        Remove-VM -Name $VMName
    }

}

# Fonctions réseau

Function SGA-SetServeurWINS
{
    <#
    .Synopsis
    Indique le serveur WINS 

    .Description
    Détermine le serveur WINS principal et secondaire sur le protocole IPV4
    de l'interface passé en paramètre 

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$ServerWINS,
    [string]$ServerWINS2="")

    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'InterfaceName'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $true
            $ParameterAttribute.Position = 0

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            #$arrSet = Get-ChildItem -Path .\ -Directory | Select-Object -ExpandProperty FullName
            $arrSet = Get-NetAdapter | Select-Object -ExpandProperty Name
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }
    begin 
    {
        # Bind the parameter to a friendly variable
        $InterfaceName = $PsBoundParameters[$ParameterName]
    }
    Process
    {
        $Adapter = Get-NetAdapter | Where-Object Name -EQ $InterfaceName
        if (!($Adapter))
        {
            return $false
        }

        $IPV4 = (Get-WmiObject -Query "SELECT * FROM Win32_NetworkAdapterConfiguration" | Where-Object InterfaceIndex -EQ ($Adapter.InterfaceIndex))
        if ($IPV4)
        {
            $IPV4.SetWINSServer($ServerWINS,$ServerWINS2)
        }
    }
}

Function SGA-SetIPV4
{
    <#
    .Synopsis
    configure l'IPV4 statique 

    .Description
    Indique l'adresse IP V4 sur l'interface passée en paramètre 

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$IPV4,
    [int32]$Long=24,
    [string]$NouveauNom,
    [string[]]$ServerDNS,
    [switch]$DesableIPV6)

    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'InterfaceName'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $true
            $ParameterAttribute.Position = 0

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            #$arrSet = Get-ChildItem -Path .\ -Directory | Select-Object -ExpandProperty FullName
            $arrSet = Get-NetAdapter | Select-Object -ExpandProperty Name
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }
    begin 
    {
        # Bind the parameter to a friendly variable
        $InterfaceName = $PsBoundParameters[$ParameterName]
    }
    Process
    {
        $Adapter = Get-NetAdapter | Where-Object Name -EQ $InterfaceName
        if (!($Adapter))
        {
            return $false
        }
        if ($NouveauNom)
        {
            Rename-NetAdapter -Name ($Adapter.Name) -NewName $NouveauNom
        }
        $Adapter | Remove-NetIPAddress -Confirm:$false
        $Adapter | New-NetIPAddress -IPAddress $IPV4 -AddressFamily IPv4 -PrefixLength $Long
        if ($ServerDNS)
        {
            $Adapter | Set-DnsClientServerAddress -ServerAddresses $ServerDNS
        }
        if ($DesableIPV6)
        {
            $Adapter | Disable-NetAdapterBinding -ComponentID ms_tcpip6
        }
    }
}

Function SGA-ListGPO
{
    <#
    .Synopsis
    Listing de TOUTES les GPO 

    .Description
    Indique l'adresse IP V4 sur l'interface passée en paramètre 

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    return Get-GPO -All
}

Function SGA-GPOXML
{
   <#
    .Synopsis
    Contenu d'une GPO en XML

    .Description
    Indique l'adresse IP V4 sur l'interface passée en paramètre 

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param()
    DynamicParam 
    {
            # Set the dynamic parameters' name
            $ParameterName = 'GpoName'
            
            # Create the dictionary 
            $RuntimeParameterDictionary = New-Object System.Management.Automation.RuntimeDefinedParameterDictionary

            # Create the collection of attributes
            $AttributeCollection = New-Object System.Collections.ObjectModel.Collection[System.Attribute]
            
            # Create and set the parameters' attributes
            $ParameterAttribute = New-Object System.Management.Automation.ParameterAttribute
            $ParameterAttribute.Mandatory = $true
            $ParameterAttribute.Position = 0

            # Add the attributes to the attributes collection
            $AttributeCollection.Add($ParameterAttribute)

            # Generate and set the ValidateSet 
            #$arrSet = Get-ChildItem -Path .\ -Directory | Select-Object -ExpandProperty FullName
            $arrSet = Get-GPO -all | Select-Object -ExpandProperty DisplayName
            $ValidateSetAttribute = New-Object System.Management.Automation.ValidateSetAttribute($arrSet)

            # Add the ValidateSet to the attributes collection
            $AttributeCollection.Add($ValidateSetAttribute)

            # Create and return the dynamic parameter
            $RuntimeParameter = New-Object System.Management.Automation.RuntimeDefinedParameter($ParameterName, [string], $AttributeCollection)
            $RuntimeParameterDictionary.Add($ParameterName, $RuntimeParameter)
            return $RuntimeParameterDictionary
    }
    begin 
    {
        # Bind the parameter to a friendly variable
        $GPOName = $PsBoundParameters[$ParameterName]
    }
    Process
    {
        $gpo = Get-GPO -All | Where-Object DisplayName -EQ $GPOName 
        $gpoGUID = $gpo.Id 
        $gpoXML = Get-GPOReport -Guid $gpoGUID -ReportType Xml 
        return $gpoXML
    }
}

Function SGA-FindHotFix
{
    <#
    .Synopsis
       Checks for one or more patches on one or more servers.
    .DESCRIPTION
       Checks for one or more patches on one or more servers. The results show if each patch is installed or not on each server.
       The script uses the cmdlet Get-Hotfix so make sure you can run that towards the servers. 
       Get-Hotfix does not return anything if no patch is found. This script works around that to show where the patches are not installed as well as where they are installed.
    .EXAMPLE
       .\Find-Hotfix.ps1 -Hotfix_FilePath 'c:\hotfixes.txt' -ComputerName_FilePath 'c:\servers.txt'
    .EXAMPLE
       .\Find-Hotfix.ps1 -Hotfix 'KB2991963', 'KB2923423' -ComputerName 'server01', 'server02'
    .EXAMPLE
       .\Find-Hotfix.ps1 -Hotfix 'KB2991963', 'KB2923423' -ComputerName_FilePath 'c:\servers.txt'
    .EXAMPLE
       .\Find-Hotfix.ps1 -Hotfix_FilePath 'c:\hotfixes.txt' -ComputerName 'server01', 'server02'
    .NOTES
       Written by John Roos
       Email: john.m.roos@gmail.com
    #>
    [CmdletBinding()]
    Param
    (
        # Specify a path to the text file containing the list of hotfixes to search for. Must be one patch per row.
        [string]
        $Hotfix_FilePath,
        [string[]]
        # Specify the id of the patch to check (Example: KB2991963)
        $Hotfix,
        # Specify a path to the text file containing the list of servers to check. Must be one server per row.
        [string]
        $ComputerName_FilePath,
        # Specify the name of the server to check
        [string[]]
        $ComputerName
    )

    if ($HotfixList_Path) {
        $find_hotfix = Get-Content -Path $Hotfix_FilePath
    }else{
        $find_hotfix = $Hotfix
    
    }

    if ($ComputerList_Path){
        $servers = Get-Content -Path $ComputerName_FilePath
    }else{
        $servers = $ComputerName
    }

    # Could get error on this line in case some servers does not respond or bad permissions.
    $installedhf = Get-HotFix -Id $find_hotfix -ComputerName $servers

    foreach ($server in $servers){
        $temphf = $installedhf | where PSComputerName -eq $server
    
        foreach ($hf in $find_hotfix){
            $verified_hotfix  = New-Object psobject
            Add-Member -InputObject $verified_hotfix -MemberType 'NoteProperty' -Name "ComputerName" -Value $server
            Add-Member -InputObject $verified_hotfix -MemberType 'NoteProperty' -Name "Hotfix" -Value $hf
        
            if ($temphf.HotFixID.Contains($hf)){
                Add-Member -InputObject $verified_hotfix -MemberType 'NoteProperty' -Name "Status" -Value 'Installed'
            }else{
                Add-Member -InputObject $verified_hotfix -MemberType 'NoteProperty' -Name "Status" -Value 'Not installed'
            }

            # send object to pipeline
            $verified_hotfix
        }
    }
}

Function SGA-HostNameIP
{
    <#
    .Synopsis
    Retourne le nom de la machine Hote (sans zone de recherche inversée) 

    .Description
    Retourne le nom de la machine Hote (sans zone de recherche inversée) 

    .Parameter File             
    
    
    .Example
     
    .Link

#>
    [CmdletBinding()]
    Param(
    [Parameter(Mandatory=$True)][string]$IPV4,
    [string]$Zone="MyDom.Local")

    return Get-DnsServzerRessourceRecord -ZoneName $Zone -RRType A | Select-Object HostName, RecordType, @{n="IP";e={$PSItem.RecordData.IPV4Address.IPAddressToString}} | Where-Object IP -EQ $IPV4
}










# DELETE EVERYTHING BELOW HERE BEFORE MODIFYING THIS SCRIPT
# SIG # Begin signature block
# MIIavQYJKoZIhvcNAQcCoIIarjCCGqoCAQExCzAJBgUrDgMCGgUAMGkGCisGAQQB
# gjcCAQSgWzBZMDQGCisGAQQBgjcCAR4wJgIDAQAABBAfzDtgWUsITrck0sYpfvNR
# AgEAAgEAAgEAAgEAAgEAMCEwCQYFKw4DAhoFAAQURWATlkjznjOysNzG0Bk52Xxn
# FPGgghWCMIIEwzCCA6ugAwIBAgITMwAAADQkMUDJoMF5jQAAAAAANDANBgkqhkiG
# 9w0BAQUFADB3MQswCQYDVQQGEwJVUzETMBEGA1UECBMKV2FzaGluZ3RvbjEQMA4G
# A1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0IENvcnBvcmF0aW9uMSEw
# HwYDVQQDExhNaWNyb3NvZnQgVGltZS1TdGFtcCBQQ0EwHhcNMTMwMzI3MjAwODI1
# WhcNMTQwNjI3MjAwODI1WjCBszELMAkGA1UEBhMCVVMxEzARBgNVBAgTCldhc2hp
# bmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAcBgNVBAoTFU1pY3Jvc29mdCBDb3Jw
# b3JhdGlvbjENMAsGA1UECxMETU9QUjEnMCUGA1UECxMebkNpcGhlciBEU0UgRVNO
# OkI4RUMtMzBBNC03MTQ0MSUwIwYDVQQDExxNaWNyb3NvZnQgVGltZS1TdGFtcCBT
# ZXJ2aWNlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA5RoHrQqWLNS2
# NGTLNCDyvARYgou1CdxS1HCf4lws5/VqpPW2LrGBhlkB7ElsKQQe9TiLVxj1wDIN
# 7TSQ7MZF5buKCiWq76F7h9jxcGdKzWrc5q8FkT3tBXDrQc+rsSVmu6uitxj5eBN4
# dc2LM1x97WfE7QP9KKxYYMF7vYCNM5NhYgixj1ESZY9BfsTVJektZkHTQzT6l4H4
# /Ieh7TlSH/jpPv9egMkGNgfb27lqxzfPhrUaS0rUJfLHyI2vYWeK2lMv80wegyxj
# yqAQUhG6gVhzQoTjNLLu6pO+TILQfZYLT38vzxBdGkVmqwLxXyQARsHBVdKDckIi
# hjqkvpNQAQIDAQABo4IBCTCCAQUwHQYDVR0OBBYEFF9LQt4MuTig1GY2jVb7dFlJ
# ZoErMB8GA1UdIwQYMBaAFCM0+NlSRnAK7UD7dvuzK7DDNbMPMFQGA1UdHwRNMEsw
# SaBHoEWGQ2h0dHA6Ly9jcmwubWljcm9zb2Z0LmNvbS9wa2kvY3JsL3Byb2R1Y3Rz
# L01pY3Jvc29mdFRpbWVTdGFtcFBDQS5jcmwwWAYIKwYBBQUHAQEETDBKMEgGCCsG
# AQUFBzAChjxodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpL2NlcnRzL01pY3Jv
# c29mdFRpbWVTdGFtcFBDQS5jcnQwEwYDVR0lBAwwCgYIKwYBBQUHAwgwDQYJKoZI
# hvcNAQEFBQADggEBAA9CUKDVHq0XPx8Kpis3imdYLbEwTzvvwldp7GXTTMVQcvJz
# JfbkhALFdRxxWEOr8cmqjt/Kb1g8iecvzXo17GbX1V66jp9XhpQQoOtRN61X9id7
# I08Z2OBtdgQlMGESraWOoya2SOVT8kVOxbiJJxCdqePPI+l5bK6TaDoa8xPEFLZ6
# Op5B2plWntDT4BaWkHJMrwH3JAb7GSuYslXMep/okjprMXuA8w6eV4u35gW2OSWa
# l4IpNos4rq6LGqzu5+wuv0supQc1gfMTIOq0SpOev5yDVn+tFS9cKXELlGc4/DC/
# Zef1Od7qIu2HjKuyO7UBwq3g/I4lFQwivp8M7R0wggTsMIID1KADAgECAhMzAAAA
# sBGvCovQO5/dAAEAAACwMA0GCSqGSIb3DQEBBQUAMHkxCzAJBgNVBAYTAlVTMRMw
# EQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25kMR4wHAYDVQQKExVN
# aWNyb3NvZnQgQ29ycG9yYXRpb24xIzAhBgNVBAMTGk1pY3Jvc29mdCBDb2RlIFNp
# Z25pbmcgUENBMB4XDTEzMDEyNDIyMzMzOVoXDTE0MDQyNDIyMzMzOVowgYMxCzAJ
# BgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYDVQQHEwdSZWRtb25k
# MR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xDTALBgNVBAsTBE1PUFIx
# HjAcBgNVBAMTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjCCASIwDQYJKoZIhvcNAQEB
# BQADggEPADCCAQoCggEBAOivXKIgDfgofLwFe3+t7ut2rChTPzrbQH2zjjPmVz+l
# URU0VKXPtIupP6g34S1Q7TUWTu9NetsTdoiwLPBZXKnr4dcpdeQbhSeb8/gtnkE2
# KwtA+747urlcdZMWUkvKM8U3sPPrfqj1QRVcCGUdITfwLLoiCxCxEJ13IoWEfE+5
# G5Cw9aP+i/QMmk6g9ckKIeKq4wE2R/0vgmqBA/WpNdyUV537S9QOgts4jxL+49Z6
# dIhk4WLEJS4qrp0YHw4etsKvJLQOULzeHJNcSaZ5tbbbzvlweygBhLgqKc+/qQUF
# 4eAPcU39rVwjgynrx8VKyOgnhNN+xkMLlQAFsU9lccUCAwEAAaOCAWAwggFcMBMG
# A1UdJQQMMAoGCCsGAQUFBwMDMB0GA1UdDgQWBBRZcaZaM03amAeA/4Qevof5cjJB
# 8jBRBgNVHREESjBIpEYwRDENMAsGA1UECxMETU9QUjEzMDEGA1UEBRMqMzE1OTUr
# NGZhZjBiNzEtYWQzNy00YWEzLWE2NzEtNzZiYzA1MjM0NGFkMB8GA1UdIwQYMBaA
# FMsR6MrStBZYAck3LjMWFrlMmgofMFYGA1UdHwRPME0wS6BJoEeGRWh0dHA6Ly9j
# cmwubWljcm9zb2Z0LmNvbS9wa2kvY3JsL3Byb2R1Y3RzL01pY0NvZFNpZ1BDQV8w
# OC0zMS0yMDEwLmNybDBaBggrBgEFBQcBAQROMEwwSgYIKwYBBQUHMAKGPmh0dHA6
# Ly93d3cubWljcm9zb2Z0LmNvbS9wa2kvY2VydHMvTWljQ29kU2lnUENBXzA4LTMx
# LTIwMTAuY3J0MA0GCSqGSIb3DQEBBQUAA4IBAQAx124qElczgdWdxuv5OtRETQie
# 7l7falu3ec8CnLx2aJ6QoZwLw3+ijPFNupU5+w3g4Zv0XSQPG42IFTp8263Os8ls
# ujksRX0kEVQmMA0N/0fqAwfl5GZdLHudHakQ+hywdPJPaWueqSSE2u2WoN9zpO9q
# GqxLYp7xfMAUf0jNTbJE+fA8k21C2Oh85hegm2hoCSj5ApfvEQO6Z1Ktwemzc6bS
# Y81K4j7k8079/6HguwITO10g3lU/o66QQDE4dSheBKlGbeb1enlAvR/N6EXVruJd
# PvV1x+ZmY2DM1ZqEh40kMPfvNNBjHbFCZ0oOS786Du+2lTqnOOQlkgimiGaCMIIF
# vDCCA6SgAwIBAgIKYTMmGgAAAAAAMTANBgkqhkiG9w0BAQUFADBfMRMwEQYKCZIm
# iZPyLGQBGRYDY29tMRkwFwYKCZImiZPyLGQBGRYJbWljcm9zb2Z0MS0wKwYDVQQD
# EyRNaWNyb3NvZnQgUm9vdCBDZXJ0aWZpY2F0ZSBBdXRob3JpdHkwHhcNMTAwODMx
# MjIxOTMyWhcNMjAwODMxMjIyOTMyWjB5MQswCQYDVQQGEwJVUzETMBEGA1UECBMK
# V2FzaGluZ3RvbjEQMA4GA1UEBxMHUmVkbW9uZDEeMBwGA1UEChMVTWljcm9zb2Z0
# IENvcnBvcmF0aW9uMSMwIQYDVQQDExpNaWNyb3NvZnQgQ29kZSBTaWduaW5nIFBD
# QTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJyWVwZMGS/HZpgICBC
# mXZTbD4b1m/My/Hqa/6XFhDg3zp0gxq3L6Ay7P/ewkJOI9VyANs1VwqJyq4gSfTw
# aKxNS42lvXlLcZtHB9r9Jd+ddYjPqnNEf9eB2/O98jakyVxF3K+tPeAoaJcap6Vy
# c1bxF5Tk/TWUcqDWdl8ed0WDhTgW0HNbBbpnUo2lsmkv2hkL/pJ0KeJ2L1TdFDBZ
# +NKNYv3LyV9GMVC5JxPkQDDPcikQKCLHN049oDI9kM2hOAaFXE5WgigqBTK3S9dP
# Y+fSLWLxRT3nrAgA9kahntFbjCZT6HqqSvJGzzc8OJ60d1ylF56NyxGPVjzBrAlf
# A9MCAwEAAaOCAV4wggFaMA8GA1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFMsR6MrS
# tBZYAck3LjMWFrlMmgofMAsGA1UdDwQEAwIBhjASBgkrBgEEAYI3FQEEBQIDAQAB
# MCMGCSsGAQQBgjcVAgQWBBT90TFO0yaKleGYYDuoMW+mPLzYLTAZBgkrBgEEAYI3
# FAIEDB4KAFMAdQBiAEMAQTAfBgNVHSMEGDAWgBQOrIJgQFYnl+UlE/wq4QpTlVnk
# pDBQBgNVHR8ESTBHMEWgQ6BBhj9odHRwOi8vY3JsLm1pY3Jvc29mdC5jb20vcGtp
# L2NybC9wcm9kdWN0cy9taWNyb3NvZnRyb290Y2VydC5jcmwwVAYIKwYBBQUHAQEE
# SDBGMEQGCCsGAQUFBzAChjhodHRwOi8vd3d3Lm1pY3Jvc29mdC5jb20vcGtpL2Nl
# cnRzL01pY3Jvc29mdFJvb3RDZXJ0LmNydDANBgkqhkiG9w0BAQUFAAOCAgEAWTk+
# fyZGr+tvQLEytWrrDi9uqEn361917Uw7LddDrQv+y+ktMaMjzHxQmIAhXaw9L0y6
# oqhWnONwu7i0+Hm1SXL3PupBf8rhDBdpy6WcIC36C1DEVs0t40rSvHDnqA2iA6VW
# 4LiKS1fylUKc8fPv7uOGHzQ8uFaa8FMjhSqkghyT4pQHHfLiTviMocroE6WRTsgb
# 0o9ylSpxbZsa+BzwU9ZnzCL/XB3Nooy9J7J5Y1ZEolHN+emjWFbdmwJFRC9f9Nqu
# 1IIybvyklRPk62nnqaIsvsgrEA5ljpnb9aL6EiYJZTiU8XofSrvR4Vbo0HiWGFzJ
# NRZf3ZMdSY4tvq00RBzuEBUaAF3dNVshzpjHCe6FDoxPbQ4TTj18KUicctHzbMrB
# 7HCjV5JXfZSNoBtIA1r3z6NnCnSlNu0tLxfI5nI3EvRvsTxngvlSso0zFmUeDord
# EN5k9G/ORtTTF+l5xAS00/ss3x+KnqwK+xMnQK3k+eGpf0a7B2BHZWBATrBC7E7t
# s3Z52Ao0CW0cgDEf4g5U3eWh++VHEK1kmP9QFi58vwUheuKVQSdpw5OPlcmN2Jsh
# rg1cnPCiroZogwxqLbt2awAdlq3yFnv2FoMkuYjPaqhHMS+a3ONxPdcAfmJH0c6I
# ybgY+g5yjcGjPa8CQGr/aZuW4hCoELQ3UAjWwz0wggYHMIID76ADAgECAgphFmg0
# AAAAAAAcMA0GCSqGSIb3DQEBBQUAMF8xEzARBgoJkiaJk/IsZAEZFgNjb20xGTAX
# BgoJkiaJk/IsZAEZFgltaWNyb3NvZnQxLTArBgNVBAMTJE1pY3Jvc29mdCBSb290
# IENlcnRpZmljYXRlIEF1dGhvcml0eTAeFw0wNzA0MDMxMjUzMDlaFw0yMTA0MDMx
# MzAzMDlaMHcxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYD
# VQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xITAf
# BgNVBAMTGE1pY3Jvc29mdCBUaW1lLVN0YW1wIFBDQTCCASIwDQYJKoZIhvcNAQEB
# BQADggEPADCCAQoCggEBAJ+hbLHf20iSKnxrLhnhveLjxZlRI1Ctzt0YTiQP7tGn
# 0UytdDAgEesH1VSVFUmUG0KSrphcMCbaAGvoe73siQcP9w4EmPCJzB/LMySHnfL0
# Zxws/HvniB3q506jocEjU8qN+kXPCdBer9CwQgSi+aZsk2fXKNxGU7CG0OUoRi4n
# rIZPVVIM5AMs+2qQkDBuh/NZMJ36ftaXs+ghl3740hPzCLdTbVK0RZCfSABKR2YR
# JylmqJfk0waBSqL5hKcRRxQJgp+E7VV4/gGaHVAIhQAQMEbtt94jRrvELVSfrx54
# QTF3zJvfO4OToWECtR0Nsfz3m7IBziJLVP/5BcPCIAsCAwEAAaOCAaswggGnMA8G
# A1UdEwEB/wQFMAMBAf8wHQYDVR0OBBYEFCM0+NlSRnAK7UD7dvuzK7DDNbMPMAsG
# A1UdDwQEAwIBhjAQBgkrBgEEAYI3FQEEAwIBADCBmAYDVR0jBIGQMIGNgBQOrIJg
# QFYnl+UlE/wq4QpTlVnkpKFjpGEwXzETMBEGCgmSJomT8ixkARkWA2NvbTEZMBcG
# CgmSJomT8ixkARkWCW1pY3Jvc29mdDEtMCsGA1UEAxMkTWljcm9zb2Z0IFJvb3Qg
# Q2VydGlmaWNhdGUgQXV0aG9yaXR5ghB5rRahSqClrUxzWPQHEy5lMFAGA1UdHwRJ
# MEcwRaBDoEGGP2h0dHA6Ly9jcmwubWljcm9zb2Z0LmNvbS9wa2kvY3JsL3Byb2R1
# Y3RzL21pY3Jvc29mdHJvb3RjZXJ0LmNybDBUBggrBgEFBQcBAQRIMEYwRAYIKwYB
# BQUHMAKGOGh0dHA6Ly93d3cubWljcm9zb2Z0LmNvbS9wa2kvY2VydHMvTWljcm9z
# b2Z0Um9vdENlcnQuY3J0MBMGA1UdJQQMMAoGCCsGAQUFBwMIMA0GCSqGSIb3DQEB
# BQUAA4ICAQAQl4rDXANENt3ptK132855UU0BsS50cVttDBOrzr57j7gu1BKijG1i
# uFcCy04gE1CZ3XpA4le7r1iaHOEdAYasu3jyi9DsOwHu4r6PCgXIjUji8FMV3U+r
# kuTnjWrVgMHmlPIGL4UD6ZEqJCJw+/b85HiZLg33B+JwvBhOnY5rCnKVuKE5nGct
# xVEO6mJcPxaYiyA/4gcaMvnMMUp2MT0rcgvI6nA9/4UKE9/CCmGO8Ne4F+tOi3/F
# NSteo7/rvH0LQnvUU3Ih7jDKu3hlXFsBFwoUDtLaFJj1PLlmWLMtL+f5hYbMUVbo
# nXCUbKw5TNT2eb+qGHpiKe+imyk0BncaYsk9Hm0fgvALxyy7z0Oz5fnsfbXjpKh0
# NbhOxXEjEiZ2CzxSjHFaRkMUvLOzsE1nyJ9C/4B5IYCeFTBm6EISXhrIniIh0EPp
# K+m79EjMLNTYMoBMJipIJF9a6lbvpt6Znco6b72BJ3QGEe52Ib+bgsEnVLaxaj2J
# oXZhtG6hE6a/qkfwEm/9ijJssv7fUciMI8lmvZ0dhxJkAj0tr1mPuOQh5bWwymO0
# eFQF1EEuUKyUsKV4q7OglnUa2ZKHE3UiLzKoCG6gW4wlv6DvhMoh1useT8ma7kng
# 9wFlb4kLfchpyOZu6qeXzjEp/w7FW1zYTRuh2Povnj8uVRZryROj/TGCBKUwggSh
# AgEBMIGQMHkxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpXYXNoaW5ndG9uMRAwDgYD
# VQQHEwdSZWRtb25kMR4wHAYDVQQKExVNaWNyb3NvZnQgQ29ycG9yYXRpb24xIzAh
# BgNVBAMTGk1pY3Jvc29mdCBDb2RlIFNpZ25pbmcgUENBAhMzAAAAsBGvCovQO5/d
# AAEAAACwMAkGBSsOAwIaBQCggb4wGQYJKoZIhvcNAQkDMQwGCisGAQQBgjcCAQQw
# HAYKKwYBBAGCNwIBCzEOMAwGCisGAQQBgjcCARUwIwYJKoZIhvcNAQkEMRYEFHuh
# 3hKVeuN+trh65ehaRl0ZO8B6MF4GCisGAQQBgjcCAQwxUDBOoCaAJABNAGkAYwBy
# AG8AcwBvAGYAdAAgAEwAZQBhAHIAbgBpAG4AZ6EkgCJodHRwOi8vd3d3Lm1pY3Jv
# c29mdC5jb20vbGVhcm5pbmcgMA0GCSqGSIb3DQEBAQUABIIBAIKzy+e4JTimP642
# 5OlQtxaynMUIEEWenN+cw8gN1uQe/osvGf+S8pGzjw/VXkBWSULEAaOl3xPe//o0
# hb/01KS1I+3Hu10DQIesAzkS2FizglLlzzL6jlwAXmRDbZiCL4+RwZ5+b+urXDFp
# LVP31FFGSf3O240RBb1Uus7cLs/9/e+4fgbVtd22duqln95WTokLPh3KjmHvOvGe
# eUUBffFh0MJVlQX/fAJTEOS4rOqRg4RFtPmysqvWNHz/J2mGzKaUvVdZdE/DmjKQ
# +2nwHN4ugx1dHYo3oIovUJdFu/eKkkxUokP6NTBRrqFaf7t2+ZTsq2W5ukL/ZlOm
# 92XP0aihggIoMIICJAYJKoZIhvcNAQkGMYICFTCCAhECAQEwgY4wdzELMAkGA1UE
# BhMCVVMxEzARBgNVBAgTCldhc2hpbmd0b24xEDAOBgNVBAcTB1JlZG1vbmQxHjAc
# BgNVBAoTFU1pY3Jvc29mdCBDb3Jwb3JhdGlvbjEhMB8GA1UEAxMYTWljcm9zb2Z0
# IFRpbWUtU3RhbXAgUENBAhMzAAAANCQxQMmgwXmNAAAAAAA0MAkGBSsOAwIaBQCg
# XTAYBgkqhkiG9w0BCQMxCwYJKoZIhvcNAQcBMBwGCSqGSIb3DQEJBTEPFw0xMzA3
# MTcxMTQ2MTFaMCMGCSqGSIb3DQEJBDEWBBTP47szEd02V5VvsV0PUyOogeG5lDAN
# BgkqhkiG9w0BAQUFAASCAQAePkbNJvONMzoiAhSWUjYhX5QMYH911fdMEcfU926l
# fM0zDs1pHKRjjsBIkP7YmLB5xLPHPefvF2ZqnhjtYKUPcR42FMECdziTQ40XSgWc
# a2Drnv2m3DfwF/mgjCZwcAeVF4P3rrTCNuuRf1HiYrFxlio4HZukFr1ECoW5Psbp
# 0aRAQwGygIMNrexxKSJ4j6kyRjIkHwEIkP0w7x1QoVzvCcLbcrB2+AiEFQtLabYT
# qYY/Sd1wjuYM44iCPu7dLvp/hxf3EFWwKrpU+QXWNTz1mA0v9k21SqBefDi0ymxB
# V/M2oCnzMEIPlcJ7ZUcbMG1f/MuVQRTfPDFTeU2N2tpP
# SIG # End signature block
