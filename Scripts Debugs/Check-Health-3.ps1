<# $test =  Get-Counter "\\LAPTOP-19\Battery Status(ACPI\PNP0C0A\1_0)\Voltage"
Get-Counter "\\LAPTOP-19\Battery Status(ACPI\PNP0C0A\1_0)\Voltage"

typeperf -q | Select-String "^\\Activité*"
typeperf "\Battery Status(*)\Charge Rate"

$test = Get-Counter -ListSet * | Select-Object -Property Paths | Select-String "{\Battery*"
$test = Get-Counter -ListSet SMB

$computerName = (Get-WmiObject Win32_ComputerSystem).Name
Get-Counter -ComputerName "\\$computerName\Battery Status(ACPI\PNP0C0A\1_0)\Voltage"

Get-Counter -ListSet * |
  Sort-Object -Property CounterSetName |
    Format-Table CounterSetName, CounterSetType -AutoSize |
      Out-File test.txt

(Get-Counter -ListSet "Activité de la carte d’interface réseau physique").Paths | Where-Object { $_ -like "*Voltage*" }

Get-Counter -Counter "\Mémoire\Octets du cache" -MaxSamples 10

Get-Counter "\Activité de la carte d’interface réseau physique(*)\Transitions vers faible consommation d’énergie (vie entière)"
Get-Counter "\Activité de la carte d’interface réseau physique(*)\% temps d’interruption (vie entière)"
Get-Counter "\Activité de la carte d’interface réseau physique(*)\% temps d’interruption (instantané)"
Get-Counter "\Activité de la carte d’interface réseau physique(*)\État d’alimentation du périphérique"

Get-Counter "\Activité du disque système de fichiers(*)\Octets écrits par le système de fichiers"
Get-Counter "\Activité du disque système de fichiers(*)\Octets lus par le système de fichiers"

Get-Counter "\BitLocker(*)\Sous-requêtes d'écriture/s"
Get-Counter "\BitLocker(*)\Requêtes d'écriture/s"
Get-Counter "\BitLocker(*)\Sous-requêtes de lecture/s"
Get-Counter "\BitLocker(*)\Requêtes de lecture/s"
Get-Counter "\BitLocker(*)\Taille de fractionnement d'écriture maximale"
Get-Counter "\BitLocker(*)\Taille de fractionnement d'écriture minimale"
Get-Counter "\BitLocker(*)\Taille de fractionnement de lecture maximale"
Get-Counter "\BitLocker(*)\Taille de fractionnement de lecture minimale"

Get-Counter "\Carte réseau(*)\Total des octets/s"
Get-Counter "\Carte réseau(*)\Paquets/s"
(Get-Counter "\Carte réseau(*)\Paquets reçus/s").CounterSamples | Format-List -Property *
Get-Counter "\Carte réseau(*)\Paquets envoyés/s"
(Get-Counter "\Carte réseau(*)\Bande passante actuelle").CounterSamples | Format-List -Property *
Get-Counter "\Carte réseau(*)\Octets reçus/s"
Get-Counter "\Carte réseau(*)\Paquets monodiffusion reçus/s"
Get-Counter "\Carte réseau(*)\Paquets non monodiffusion reçus/s"
Get-Counter "\Carte réseau(*)\Paquets reçus et rejetés"
Get-Counter "\Carte réseau(*)\Paquets reçus, erreurs"
Get-Counter "\Carte réseau(*)\Paquets reçus, inconnus"
Get-Counter "\Carte réseau(*)\Octets envoyés/s"
Get-Counter "\Carte réseau(*)\Paquets monodiffusion envoyés/s"
Get-Counter "\Carte réseau(*)\Paquets non monodiffusion envoyés/s"
Get-Counter "\Carte réseau(*)\Connexions TCP RSC actives"
Get-Counter "\Carte réseau(*)\Taille moyenne des paquets TCP RSC"

Get-Counter "\Client LDAP(*)\Réponses : réponses d'interrogation d'échec/s"
Get-Counter "\Client LDAP(*)\Réponses : réponses d'interrogation réussies/s"
Get-Counter "\Client LDAP(*)\Réponses : réponses en attente"
Get-Counter "\Client LDAP(*)\Réponses : temps de réponse moyen"
Get-Counter "\Client LDAP(*)\Réponses : réponses d'échec/s"
Get-Counter "\Client LDAP(*)\Réponses : réponses réussies/s"
Get-Counter "\Client LDAP(*)\Opérations : abandons/s"
Get-Counter "\Client LDAP(*)\Opérations : suppressions/s"
Get-Counter "\Client LDAP(*)\Opérations : ajouts/s"
Get-Counter "\Client LDAP(*)\Liaisons : liaisons de négociation/s"
Get-Counter "\Client LDAP(*)\Liaisons : liaisons NTLM/s"
Get-Counter "\Client LDAP(*)\Liaisons : liaisons Digest/s"
Get-Counter "\Client LDAP(*)\Liaisons : liaisons simples/s"
Get-Counter "\Client LDAP(*)\Liaisons : nombre total de liaisons/s"
Get-Counter "\Client LDAP(*)\Opérations : Modification/s"
Get-Counter "\Client LDAP(*)\Recherches : recherches de sous-arborescence/s"
Get-Counter "\Client LDAP(*)\Recherches : recherches dans le dossier parent/s"
Get-Counter "\Client LDAP(*)\Recherches : recherches de base/s"
Get-Counter "\Client LDAP(*)\Connexions : nouvelles connexions TLS/s"
Get-Counter "\Client LDAP(*)\Connexions : nouvelles connexions UDP/s"
Get-Counter "\Client LDAP(*)\Connexions : nouvelles connexions TCP/s"
Get-Counter "\Client LDAP(*)\Demandes : nouvelles demandes/s"
Get-Counter "\Client LDAP(*)\Connexions : nouvelles connexions/s"
Get-Counter "\Client LDAP(*)\Demandes : nombre de demandes"
Get-Counter "\Client LDAP(*)\Connexions : connexions ouvertes"

