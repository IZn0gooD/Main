#!/bin/bash

export LC_NUMERIC="C"

ssh_key="/opt/munin/id_rsa_monitone"
ssh_ups="root@172.31.99.3 root@172.31.99.11 root@172.31.99.35 root@172.31.99.37"
for ssh in $ssh_ups; do
           
    #echo $ssh
    #printf "outwatt.value "
    #outvolts=$(ssh ${ssh} -i ${ssh_key} apcaccess status | grep OUTPUTV | awk '{print $3}')
    outvolts=$(ssh ${ssh} apcaccess status | grep OUTPUTV | awk '{print $3}')
    outcurnt=$(ssh ${ssh} apcaccess status | grep OUTCURNT | awk '{print $3}')
    name=$(ssh ${ssh} cat /etc/apcupsd/apcupsd.conf | grep -E '^[^#]*UPSNAME' | awk '{print $2}') 
    results=$(echo "${outvolts} * ${outcurnt}" | bc)
    #results=$(echo "$((${outvolts} * ${outcurnt}))")
    #printf "${name}.outwatt.value "
    echo "${name}.upspower $results" 
done > /opt/munin/results

