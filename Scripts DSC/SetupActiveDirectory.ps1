# Parameters
$Configs = @{
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
}

# Create Mof configuration
SetupActiveDirectory -ConfigurationData $Configs

# Make sure that LCM is set to continue configuration after reboot
Set-DSCLocalConfigurationManager -Path .\SetupActiveDirectory –Verbose

# Build the domain
Start-DscConfiguration -Wait -Force -Path .\SetupActiveDirectory -Verbose