Get-Counter "\Disque logique(*)\% d'espace libre"
Get-Counter "\Disque logique(*)\Mégaoctets libres"
Get-Counter "\Disque logique(*)\Pourcentage du temps disque"
Get-Counter "\Disque logique(*)\Longueur moyenne de file d'attente du disque"
Get-Counter "\Disque logique(*)\Pourcentage du temps de lecture du disque"
Get-Counter "\Disque logique(*)\Longueur moyenne de file d'attente lecture disque"
Get-Counter "\Disque logique(*)\Pourcentage du temps écriture du disque"
Get-Counter "\Disque logique(*)\Longueur moyenne de file d'attente écriture disque"
Get-Counter "\Disque logique(*)\Moyenne disque s/transfert"
Get-Counter "\Disque logique(*)\Moyenne disque s/lecture"
Get-Counter "\Disque logique(*)\Moyenne disque s/écriture"
Get-Counter "\Disque logique(*)\Transferts disque/s"
Get-Counter "\Disque logique(*)\Lectures disque/s"
Get-Counter "\Disque logique(*)\Écritures disque/s"
Get-Counter "\Disque logique(*)\Moyenne disque, octets/transfert"
Get-Counter "\Disque logique(*)\Moyenne disque, octets/lecture"
Get-Counter "\Disque logique(*)\Moyenne disque, octets/écriture"
Get-Counter "\Disque logique(*)\% d'inactivité"
Get-Counter "\Disque logique(*)\E/S partagées/s"

Get-Counter "\Disque physique(*)\Pourcentage du temps disque"
Get-Counter "\Disque physique(*)\Longueur moyenne de file d'attente du disque"
Get-Counter "\Disque physique(*)\Pourcentage du temps de lecture du disque"
Get-Counter "\Disque physique(*)\Pourcentage du temps écriture du disque"
Get-Counter "\Disque physique(*)\Longueur moyenne de file d'attente écriture disque"
Get-Counter "\Disque physique(*)\Moyenne disque s/transfert"
Get-Counter "\Disque physique(*)\Moyenne disque s/lecture"
Get-Counter "\Disque physique(*)\Moyenne disque s/écriture"
Get-Counter "\Disque physique(*)\Transferts disque/s"
Get-Counter "\Disque physique(*)\Lectures disque/s"
Get-Counter "\Disque physique(*)\Écritures disque/s"
Get-Counter "\Disque physique(*)\Octets disque/s"
Get-Counter "\Disque physique(*)\Lectures disque, octets/s"
Get-Counter "\Disque physique(*)\Écritures disque, octets/s"
Get-Counter "\Disque physique(*)\Moyenne disque, octets/transfert"
Get-Counter "\Disque physique(*)\Moyenne disque, octets/lecture"
Get-Counter "\Disque physique(*)\Moyenne disque, octets/écriture"
Get-Counter "\Disque physique(*)\% d'inactivité"
Get-Counter "\Disque physique(*)\E/S partagées/s"

Get-Counter "\Fichier d'échange(*)\Pourcentage d'utilisation"
Get-Counter "\Fichier d'échange(*)\Usage maximal"

(Get-Counter "\GPU Adapter Memory(*)\Shared Usage").CounterSamples | Format-List -Property *
Get-Counter "\GPU Adapter Memory(*)\Dedicated Usage"
Get-Counter "\GPU Adapter Memory(*)\Total Committed"

Get-Counter "\GPU Engine(*)\Utilization Percentage"
Get-Counter "\GPU Engine(*)\Running Time"

Get-Counter "\GPU Local Adapter Memory(*)\Local Usage"

Get-Counter "\GPU Process Memory(*)\Shared Usage"
Get-Counter "\GPU Process Memory(*)\Dedicated Usage"
Get-Counter "\GPU Process Memory(*)\Non Local Usage"
Get-Counter "\GPU Process Memory(*)\Local Usage"
Get-Counter "\GPU Process Memory(*)\Total Committed"

