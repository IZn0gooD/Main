#!/bin/bash

SRV_DIR="/home/minecraft/serveur_1.20.4"

cd ${SRV_DIR}
screen -dmS srvmc bash -c "java -jar -Xmx4G spigot.jar -nogui ; screen -X -S srvmc quit"
