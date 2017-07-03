#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

BOOTNODE=$1
BZZKEY=$2
DATADIR=$3
MAXPEERS=$4
NETWORKID=$5
PEERID=$6

$GOPATH/bin/swarm \
    --bootnodes $BOOTNODE \
    --bzzaccount $BZZKEY \
    --datadir $DATADIR \
    --ens-api $DATADIR/geth.ipc \
    --verbosity 6 \
    --maxpeers $MAXPEERS \
    --bzznetworkid $NETWORKID \
    &> $DATADIR/swarm.log < <(cat $DATADIR/peer$PEERID-password) &