Get-Counter "\ICMP\Messages/s"
Get-Counter "\ICMP\Messages reçus/s"
Get-Counter "\ICMP\Messages reçus, erreurs"
Get-Counter "\ICMP\Reçus avec destination inaccessible"
Get-Counter "\ICMP\Reçus avec temps dépassé"
Get-Counter "\ICMP\Reçus avec problème de paramètre"
Get-Counter "\ICMP\Reçus avec redirection/s"
Get-Counter "\ICMP\Reçus avec écho/s"
Get-Counter "\ICMP\Reçus avec réponse à écho/s"
Get-Counter "\ICMP\Reçus avec horodateur/s"
Get-Counter "\ICMP\Reçus avec réponse à horodateur/s"
Get-Counter "\ICMP\Reçus avec masque d'adresse"
Get-Counter "\ICMP\Reçus avec réponse à masque d'adresse"
Get-Counter "\ICMP\Messages envoyés/s"
Get-Counter "\ICMP\Messages envoyés, erreurs"
Get-Counter "\ICMP\Envoyés destination inaccessible"
Get-Counter "\ICMP\Envoyés temps dépassé"
Get-Counter "\ICMP\Envoyés problème de paramètre"
Get-Counter "\ICMP\Envoyés extinction de source"
Get-Counter "\ICMP\Envoyés avec redirection/s"
Get-Counter "\ICMP\Envoyés avec écho/s"
Get-Counter "\ICMP\Envoyés avec réponse à écho/s"
Get-Counter "\ICMP\Envoyés avec horodateur/s"
Get-Counter "\ICMP\Envoyés avec rép. à horodateur/s"
Get-Counter "\ICMP\Envoyés avec masque d'adresse"
Get-Counter "\ICMP\Envoyés avec rép. à masque d'adresse"

Get-Counter "\Indexeur de recherche(*)\Niveau de l'index principal."
Get-Counter "\Indexeur de recherche(*)\Fusions principales à ce jour"
Get-Counter "\Indexeur de recherche(*)\Fusion principale en cours"
Get-Counter "\Indexeur de recherche(*)\Niveaux de fusion virtuelle"
Get-Counter "\Indexeur de recherche(*)\Seuil des niveaux de fusion virtuelle"
Get-Counter "\Indexeur de recherche(*)\Index permanents"
Get-Counter "\Indexeur de recherche(*)\Taille de l'index"

Get-Counter "\Informations de zone thermique(*)\Température de haute précision"
Get-Counter "\Informations de zone thermique(*)\Motifs de la limitation"
Get-Counter "\Informations de zone thermique(*)\% de la limite passive"
Get-Counter "\Informations de zone thermique(*)\Température"

Get-Counter "\Informations sur le processeur(*)\Indicateurs de limite de performances"
Get-Counter "\Informations sur le processeur(*)\% de la limite de performances"
Get-Counter "\Informations sur le processeur(*)\Pourcentage de rendement privilégié"
Get-Counter "\Informations sur le processeur(*)\Pourcentage de rendement du processeur"
Get-Counter "\Informations sur le processeur(*)\Pourcentage de performances du processeur"
Get-Counter "\Informations sur le processeur(*)\Événements de sortie d'inactivité/seconde"
Get-Counter "\Informations sur le processeur(*)\Temps moyen d'inactivité"
Get-Counter "\Informations sur le processeur(*)\Interruptions d'horloge/seconde"
Get-Counter "\Informations sur le processeur(*)\Indicateurs de l'état du processeur"
Get-Counter "\Informations sur le processeur(*)\% de fréquence maximale"
Get-Counter "\Informations sur le processeur(*)\Fréquence du processeur"
Get-Counter "\Informations sur le processeur(*)\État de parcage"
Get-Counter "\Informations sur le processeur(*)\% Temps de priorité"
Get-Counter "\Informations sur le processeur(*)\C3 Transitions/s"
Get-Counter "\Informations sur le processeur(*)\C2 Transitions/s"
Get-Counter "\Informations sur le processeur(*)\C1 Transitions/s"
Get-Counter "\Informations sur le processeur(*)\% durée C3"
Get-Counter "\Informations sur le processeur(*)\% durée C2"
Get-Counter "\Informations sur le processeur(*)\% durée C1"
Get-Counter "\Informations sur le processeur(*)\% d'inactivité"
Get-Counter "\Informations sur le processeur(*)\Taux DPC"
Get-Counter "\Informations sur le processeur(*)\DPC mis en file d'attente/s"
Get-Counter "\Informations sur le processeur(*)\% temps d'interruption"
Get-Counter "\Informations sur le processeur(*)\% Temps DPC"
Get-Counter "\Informations sur le processeur(*)\Interruptions/s"
Get-Counter "\Informations sur le processeur(*)\% temps privilégié"
Get-Counter "\Informations sur le processeur(*)\% temps utilisateur"
Get-Counter "\Informations sur le processeur(*)\% temps processeur"

