Configuration SetupActiveDirectory
{
    Import-DscResource -ModuleName PSDesiredStateConfiguration
    Import-DscResource -ModuleName xActiveDirectory
    Import-DscResource -ModuleName xDNSServer

    AllNodes = @(
        @{
            NodeName                    = "DC01"
            DomainName                  = "aston.local"
            LocalAdminPassword          = 'Pa$$w0rd'
            DomainAdminPassword         = 'Pa$$w0rd'
            Role                        = "Primary DC"
            Forwarders                  = @('8.8.8.8','8.8.4.4')
            PsDscAllowPlainTextPassword = $True
            InstallRSATTools            = $True
        }
    )

    Node $AllNodes.NodeName {

        # Pour les Admin Credentials
        If ($Node.LocalAdminPassword) {
            [PSCredential]$LocalAdminCredential = New-Object System.Management.Automation.PSCredential ("Administrator", (ConvertTo-SecureString $Node.LocalAdminPassword -AsPlainText -Force))
        }

        If ($Node.DomainAdminPassword) {
            [PSCredential]$DomainAdminCredential = New-Object System.Management.Automation.PSCredential ("Administrator", (ConvertTo-SecureString $Node.DomainAdminPassword -AsPlainText -Force))
        }

        #  Configuration locale
        LocalConfigurationManager
        {
            ActionAfterReboot = 'ContinueConfiguration'
            ConfigurationMode = 'ApplyOnly'
            RebootNodeIfNeeded = $true
        }

        WindowsFeature DNSInstall
        {
            Ensure = "Present"
            Name   = "DNS"
        }

        WindowsFeature ADDSInstall
        {
            Ensure    = "Present"
            Name      = "AD-Domain-Services"
            DependsOn = "[WindowsFeature]DNSInstall"
        }

        WindowsFeature RSAT-AD-PowerShellInstall
        {
            Ensure    = "Present"
            Name      = "RSAT-AD-PowerShell"
            DependsOn = "[WindowsFeature]ADDSInstall"
        }

        if ($Node.InstallRSATTools -eq $true)
        {
            WindowsFeature RSAT-ManagementTool-AD
            {
                Ensure    = "Present"
                Name      = "RSAT-AD-Tools"
                DependsOn = "[WindowsFeature]ADDSInstall"
            }
            WindowsFeature RSAT-ManagementTool-DNS
            {
                Ensure    = "Present"
                Name      = "RSAT-DNS-Server"
                DependsOn = "[WindowsFeature]ADDSInstall"
            }
        }

        if($Node.Role -eq "Primary DC")
        {
            xADDomain PrimaryDC
            {
                DomainName                    = $Node.DomainName
                DomainAdministratorCredential = $DomainAdminCredential
                SafemodeAdministratorPassword = $LocalAdminCredential
                DependsOn                     = "[WindowsFeature]ADDSInstall"
            }

            xWaitForADDomain DscForestWait
            {
                DomainName           = $Node.DomainName
                DomainUserCredential = $DomainAdminCredential
                RetryCount           = 20
                RetryIntervalSec     = 30
                DependsOn            = "[xADDomain]PrimaryDC"
            }

            # Activer la Corbeille AD
            xADRecycleBin RecycleBin
            {
                EnterpriseAdministratorCredential = $DomainAdminCredential
                ForestFQDN                        = $Node.DomainName
                DependsOn                         = "[xWaitForADDomain]DscForestWait"
            }

            # Installation de KDS Root Key
            Script CreateKDSRootKey
            {
                SetScript = {
                    Add-KDSRootKey -EffectiveTime ((Get-Date).AddHours(-10))
                }
                GetScript = {
                    Return @{
                        KDSRootKey = (Get-KDSRootKey)
                    }
                }
                TestScript = {
                    If (-not (Get-KDSRootKey)) {
                        Write-Verbose -Message "KDS Root Key Needs to be installed..."
                        Return $False
                    }
                    Return $True
                }
                DependsOn = '[xWaitForADDomain]DscForestWait'
            }
        }
        else
        {

            xWaitForADDomain DscForestWait
            {
                DomainName           = $Node.DomainName
                DomainUserCredential = $DomainAdminCredential
                RetryCount           = 100
                RetryIntervalSec     = 10
                DependsOn            = "[WindowsFeature]ADDSInstall"
            }

            xADDomainController SecondaryDC
            {
                DomainName                    = $Node.DomainName
                DomainAdministratorCredential = $DomainAdminCredential
                SafemodeAdministratorPassword = $LocalAdminCredential
                DependsOn                     = "[xWaitForADDomain]DscForestWait"
            }
        }

        # Partie DNS
        if ($Node.Forwarders)
        {
            xDnsServerForwarder DNSForwarders
            {
                IsSingleInstance = 'Yes'
                IPAddresses      = $Node.Forwarders
                DependsOn        = "[xWaitForADDomain]DscForestWait"
            }
        }
    }
}