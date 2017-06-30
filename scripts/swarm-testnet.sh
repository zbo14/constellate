#!/bin/bash

# from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

# Working directory
cd /tmp

# Preparation
DATADIR=/tmp/BZZ/`date +%s`
mkdir -p $DATADIR
read -s -p "Enter password: " MYPASSWORD && echo $MYPASSWORD > $DATADIR/my-password
echo
BZZKEY=$($GOPATH/bin/geth --datadir $DATADIR --password $DATADIR/my-password --testnet account new | awk -F"{|}" '{print $2}')

echo "Your account is ready: "$BZZKEY

# Run geth in the background
nohup $GOPATH/bin/geth --datadir $DATADIR \
    --unlock 0 \
    --password <(cat $DATADIR/my-password) \
    --testnet \
    2>> $DATADIR/geth.log &

echo "geth is running in the background, you can check its logs at "$DATADIR"/geth.log"

# Now run swarm in the background
$GOPATH/bin/swarm \
    --bzzaccount $BZZKEY \
    --datadir $DATADIR \
    --ens-api $DATADIR/testnet/geth.ipc \
    &> $DATADIR/swarm.log < <(cat $DATADIR/my-password) &

echo "swarm is running in the background, you can check its logs at "$DATADIR"/swarm.log"