Get-Counter "\Interface réseau(*)\Total des octets/s"
Get-Counter "\Interface réseau(*)\Paquets/s"
Get-Counter "\Interface réseau(*)\Paquets reçus/s"
Get-Counter "\Interface réseau(*)\Paquets envoyés/s"
Get-Counter "\Interface réseau(*)\Bande passante actuelle"
Get-Counter "\Interface réseau(*)\Octets reçus/s"
Get-Counter "\Interface réseau(*)\Paquets monodiffusion reçus/s"
Get-Counter "\Interface réseau(*)\Paquets non monodiffusion reçus/s"
Get-Counter "\Interface réseau(*)\Paquets reçus et rejetés"
Get-Counter "\Interface réseau(*)\Paquets reçus, erreurs"
Get-Counter "\Interface réseau(*)\Paquets reçus, inconnus"
Get-Counter "\Interface réseau(*)\Octets envoyés/s"
Get-Counter "\Interface réseau(*)\Paquets monodiffusion envoyés/s"
Get-Counter "\Interface réseau(*)\Paquets non monodiffusion envoyés/s"
Get-Counter "\Interface réseau(*)\Paquets sortants rejetés"
Get-Counter "\Interface réseau(*)\Paquets sortants, erreurs"
Get-Counter "\Interface réseau(*)\Longueur de la file d'attente de sortie"
Get-Counter "\Interface réseau(*)\Connexions déchargées"
Get-Counter "\Interface réseau(*)\Connexions TCP RSC actives"
Get-Counter "\Interface réseau(*)\Paquets TCP RSC fusionnés/seconde"
Get-Counter "\Interface réseau(*)\Exceptions TCP RSC/seconde"
Get-Counter "\Interface réseau(*)\Taille moyenne des paquets TCP RSC"

Get-Counter "\IPv4\Datagrammes/s"
Get-Counter "\IPv4\Datagrammes reçus/s"
Get-Counter "\IPv4\Datagrammes reçus, erreurs d'en-tête"
Get-Counter "\IPv4\Datagrammes reçus, erreurs d'adresse"
Get-Counter "\IPv4\Datagrammes transmis/s"
Get-Counter "\IPv4\Datagrammes reçus, protocole inconnu"
Get-Counter "\IPv4\Datagrammes reçus et rejetés"
Get-Counter "\IPv4\Datagrammes reçus et livrés/s"
Get-Counter "\IPv4\Datagrammes envoyés/s"
Get-Counter "\IPv4\Datagrammes sortants rejetés"
Get-Counter "\IPv4\Datagrammes sortants non routés"
Get-Counter "\IPv4\Fragments reçus/s"
Get-Counter "\IPv4\Fragments réassemblés/s"
Get-Counter "\IPv4\Échecs de réassemblage"
Get-Counter "\IPv4\Datagrammes fragmentés/s"
Get-Counter "\IPv4\Échecs de fragmentation"
Get-Counter "\IPv4\Fragments créés/s"

Get-Counter "\Journal des événements\Opérations de filtre d'événement/s"
Get-Counter "\Journal des événements\Abonnements actifs"
Get-Counter "\Journal des événements\Appels ELF RPC/s"
Get-Counter "\Journal des événements\Événements/s"
Get-Counter "\Journal des événements\Appels WEVT RPC/s"
Get-Counter "\Journal des événements\Canaux activés"

Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes de prise en charge de KeyList requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes TryNextClosestSite/sec"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes DS requises (WS2016+)/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes DS requises (WS2012 R2+)/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes DS requises (WS2012+)/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes DS requises (WS2008+)/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes DS requises (W2K+)/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes de serveur de temps requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes GC requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : demandes KDC requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes de nom de site/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : requêtes de la redécouverte forcées/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : requêtes accessibles en écriture requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Indicateurs : requêtes du contrôleur de domaine principal (PDC) requises/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes : latence d'échec moyenne (en secondes)"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes : latence moyenne de réussite (en secondes)"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes : nombre total de requêtes actives"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes : échecs/s"
Get-Counter "\Localisateur de contrôleurs de domaine (client)(*)\Requêtes : réussites/s"

