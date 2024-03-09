#!/bin/bash

BLACK="\\033[1;1;38;49m"
RED="\\033[1;31m"
GREEN="\\033[1;92m"
WHITE="\\033[0m"
UWHITE="\\033[4;37m"
ORANGE="\\033[1;33m"
BLEU="\\033[1;34m"
MAGENTA="\\033[1;35m"
CYAN="\\033[1;36m"
YELLOW="\\033[1;49m"

#declare -A TAB_MOTIF

#TAB_MOTIF[S1_SNCF]="_2023-09-30_|_2023-10-01_|_2023-10-02_0[0-2]{1} _2023-09-30_0[0-3]{1}"
#TAB_MOTIF[S1]="_2023-10-03_|_2023-10-04_0[0-2]{1} _2023-10-03_0[0-3]{1}"

valid_date() {
	date -d "$1" "+%m%d" > /dev/null 2>&1
       return $?	
}

LOG_YEAR=2023
SSH="sshpass -p raspberry ssh pi@192.168.9.1"
DOSSIER1="/video"
DOSSIER2="/var/log"
#VERIF_DATES=("2023-10-02" "2023-10-03" "2023-10-04" "2023-10-05" "2023-10-06" "2023-10-07" "2023-10-08" "2023-10-09")

#$SSH "
#find ${DOSSIER1} -type f -iname '*.mp4' | awk -F'_' '{print \$3}' | sort -h | uniq 
#sleep 5
#find /video/ -type f -iname '*.mp4' | wc -l
#"
LISTE_VIDEOS=$($SSH "find ${DOSSIER1} -type f -iname '*.mp4' | awk -F'_' '{print \$3}' | sort -h | uniq")
NBR_VIDEOS=$($SSH "find /video/ -type f -iname '*.mp4' | wc -l")
HOST_DIST=$($SSH "hostname")

if [ -n "$BASH_VERSION" ]; then
	echo -e "${RED} Script lancé avec 'bash'.${WHITE}"
else
	echo -e "${RED}Le script n'est pas lancé avec bash. Veuillez utiliser la commande 'bash' pour l'éxécuter."
	exit 1
fi

echo -e "\n==== Verification cam ${CYAN}${HOST_DIST} ${WHITE}==== \n"
echo -e " ${BLACK}Etape [1/4] ${WHITE}  | -->${BLACK} Liste des jours où la caméra a filmé = \n \n${CYAN}${LISTE_VIDEOS}${WHITE}"
echo -e "\n=========================================="
echo -e "\n ${BLACK}Etape [2/4] ${WHITE}  | -->${BLACK} Nombre total de vidéo dans la SD = \n \n${CYAN}$NBR_VIDEOS${WHITE}"
echo -e "\n=========================================="

echo -e "\n ${BLACK}Etape [3/4] ${WHITE}  | -->${BLACK} Check des syslog/pycam.log \n"
read -p "$( echo -e ${BLACK}Entrez la date de début des vidéos listé précedement ${RED}\(MMJJ\) ${WHITE}:  )" START_DATE

if ! valid_date "$START_DATE"; then
	echo "Format non valide"
	exit 1
fi

read -p "$( echo -e ${BLACK}Entrez la date de fin des vidéos listé précedement ${RED}\(MMJJ\) ${WHITE}:  )" END_DATE

if ! valid_date "$END_DATE"; then
	echo "Format non valide"
	exit 1
fi

REG_DATE0="${START_DATE:0:1}"
REG_DATE1="${START_DATE:1:1}"
REG_DATE2="${START_DATE:2:1}"
REG_DATE3="${START_DATE: -1}"
DEB_DATE="${START_DATE:0:2}"
END_DATE0="${END_DATE: -2}"
END_DATE1="${END_DATE:2:1}"
END_DATE2="${END_DATE: -1}"
#echo "$REG_DATE0"
#echo "$REG_DATE1"
#echo "$REG_DATE2"
#echo "$REG_DATE3"
#echo "$END_DATE1"
#echo "$END_DATE2"
NBR_SYSLOG=$($SSH "ls /var/log/ | grep  syslog-${LOG_YEAR}[${REG_DATE0}][${REG_DATE1}][${REG_DATE2}-${END_DATE1}][01${REG_DATE3}-9] | sort -h")
NBR_PYLOG=$($SSH "ls /var/log/ | grep  pycam.log-${LOG_YEAR}[${REG_DATE0}][${REG_DATE1}][${REG_DATE2}-${END_DATE1}][01${REG_DATE3}-9] | sort -h")
: <<'##'
CURRENT_DATE="$START_DATE"
DATES=()
while [[ "$CURRENT_DATE" != "$END_DATE" ]];do
	DATES+=("$CURRENT_DATE")
	CURRENT_DATE=$(date -d "$CURRENT_DATE + 1 day" "+%Y-%m-%d")
