#!/bin/bash

if [ "$1" = "config" ]; then
        # Configurer les graphiques Munin
        echo 'graph_title UPS Power'
        echo 'graph_category system'
        echo 'graph_info Power consumption of UPS devices'

        # Lire les noms des UPS et générer les configurations pour les graphiques
        while read -r line; do
            name=$(echo "$line" | awk -F'.' '{print $1}')
            value=$(echo "$line" | awk '{print $2}')
            label=$(echo "$line" | awk -F'.' '{print $1}')
            echo "${name}.label ${label}"
            #echo "${name}.type GAUGE"
            echo "${name}.min 0"
            printf "${name}.value "
            echo "${value}"
        done < /opt/munin/results
        exit 0
fi

if [ "$1" = "autoconf" ]; then
        # Support pour Munin autoconf/suggest
        echo 'yes'

fi
        # Lire les valeurs depuis le fichier et afficher les données
        while read -r line; do
            name=$(echo "$line" | awk -F'.' '{print $1}')
            value=$(echo "$line" | awk '{print $2}')
            echo "${name}.label ${name}"
            printf "${name}.value "
            echo "${value}"
        done < /opt/munin/results
