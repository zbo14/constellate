#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

DATADIR=$1
PASSWORD=$2
PEERID=$3

cd /tmp
echo $PASSWORD > $DATADIR/peer$PEERID-password
echo BZZKEY=$($GOPATH/bin/geth --datadir $DATADIR --password $DATADIR/peer$PEERID-password account new | awk -F"{|}" '{print $2}')