Get-Counter "\Mémoire\Défauts de page/s"
Get-Counter "\Mémoire\Octets disponibles"
Get-Counter "\Mémoire\Octets validés"
Get-Counter "\Mémoire\Limite de mémoire dédiée"
Get-Counter "\Mémoire\Copies pour écriture/s"
Get-Counter "\Mémoire\Défauts en transit/s"
Get-Counter "\Mémoire\Défauts de cache/s"
Get-Counter "\Mémoire\Défauts de page à zéro/s"
Get-Counter "\Mémoire\Pages/s"
Get-Counter "\Mémoire\Pages en entrée/s"
Get-Counter "\Mémoire\Lectures de pages/s"
Get-Counter "\Mémoire\Pages en sortie/s"
Get-Counter "\Mémoire\Octets de réserve paginée"
Get-Counter "\Mémoire\Octets de réserve non paginée"
Get-Counter "\Mémoire\Écritures de pages/s"
Get-Counter "\Mémoire\Allocations de réserve paginée"
Get-Counter "\Mémoire\Allocations de réserve non paginée"
Get-Counter "\Mémoire\Entrées libres en table des pages système"
Get-Counter "\Mémoire\Octets du cache"
Get-Counter "\Mémoire\Octets max. du cache"
Get-Counter "\Mémoire\Octets résidants de réserve paginée"
Get-Counter "\Mémoire\Total des octets dans le code système"
Get-Counter "\Mémoire\Octets résidants dans le code système"
Get-Counter "\Mémoire\Total des octets dans le pilote système"
Get-Counter "\Mémoire\Octets résidants dans le pilote système"
Get-Counter "\Mémoire\Octets résidants dans le cache système"
Get-Counter "\Mémoire\Pourcentage d'octets dédiés utilisés"
Get-Counter "\Mémoire\Kilo-octets disponibles"
Get-Counter "\Mémoire\Mégaoctets disponibles"
Get-Counter "\Mémoire\Pages de transition avec nouvel objet/s"
Get-Counter "\Mémoire\Octets des listes de pages vides et pages de zéros"
Get-Counter "\Mémoire\Octets de la liste des pages modifiées"
Get-Counter "\Mémoire\Octets de réserve du cache en attente"
Get-Counter "\Mémoire\Octets du cache en attente de priorité normale"
Get-Counter "\Mémoire\Octets de base du cache en attente"

Get-Counter "\Partages de clients SMB(*)\Demandes compressées réussies/s"
Get-Counter "\Partages de clients SMB(*)\Octets compressés envoyés/s"
Get-Counter "\Partages de clients SMB(*)\Réponses compressées/s"

Get-Counter "\Partages de serveurs SMB(*)\Tentatives de demandes compressées/s"
Get-Counter "\Partages de serveurs SMB(*)\Demandes compressées/s"
Get-Counter "\Partages de serveurs SMB(*)\Réponses compressées réussies/sec"
Get-Counter "\Partages de serveurs SMB(*)\Octets compressés/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets d'écriture transmis via fichier CSV de contournement/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets de lecture transmis via fichier CSV de contournement/s"
Get-Counter "\Partages de serveurs SMB(*)\Demandes de lecture transmises via fichier CSV de contournement/s"
Get-Counter "\Partages de serveurs SMB(*)\Demandes d'écriture transmises via fichier CSV de contournement/s"
Get-Counter "\Partages de serveurs SMB(*)\Nombre de fichiers ouverts de contournement actuels"
Get-Counter "\Partages de serveurs SMB(*)\Octets de lecture directs transmis via SMB/s"
Get-Counter "\Partages de serveurs SMB(*)\Demandes de lecture directes transmises via SMB/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets d'écriture directs transmis via SMB/s"
Get-Counter "\Partages de serveurs SMB(*)\Demandes d'écriture directes transmises via SMB/s"
Get-Counter "\Partages de serveurs SMB(*)\Longueur de la file d'attente de données actuelle"
Get-Counter "\Partages de serveurs SMB(*)\Demandes de données/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets de données/s"
Get-Counter "\Partages de serveurs SMB(*)\Longueur moyenne de la file d'attente de données"
Get-Counter "\Partages de serveurs SMB(*)\Longueur moyenne de la file d'attente d'écriture"
Get-Counter "\Partages de serveurs SMB(*)\Longueur moyenne de la file d'attente de lecture"
Get-Counter "\Partages de serveurs SMB(*)\Nombre moyen d'octets/écriture"
Get-Counter "\Partages de serveurs SMB(*)\Nombre moyen d'octets/lecture"
Get-Counter "\Partages de serveurs SMB(*)\Nombre moyen d'octets de données/demande"
Get-Counter "\Partages de serveurs SMB(*)\Durée moyenne en secondes/demande de données"
Get-Counter "\Partages de serveurs SMB(*)\Demandes de métadonnées/s"
Get-Counter "\Partages de serveurs SMB(*)\Nb total d'échecs de réouvertures de handles persistants"
Get-Counter "\Partages de serveurs SMB(*)\Nb total de réouvertures de handles persistants"
Get-Counter "\Partages de serveurs SMB(*)\% handles persistants"
Get-Counter "\Partages de serveurs SMB(*)\Nb total d'échecs de réouvertures de handles"
Get-Counter "\Partages de serveurs SMB(*)\Nb total de réouvertures résistantes de handles"
Get-Counter "\Partages de serveurs SMB(*)\% handles résistants"
Get-Counter "\Partages de serveurs SMB(*)\Nb total d'échecs de réouvertures durables de handles"
Get-Counter "\Partages de serveurs SMB(*)\Nb total de réouvertures durables de handles"
Get-Counter "\Partages de serveurs SMB(*)\Nombre de fichiers ouverts durables actuels"
Get-Counter "\Partages de serveurs SMB(*)\Fichiers ouverts/s"
Get-Counter "\Partages de serveurs SMB(*)\Nombre global des fichiers ouverts"
Get-Counter "\Partages de serveurs SMB(*)\Octets lus/s"
Get-Counter "\Partages de serveurs SMB(*)\Temps moyen en secondes/lecture"
Get-Counter "\Partages de serveurs SMB(*)\Demandes de lecture/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets écrits/s"
Get-Counter "\Partages de serveurs SMB(*)\Temps moyen en secondes/écriture"
Get-Counter "\Partages de serveurs SMB(*)\Demandes d'écriture/s"
Get-Counter "\Partages de serveurs SMB(*)\Temps moyen en secondes/demande"
Get-Counter "\Partages de serveurs SMB(*)\Demandes en attente"
Get-Counter "\Partages de serveurs SMB(*)\Octets transférés/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets envoyés/s"
Get-Counter "\Partages de serveurs SMB(*)\Nombre de fichiers ouverts"
Get-Counter "\Partages de serveurs SMB(*)\Nombre de connexions d'arborescence"
Get-Counter "\Partages de serveurs SMB(*)\Nb de demandes/s"
Get-Counter "\Partages de serveurs SMB(*)\Octets reçus/s"

