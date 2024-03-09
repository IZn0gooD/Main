Configuration InstallIIS {
    param (
        [string]$NodeName = 'srv01'
    )

    Node $NodeName {
        WindowsFeature IIS {
            Ensure = 'Present'
            Name   = 'Web-Server'
        }
    }
}

# Appliquer la configuration sur le serveur cible
InstallIIS -OutputPath C:\DSC\InstallIIS
Start-DscConfiguration -Path C:\DSC\InstallIIS -Wait -Verbose
