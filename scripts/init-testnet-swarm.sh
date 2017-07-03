#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

DATADIR=$1
PASSWORD=$2

cd /tmp
mkdir -p $DATADIR
echo $PASSWORD > $DATADIR/password
echo BZZKEY=$($GOPATH/bin/geth --datadir $DATADIR --password $DATADIR/password --testnet account new | awk -F"{|}" '{print $2}')
