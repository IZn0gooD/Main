Configuration ConfigureRouter {
    Import-DscResource -Module xNetworking

    Node $AllNodes.NodeName {
        # Installe et configure le rôle de Routage sur le serveur
        WindowsFeature RoutingFeature {
            Ensure = "Present"
            Name   = "Routing"
        }

        # Installe et configure le service NAT
        xNatGlobal NATGlobal {
            Ensure                  = "Present"
            RoutingDomainID         = 1
            NatAddressing           = "Private"
            AddressAllocationMode   = "Concurrent"
        }

        # Configure l'interface externe
        xNatInterface NATInterfaceExternal {
            Ensure                = "Present"
            Name                  = "External"
            InternalIPInterface  = "Ethernet1" # Nom de votre interface externe
            FirewallPolicy       = "Secure"
        }

        # Configure l'interface interne
        xNatInterface NATInterfaceInternal {
            Ensure                = "Present"
            Name                  = "Internal"
            InternalIPInterface  = "Ethernet0" # Nom de votre interface interne
            FirewallPolicy       = "Secure"
        }
    }
}

# Définir les configurations pour chaque nœud
$ConfigurationData = @{
    AllNodes = @(
        @{
            NodeName = 'Routeur1'
            PSDscAllowPlainTextPassword = $true
        }
    )
}

# Générer le fichier MOF
ConfigureRouter -ConfigurationData $ConfigurationData -OutputPath C:\DSC
