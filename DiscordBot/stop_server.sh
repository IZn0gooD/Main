#!/bin/bash

PID=$(pgrep -f "spigot.jar")

if [ -n "$PID" ]; then
       kill -15 $PID
       echo "Le serveur est en cours d'arrêt..."
else
       echo "Le serveur n'est pas en cours d'exécution."
fi
