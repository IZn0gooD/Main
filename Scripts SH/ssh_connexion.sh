#!/bin/bash
#
#
# Script: ssh_connexion.sh
# Description: Ce script execute un playbook ansible qui récupère les connexions ssh (netstat -anultp).
# Auteur: MLE
# Date: 24/01/2024
#

usage(){ 
    echo "Usage: ./ssh_connexion.sh" 
    echo "--help ou -h : afficher l'aide" 
    echo "-p : affiche la cartouche du script" 
    echo "-b <prenom> : saluer <prenom>"
    exit 0 
} 

traitement(){ 
    echo "Bonjour "$1 
    exit 0
} 

presentation(){
    echo "Script: ssh_connexion.sh"
    echo "Description: Ce script execute un playbook ansible qui récupère les connexions ssh (netstat -anultp)."
    echo "Auteur: MLE"
    echo "Date: 24/01/2024"
    exit 0
}

# -o : options courtes 
# -l : options longues 
options=$(getopt -o h,b:p -l help -- "$@") 

# éclatement de $options en $1, $2... 
set -- $options 

while true; do 
    case "$1" in 
        -b) traitement $2 
            shift 2;; # on décale la liste des options de 2 ($1 et $2 sont remplacés par $3 et $4 s'ils existent) 
        -h|--help) usage 
            shift;; # on décale la liste des options de 1 
        --) # fin des options 
            shift # on décale la liste des options de 1 
            break;;
        -p) presentation
            shift;;  
    esac 
done

ansible=$(ansible-playbook -u root SSH_logs.yml)
retour_commande="$ansible"

awk -v RS='\nok: ' -F' => ' '{print $NF}' <<< "$retour_commande" > /home/user/results.txt
sed -i 's/"}$//g' /home/user/results.txt
#cat /home/user/results.txt

cat /home/user/results.txt | grep '"tcp ' > /home/user/ssh_results.txt
rm /home/user/results.txt
cat /home/user/ssh_results.txt
#var=$(cat /home/user/results.txt)
#echo $var | grep '"tcp'

htmlContent=$(cat <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Bulletin de Sécurité</title>
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

    h2 {
        color: white;
        display: flex;
        margin-left: 50px;
    }

    img {
        margin-left: 10px;  
        width: 30px;
        height: 30px;
    }

    /* Style pour les liens */
    pre {
        margin: 10px 0;
        border-radius: 20px;
        overflow: auto;
        resize: vertical;
        color: white;
    }

    a {
        display: inline-block;
        padding: 10px;
        margin: 5px;
        background-color: #2196F3;
        color: #fff;
        border-radius: 10px;
        text-decoration: none;
        position: relative;
        overflow: hidden;
        transition: background-color 0.3s, color 0.3s;
    }

    a::before {
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

    a:hover {
        background-color: #fff;
        color: #2196F3;
    }

    a:hover::before {
        transform: scaleX(1);
        transform-origin: right;
    }
    </style>
</head>
<body>
    <h1>Bulletin des connexion SSH </h1>
EOF
)


#lignes=$(cat /home/user/ssh_results.txt)
#for ligne in $lignes; do
#    htmlContent+="    <p>$ligne</p>"
#done
fichier_logs="/home/user/ssh_results.txt"

while IFS= read -r ligne; do
  htmlContent+="   <h2> $ligne</h2>"
done < "/home/user/ssh_results.txt"

htmlContent+="</body></html>"

echo -e "$htmlContent" > "/home/user/test.html"

