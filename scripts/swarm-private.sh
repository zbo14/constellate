#!/bin/bash

# from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

# Working directory
cd /tmp

MAXPEERS=$1;

# Preparation
DATADIR=/tmp/BZZ/`date +%s`
mkdir -p $DATADIR

read -s -p "Enter password: " MYPASSWORD && echo $MYPASSWORD > $DATADIR/my-password

# Run geth in the background
nohup $GOPATH/bin/geth --datadir $DATADIR \
    --unlock 0 \
    --password <(cat $DATADIR/my-password) \
    --verbosity 6 \
    --networkid 322 \
    --nodiscover \
    --maxpeers 10 \
    2>> $DATADIR/geth.log &

echo "geth is running in the background, you can check its logs at "$DATADIR"/geth.log"

# Now run swarms in the background

for i in {1..$MAXPEERS};
do
  echo $PASSWORD > $DATADIR/my-password
  echo
  BZZKEY=$($GOPATH/bin/geth --datadir $DATADIR --password $DATADIR/my-password account new | awk -F"{|}" '{print $2}')

  $GOPATH/bin/swarm \
      --bzzaccount $BZZKEY \
      --datadir $DATADIR \
      --ens-api $DATADIR/geth.ipc \
      --verbosity 6 \
      --maxpeers $MAXPEERS \
      --bzznetworkid $NETWORKID \
      &> $DATADIR/swarm.log < <(cat $DATADIR/my-password) &
done
echo "swarm is running in the background, you can check its logs at "$DATADIR"/swarm.log"