Get-Counter "\Processeur(*)\% temps processeur"
Get-Counter "\Processeur(*)\% temps utilisateur"
Get-Counter "\Processeur(*)\% temps privilégié"
Get-Counter "\Processeur(*)\Interruptions/s"
Get-Counter "\Processeur(*)\% temps DPC"
Get-Counter "\Processeur(*)\% temps d'interruption"
Get-Counter "\Processeur(*)\DPC mis en file d'attente/s"
Get-Counter "\Processeur(*)\Taux DPC"
Get-Counter "\Processeur(*)\% d'inactivité"
Get-Counter "\Processeur(*)\% durée C1"
Get-Counter "\Processeur(*)\% durée C2"
Get-Counter "\Processeur(*)\% durée C3"
Get-Counter "\Processeur(*)\Transitions C1/s"
Get-Counter "\Processeur(*)\Transitions C2/s"
Get-Counter "\Processeur(*)\Transitions C3/s"

Get-Counter "\Serveur SMB\Octets reçus/s"
Get-Counter "\Serveur SMB\Octets envoyés/s"
Get-Counter "\Serveur SMB\Demandes d'écriture/s"
Get-Counter "\Serveur SMB\Octets écrits/s"
Get-Counter "\Serveur SMB\Demandes de lecture/s"
Get-Counter "\Serveur SMB\Octets lus/s"

Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes AS d'approbation de clés KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS prenant en charge les revendications du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS de délégation contrainte de type de ressource du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS de délégation contrainte de type classique du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS d'identité déclarée par un service prenant en charge les revendications du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes AS prenant en charge les revendications du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS blindées du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes AS blindées du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes Kerberos transmises"
Get-Counter "\Statistiques de sécurité au niveau du système\Authentifications Digest"
Get-Counter "\Statistiques de sécurité au niveau du système\Négociations de reconnexions SSL côté serveur"
Get-Counter "\Statistiques de sécurité au niveau du système\Négociations complètes SSL côté serveur"
Get-Counter "\Statistiques de sécurité au niveau du système\Négociations de reconnexions SSL côté client"
Get-Counter "\Statistiques de sécurité au niveau du système\Négociations complètes SSL côté client"
Get-Counter "\Statistiques de sécurité au niveau du système\Entrées du cache de sessions Schannel actives"
Get-Counter "\Statistiques de sécurité au niveau du système\Entrées du cache de sessions Schannel"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes TGS du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Requêtes AS du KDC"
Get-Counter "\Statistiques de sécurité au niveau du système\Authentifications Kerberos"
Get-Counter "\Statistiques de sécurité au niveau du système\Authentifications NTLM"

Get-Counter "\Statistiques de sécurité par processus(*)\Handles de contexte"
Get-Counter "\Statistiques de sécurité par processus(*)\Handles d'informations d'identification"

Get-Counter "\Suivi des événements pour Windows\Utilisation totale de la mémoire --- Pool non paginé"
Get-Counter "\Suivi des événements pour Windows\Utilisation totale de la mémoire --- Pool paginé"
Get-Counter "\Suivi des événements pour Windows\Nombre total de sessions actives"
Get-Counter "\Suivi des événements pour Windows\Nombre total de fournisseurs désactivés distincts"
Get-Counter "\Suivi des événements pour Windows\Nombre total de fournisseurs préactivés distincts"
Get-Counter "\Suivi des événements pour Windows\Nombre total de fournisseurs activés distincts"

Get-Counter "\Suivi des événements pour une session Windows(*)\Nombre de consommateurs en temps réel"
Get-Counter "\Suivi des événements pour une session Windows(*)\Événements perdus"
Get-Counter "\Suivi des événements pour une session Windows(*)\Événements consignés par seconde"
Get-Counter "\Suivi des événements pour une session Windows(*)\Utilisation de la mémoire tampon -- Pool non paginé"
Get-Counter "\Suivi des événements pour une session Windows(*)\Utilisation de la mémoire tampon -- Pool paginé"

