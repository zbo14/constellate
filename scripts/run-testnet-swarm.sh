#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

BZZKEY=$1
DATADIR=$2

nohup geth --datadir $DATADIR \
       --unlock 0 \
       --password <(cat $DATADIR/password) \
       --testnet \
        2>> $DATADIR/geth.log &

$GOPATH/bin/swarm \
    --bzzaccount $BZZKEY \
    --datadir $DATADIR \
    --keystore $DATADIR/testnet/keystore \
    --ens-api $DATADIR/testnet/geth.ipc \
    &> $DATADIR/swarm.log < <(cat $DATADIR/password) &

echo "swarm is running in the background, you can check its logs at "$DATADIR"/swarm.log"
