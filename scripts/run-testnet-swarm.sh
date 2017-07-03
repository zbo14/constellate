#!/bin/bash

# adapted from https://swarm-guide.readthedocs.io/en/latest/runninganode.html

BZZKEY=$1
DATADIR=$2

nohup $GOPATH/bin/geth \
    --datadir $DATADIR \
    --unlock 0 \
    --password <(cat $DATADIR/password) \
    --testnet \
    --fast \
    2>> $DATADIR/geth.log &

$GOPATH/bin/swarm \
    --bzzaccount $BZZKEY \
    --datadir $DATADIR \
    --keystore $DATADIR/keystore \
    --ens-api $DATADIR/geth.ipc \
    2>> $DATADIR/swarm.log < <(cat $DATADIR/password) &

echo $($GOPATH/bin/geth --exec='admin.addPeer("enode://01f7728a1ba53fc263bcfbc2acacc07f08358657070e17536b2845d98d1741ec2af00718c79827dfdbecf5cfcd77965824421508cc9095f378eb2b2156eb79fa@40.68.194.101:30400")' attach $DATADIR/bzzd.ipc)
echo $($GOPATH/bin/geth --exec='admin.addPeer("enode://6d9102dd1bebb823944480282c4ba4f066f8dcf15da513268f148890ddea42d7d8afa58c76b08c16b867a58223f2b567178ac87dcfefbd68f0c3cc1990f1e3cf@40.68.194.101:30427")' attach $DATADIR/bzzd.ipc)
echo $($GOPATH/bin/geth --exec='admin.addPeer("enode://fca15e2e40788e422b6b5fc718d7041ce395ff65959f859f63b6e4a6fe5886459609e4c5084b1a036ceca43e3eec6a914e56d767b0491cd09f503e7ef5bb87a1@40.68.194.101:30428")' attach $DATADIR/bzzd.ipc)
echo $($GOPATH/bin/geth --exec='admin.addPeer("enode://b795d0c872061336fea95a530333ee49ca22ce519f6b9bf1573c31ac0b62c99fe5c8a222dbc83d4ef5dc9e2dfb816fdc89401a36ecfeaeaa7dba1e5285a6e63b@40.68.194.101:30429")' attach $DATADIR/bzzd.ipc)
echo $($GOPATH/bin/geth --exec='admin.addPeer("enode://756f582f597843e630b35371fc080d63b027757493f00df91dd799069cfc6cb52ac4d8b1a56b973baf015dd0e9182ea3a172dcbf87eb33189f23522335850e99@40.68.194.101:30430")' attach $DATADIR/bzzd.ipc)