Get-Counter "\Système\Opérations de lecture de fichier/s"
Get-Counter "\Système\Opérations d'écriture de fichier/s"
Get-Counter "\Système\Opérations de contrôle de fichier/s"
Get-Counter "\Système\Octets lus sur fichier/s"
Get-Counter "\Système\Octets écrits sur fichier/s"
Get-Counter "\Système\Octets de contrôle de fichier/s"
Get-Counter "\Système\Changements de contexte/s"
Get-Counter "\Système\Appels système/s"
Get-Counter "\Système\Opérations de fichier/s"
Get-Counter "\Système\Temps d'activité système"
Get-Counter "\Système\Longueur de la file du processeur"
Get-Counter "\Système\Processus"
Get-Counter "\Système\Threads"
Get-Counter "\Système\Corrections d'alignement/s"
Get-Counter "\Système\Envois d'exception/s"
Get-Counter "\Système\Émulations flottantes/s"
Get-Counter "\Système\Pourcentage de quota du Registre utilisé"

Get-Counter "\TCPv4\Segments/s"
Get-Counter "\TCPv4\Connexions établies"
Get-Counter "\TCPv4\Connexions actives"
Get-Counter "\TCPv4\Connexions passives"
Get-Counter "\TCPv4\Échecs lors d'une connexion"
Get-Counter "\TCPv4\Connexions réinitialisées"
Get-Counter "\TCPv4\Segments reçus/s"
Get-Counter "\TCPv4\Segments envoyés/s"
Get-Counter "\TCPv4\Segments retransmis/s"

#>

########################################################################

#Pour chaque symbole mal interprété mettre un espace invisible avant ou après 
#il est entre les parenthèses (ㅤ)
$fck = "╭∩╮(･◡･)╭∩╮"
$sym  = "➵ ➳ ⇥ → ➥ ◈ ↩"
$ChoixPrint = "▌ Saisissez 1, 2, 3, 4, 5, 6 ou 7" 
$tmp = Test-Path -Path "C:\Temp" 
Install-Module PSWriteColor
Import-Module PSWriteColor
$ScriptName = $MyInvocation.MyCommand.Name

$text = @"
                                                            
                          ▓▓▓▓▓▓▓▓▓▓▓▓▓▓        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓         
                         ▓▓        ▓▓▒▒▓▓      ▓▓           ▓▓▓▓        
                         ▓▓        ▓▓▒▒▒▓▓▓▓▓▓▓▓▓▓▓▓       ▓▓▒▒▓▓       
                        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▓▓▓     ▓▓       ▓▓▒▒▓▓       
                        ▓▓           ▓▓░░░▓▓      ▓▓      ▓▓▒▒▒▒▓▓      
                       ▓▓            ▓▓░░░▓▓     ▓▓       ▓▓▒▒▒▒▒▓▓     
                      ▓▓▓           ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▓▓    
                      ▓▓                                 ▓▓▒▒▒▒▒▒▓▓     
                     ▓▓                                 ▓▓▒▒▒▒▒▒▒▓▓     
                     ▓▓         ▓▓▓▓▓     ▓▓▓▓▓         ▓▓▒▒▒▒▒▒▒▓▓     
                    ▓▓▓▓▓▓▓    ▓▓▒▒▓▓    ▓▓▓▓▓▓        ▓▓▒▒▒▒▒▒▒▓▓      
                   ▓▓▓   ▓▓    ▓▓▒▒▓▓   ▓▓   ▓▓        ▓▓▒▒▒▒▒▒▒▓▓      
                   ▓▓   ▓▓▓▓▓▓▓▓▒▒▒▓   ▓▓▓  ▓▓        ▓▓▒▒▒▒▒▒▒▓▓       
                  ▓▓    ▓▓    ▓▓▒▒▓▓   ▓▓   ▓▓        ▓▓▒▒▒▒▒▒▒▓▓       
                  ▓▓   ▓▓▓▓▓▓▓▓▒▒▒▓▓▓▓▓▓   ▓▓        ▓▓░░░░░░░▓▓        
                 ▓▓         ▓▓▒▒▒▒▒▒▓▓     ▓▓        ▓▓░░░░░░░▓▓        
                 ▓▓▓▓▓▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▓▓   ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░▒▓▓        
                  ▓▓         ▓▓░░░░░░░▓▓▓            ▓▓▒░░░░░▓▓         
                   ▓▓         ▓▓▒░░░░░▓▓▓▓▓▓▓         ▓▓▓░░░░▓▓         
                    ▓▓▓        ▓▓▓░░░▓▓     ▓▓          ▓▓░░▓▓          
                      ▓▓         ▓▓░▓▓       ▓▓          ▓▓▓▓▓          
                       ▓▓▓▓▓▓▓▓▓▓▓▓▓▓         ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓           
                                                     
