#!/bin/bash 
#
if pgrep -f "spigot.jar" > /dev/null
then
	echo "on"
else
	echo "off"
fi