done
DATES+=("$END_DATE")
#echo -e "${MAGENTA}La date a regarder pour les pycam.log :  ${DATES[-3]} ${WHITE}\n"
echo ""
##
read -r -p "$( echo -e Pour consulter les pycam.log, entrer la date ${RED}\(mois et jour\) ${WHITE}correspondant jour arrivant juste après le dernier jour où la caméra a filmé sur site ex : 1009 pour le 9 septembre \n Rentrer votre numéro : )" input


PYCAM_LOG="pycam.log-${LOG_YEAR}${input}.gz"
SYS_LOG="syslog-${LOG_YEAR}${input}.gz"
echo -e "\n Inspection du ${CYAN}${PYCAM_LOG}${WHITE} :"
$SSH "zcat /var/log/${PYCAM_LOG} | grep '${DATES[-6]}' | tail -n 5"

echo -e "\n Inspection du ${CYAN}${SYS_LOG}${WHITE} :"
$SSH "zcat /var/log/$SYS_LOG | grep  '${inputlast: -2}' | tail -n 5"
echo -e "\n============================================"

echo -e "\n ${BLACK}Etape [4/4] ${WHITE}  | -->${BLACK} Check avancé des syslog/pycam.log \n"

#: <<'###'
read -r -p "$( echo -e Pour consulter le même syslog que le pycamlog, entrez la date ${RED}\(mois et jour\) ${WHITE}entrez la date du début des vidéos affiché ci dessus ex : 1009 pour le 9 septembre \n Rentrer votre numéro : )" inputlast
inputsave=$input
SYS_LOG="syslog-${LOG_YEAR}${inputsave}.gz"

# Pour modif la date pour les syslog au cas ou 
#D=$(date +"%b %d" | sed s'/\.//')
#echo "$D"

if [[ "${input:0:2}" == "01" ]]; then
	mois="Jan"
elif [[ "${input:0:2}" == "02" ]]; then
	mois="Fev"
elif [[ "${input:0:2}" == "03" ]]; then
	mois="Mar"
elif [[ "${input:0:2}" == "04" ]]; then
	mois="Avr"
elif [[ "${input:0:2}" == "05" ]]; then
	mois="Mai"
elif [[ "${input:0:2}" == "06" ]]; then
	mois="Juin"
elif [[ "${input:0:2}" == "07" ]]; then
	mois="Juil"
elif [[ "${input:0:2}" == "08" ]]; then
	mois="Aou"
elif [[ "${input:0:2}" == "09" ]]; then
	mois="Sep"
elif [[ "${input:0:2}" == "10" ]]; then
	mois="Oct"
elif [[ "${input:0:2}" == "11" ]]; then
	mois="Nov"
elif [[ "${input:0:2}" == "12" ]]; then
	mois="Dec"
else
	echo "false"
        exit 1
fi
inputlast="${inputlast: -2}"
if [[ "${inputlast:0:1}" == "0" ]]; then
	inputlast="${inputlast:1}"
fi
#echo -e "\n Inspection du ${CYAN}${SYS_LOG} ${WHITE}au niveau de la date :${CYAN} $mois $inputlast ${WHITE}"
#$SSH "zcat /var/log/$SYS_LOG | grep '${mois}  ${inputlast}' | tail -n 5"
###
echo -e "\nListe des syslog jusqu'à aujourd'hui :\n${CYAN}${NBR_SYSLOG}${WHITE}"
echo -e "\nListe des Pycamlog jusqu'à aujourd'hui :\n${CYAN}${NBR_PYLOG}${WHITE}"

#TEST= for date in {${LOG_YEAR}${REG_DATE0}${REG_DATE1}${REG_DATE2}${REG_DATE3}..${LOG_YEAR}${REG_DATE0}${REG_DATE1}${END_DATE1}${END_DATE2}}; do filename="pycam.log-${date}" ; zgrep 'start_recording.sh' --binary-files=text done
#TEST="for date in {20231120..20231129}; do filename='/var/log/pycam.log-${date}' ; zgrep -r 'start_recording.sh' -g ${filename} -binary-files=text; done"
#PYLOG=$(${SSH} ${TEST})
PYLOGRAW=$($SSH "zcat /var/log/pycam.log-* | zgrep 'start_recording.sh' --binary-files=text | grep ${LOG_YEAR}-${REG_DATE0}${REG_DATE1}")
if [[ $PYLOGRAW == *"30"* ]]; then
	PYLOG=$(echo -e "${RED}Caméra activée pour 30 heures : ${WHITE}${PYLOGRAW}")
fi 
echo -e "\nLogs Pycam  :\n${CYAN}${PYLOG}${WHITE}"

SYSLOGRAW=$($SSH "zcat /var/log/syslog-* | zgrep 'DHCPREQUEST\|DHCPACK\|DHCPOFFER\|DHCPDISCOVER' --binary-files=text | grep ${mois}")
#if [[ $PYLOGRAW == *"30"* ]]; then
#	PYLOG=$(echo -e "${RED}Caméra activée pour 30 heures : ${WHITE}${PYLOGRAW}")
#fi 
echo -e "\nLogs syslog  :\n${CYAN}${SYSLOGRAW}${WHITE}"