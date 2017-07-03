#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

BZZKEY=$1
DATADIR=$2
MAXPEERS=$3
NETWORKID=$4

nohup $GOPATH/bin/geth --datadir $DATADIR \
    --unlock 0 \
    --password <(cat $DATADIR/peer0-password) \
    --verbosity 6 \
    --networkid $NETWORKID \
    --nodiscover \
    --maxpeers $MAXPEERS \
    2>> $DATADIR/geth.log &

$GOPATH/bin/swarm \
    --bzzaccount $BZZKEY \
    --datadir $DATADIR \
    --ens-api $DATADIR/geth.ipc \
    --verbosity 6 \
    --maxpeers $MAXPEERS \
    --bzznetworkid $NETWORKID \
    &> $DATADIR/swarm.log < <(cat $DATADIR/peer0-password) &

echo $(geth --exec "console.log(admin.nodeInfo.enode)" attach $DATADIR/bzzd.ipc)