"@

$text2 = @"
╔═════════════════════════════════════════════════════════════════════════════════════╗ 
║                                  $ScriptName                                 ║
╚═════════════════════════════════════════════════════════════════════════════════════╝
"@

Clear-Host
Write-Host $text
Write-Host  
Write-Host $text2 

# Vérif si j'ai lancé le script en admin
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$ME = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ( $ME -eq $false ) {
    write-host 
    write-host -ForegroundColor Red "LE SCRIPT DOIT ETRE LANCÉ DANS UN POWERSHELL AVEC LES DROITS ADMINISTRATEURS"
    exit
}
else {
    write-host -NoNewline '▌ㅤScript lancé dans un shell Administrateurs ➞  '
    Write-Host -ForegroundColor Green 'OK' 
}

$Importfiles = Import-Csv -Delimiter ";" -Path "F:\scripts\Scripts Debugs\counters - Copie.csv"

$htmlResults = @()
$previousNombre = $null

# Définir les styles CSS dans une variable
$cssStyles = @"
<style>
    /* Style de base pour la page */
    body {
        margin: 0;
        padding: 0;
        min-height: 100vh;
        background: linear-gradient(0deg, #006dd4 40%, #feaf26 100%);
        background-size: cover;
        font-family: 'Arial', sans-serif;
        margin: 20px;
    }

    h1 {
        color: white;
        text-align: center;
        list-style: circle inside;
    }

    h3 {
        color: #333;
        background-color: #f5f5f5;
        padding: 10px;
        border: 1px solid #ddd;
    }

    h4 {
        margin-bottom: 5px;
        color: whitesmoke;
    }

    table {
        border-collapse: collapse;
        width: 100%;
        color: aliceblue;
    }

    td {
        border-bottom: 1px solid #ddd;
        padding: 15px;
        text-align: left;
        overflow-wrap: break-word;
        border: 1px solid #ddd;
        position: relative;
        overflow: hidden;
        transition: background-color 0.3s, color 0.3s;
    }

    td::before {
        content: "";
        position: absolute;
        left: -5px;
        right: -5px;
        bottom: 0;
        height: 4px;
        background-color: #FFEB3B;
        transform: scaleX(0);
        transform-origin: left;
        transition: transform 0.7s ease;
    }

    td:hover {
        background-color: #fff;
        color: #333;
    }

    td:hover::before {
        transform: scaleX(1);
        transform-origin: right;
    }
</style>
"@

$htmlResults += $cssStyles
$htmlResults += "<h1>Bulletin de Santé</h1>"

foreach ($files in $Importfiles) {
    $nombre = $files.Nombre
    $cmd = $files.Commande

    # Vérifier si le nombre est différent de la ligne précédente
    if ($nombre -ne $previousNombre) {
        # Extraire la catégorie de la commande
        $categorie = $cmd -split '\\', 4 | Select-Object -Index 1

        # Créer une catégorie en HTML pour chaque nombre
        $htmlCategory = @"
<h3>Catégorie $nombre : $categorie</h3>
"@

        # Ajouter la catégorie à la liste
        $htmlResults += $htmlCategory
    }

    # Extraire le titre de la commande
    $titre = $cmd -split '\\' | Select-Object -Last 1

    Write-Host -NoNewline '▌ '$cmd

    # Filtrer les échantillons où CookedValue est différent de zéro
    
    $counterSamples = Get-Counter "$cmd" 2>$null | Select-Object -ExpandProperty CounterSamples

    if ($? -eq $false) { 
        Write-Host -ForegroundColor DarkRed " [ Not OK ]" 
    } else { 
        $filteredSamples = $counterSamples | Where-Object { $_.CookedValue -ne 0 }

        # Vérifier si des échantillons non nuls sont présents
        if ($filteredSamples.Count -gt 0) {
            Write-Host -ForegroundColor Green " [ OK ]" 
            # Créer une table HTML manuellement pour les résultats filtrés
            $htmlTable = "<table>"
            foreach ($sample in $filteredSamples) {
                $htmlTable += @"
<tr>
    <td>$($sample.Path)</td>
    <td>$($sample.CookedValue)</td>
</tr>
"@
            }
            $htmlTable += "</table>"

            # Ajouter le titre et le tableau à la catégorie actuelle
            $htmlResults += @"
<h4>$titre</h4>
$htmlTable
"@
        } elseif ($filteredSamples.Count -eq 0) {
            Write-Host -ForegroundColor Yellow " [ No Data ]"
        }
    }
    # Mettre à jour la variable $previousNombre
    $previousNombre = $nombre
}

# Combinez toutes les catégories et résultats HTML
$htmlOutput = $htmlResults -join "`r`n"

# Ajoutez le HTML dans une variable ou écrivez-le dans un fichier
$htmlOutput | Out-File -FilePath "F:\scripts\Scripts Debugs\output.html" -Encoding UTF8

# Affichez le HTML dans la console
# Write-Host $htmlOutput


ls 