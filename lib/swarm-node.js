'use strict';

const {
    exec,
    spawn
} = require('child_process');

//      

/**
 * @module constellate/src/swarm-node
 */

const enodes = [
    'enode://01f7728a1ba53fc263bcfbc2acacc07f08358657070e17536b2845d98d1741ec2af00718c79827dfdbecf5cfcd77965824421508cc9095f378eb2b2156eb79fa@40.68.194.101:30400',
    'enode://6d9102dd1bebb823944480282c4ba4f066f8dcf15da513268f148890ddea42d7d8afa58c76b08c16b867a58223f2b567178ac87dcfefbd68f0c3cc1990f1e3cf@40.68.194.101:30427',
    'enode://fca15e2e40788e422b6b5fc718d7041ce395ff65959f859f63b6e4a6fe5886459609e4c5084b1a036ceca43e3eec6a914e56d767b0491cd09f503e7ef5bb87a1@40.68.194.101:30428',
    'enode://b795d0c872061336fea95a530333ee49ca22ce519f6b9bf1573c31ac0b62c99fe5c8a222dbc83d4ef5dc9e2dfb816fdc89401a36ecfeaeaa7dba1e5285a6e63b@40.68.194.101:30429',
    'enode://756f582f597843e630b35371fc080d63b027757493f00df91dd799069cfc6cb52ac4d8b1a56b973baf015dd0e9182ea3a172dcbf87eb33189f23522335850e99@40.68.194.101:30430',
    'enode://d9ccde9c5a90c15a91469b865ffd81f2882dd8731e8cbcd9a493d5cf42d875cc2709ccbc568cf90128896a165ac7a0b00395c4ae1e039f17056510f56a573ef9@40.68.194.101:30431',
    'enode://65382e9cd2e6ffdf5a8fb2de02d24ac305f1cd014324b290d28a9fba859fcd2ed95b8152a99695a6f2780c342b9815d3c8c2385b6340e96981b10728d987c259@40.68.194.101:30433',
    'enode://7e09d045cc1522e86f70443861dceb21723fad5e2eda3370a5e14747e7a8a61809fa6c11b37b2ecf1d5aab44976375b6d695fe39d3376ff3a15057296e570d86@40.68.194.101:30434',
    'enode://bd8c3421167f418ecbb796f843fe340550d2c5e8a3646210c9c9d747bbd34d29398b3e3716ee76aa3f2fc46d325eb685ece0375a858f20b759b40429fbf0d050@40.68.194.101:30435',
    'enode://8bb7fb70b80f60962c8979b20905898f8f6172ae4f6a715b89712cb7e965bfaab9aa0abd74c7966ad688928604815078c5e9c978d6e57507f45173a03f95b5e0@40.68.194.101:30436'
]

module.exports = function(options) {
    let maxpeers = 10,
        networkid = 322;
    if (options) {
        if (options.maxpeers) {
            maxpeers = options.maxpeers;
        }
        if (options.networkid) {
            networkid = options.networkid;
        }
    }
    this.initPrivate = (password) => {
        _initPrivateSwarm(maxpeers)(password).then(obj => {
            this.runPrivateSwarm = _runPrivateSwarm(
                obj.bzzkeys, obj.datadir, maxpeers, networkid
            );
        });
    }
    this.runPrivate = () => new Error('private swarm not initialized');
    this.reset = () => {
        return new Promise((resolve, reject) => {
            exec('rm -rf /tmp/BZZ && mkdir /tmp/BZZ', (err, stdout, stderr) => {
                if (err) return reject(err);
                if (stdout) process.stdout.write(stdout);
                if (stderr) process.stderr.write(stderr);
                resolve();
            });
        });
    }
    this.stop = () => {
        return new Promise((resolve, reject) => {
            exec('killall -9 geth && killall -9 swarm', (err, stdout, stderr) => {
                if (err) return reject(err);
                if (stdout) process.stdout.write(stdout);
                if (stderr) process.stderr.write(stderr);
                resolve();
            });
        });
    }
}

function newDatadir() {
    return '/tmp/BZZ/' + Math.round(Date.now() / 1000);
}

function _initPrivateSwarm(maxpeers) {
    return (password) => {
        const datadir = newDatadir();
        exec('cd /tmp && mkdir -p ' + datadir);
        const promises = new Array(maxpeers);
        for (let i = 0; i < maxpeers; i++) {
            promises[i] = new Promise((resolve, reject) => {
                const child = spawn('bash', [
                    '../scripts/init-private-peer.sh',
                    datadir, password, i.toString()
                ]);
                let match;
                child.stdout.on('data', data => {
                    if (data && (match = data.toString().match(/BZZKEY=([a-f0-9]*)/))) {
                        resolve(match[1]);
                    }
                });
                child.on('error', err => {
                    if (err) return reject(err);
                });
            });
            password = 'passwerd' + (i + 1);
        }
        return Promise.all(promises).then(bzzkeys => {
            return {
                bzzkeys,
                datadir
            };
        });
    }
}

function _initTestnetSwarm() {
    return (password) => {
        return new Promise((resolve, reject) => {
            const datadir = newDatadir();
            const child = spawn('bash', [
                '../scripts/init-testnet-swarm.sh',
                datadir, password
            ]);
            child.stderr.pipe(process.stderr);
            let match;
            child.stdout.on('data', data => {
                if (data && (match = data.toString().match(/BZZKEY=([a-f0-9]*)/))) {
                    const bzzkey = match[1];
                    resolve({
                        bzzkey,
                        datadir
                    });
                }
            });
            child.on('error', err => {
                if (err) return reject(err);
            });
        });
    }
}

function _runPrivateSwarm(bzzkeys, datadir, maxpeers, networkid) {
    return (password) => {
        let match;
        return new Promise((resolve, reject) => {
            const child = spawn('bash', [
                '../scripts/run-private-swarm.sh',
                bzzkeys[0], datadir,
                maxpeers.toString(),
                networkid.toString()
            ]);
            child.stdout.on('data', data => {
                process.stdout.write(data);
                if (data && (match = data.toString().match(/(enode\:\/\/[a-f0-9]+\@\[\:\:\]\:\d+)/))) {
                    resolve(match[1]);
                }
            });
            child.on('error', err => {
                if (err) return reject(err);
            });
        }).then(bootnode => {
            const promises = new Array(maxpeers);
            for (let i = 1; i < maxpeers; i++) {
                password = 'passwerd' + i;
                promises[i] = new Promise((resolve, reject) => {
                    const child = spawn('bash', [
                        '../scripts/run-private-peer.sh',
                        bootnode, bzzkeys[i], datadir,
                        maxpeers.toString(),
                        networkid.toString(),
                        i.toString()
                    ]);
                    child.stdout.on('data', data => {
                        process.stdout.write(data);
                        if (data && (match = data.toString().match(/swarm is running/))) {
                            resolve();
                        }
                    });
                    child.on('error', err => {
                        if (err) return reject(err);
                    });
                });
            }
            return Promise.all(promises);
        }).then(() => {
            return 'Private swarm is running\n';
        });
    }
}

function _runTestnetSwarm(bzzkey, datadir) {
    return (password) => {
        return new Promise((resolve, reject) => {
            const child = spawn('bash', [
                '../scripts/run-testnet-swarm.sh',
                bzzkey, datadir
            ]);
            child.stderr.pipe(process.stderr);
            let match;
            child.stdout.on('data', data => {
                if (data && (match = data.toString().match(/swarm is running/))) {
                    resolve('Testnet swarm is running\n');
                }
            });
            child.on('error', err => {
                if (err) return reject(err);
            });
        });
    }
}

function _addTestnetPeers(datadir) {
    return () => {
        const promises = new Array(enodes.length);
        for (let i = 0; i < enodes.length; i++) {
            promises[i] = new Promise((resolve, reject) => {
                exec(`geth --exec='admin.addPeer(${enodes[i]})' attach ipc:/${datadir}/bzzd.ipc`, err => {
                    if (err) return reject(err);
                    resolve();
                });
            });
        }
        return Promise.all(promises).then(() => {
            return 'Added peers to testnet swarm\n';
        });
    }
}

const maxpeers = 10;
const networkid = 322;
const password = 'passwerd';

// _initPrivateSwarm(maxpeers)(password).then(result => {
//  console.log(JSON.stringify(result, null, 2));
// });

const bzzkeys = [
    "060e45bcfb5d6b8ceebb6ea58e2e2e9feb4b1ad5",
    "ec7406dedd236bc1a66319eb1ec762ba9bc86a15",
    "1addfc955ee8b63cadb14f4b27186c67bd3cea40",
    "1cfe31025b40896b862e2e4dbe97da391d3c71a6",
    "e60e620430f0b768561991b169809025600fd55b",
    "2ee0307a078827556e4e3a97616d966d837bf225",
    "fc355c1e4f954427518c243a28cb536376489582",
    "253a7dd9da9f5cf203cd6c1a99ef62a33296bb36",
    "7dd49a5b8a59cff6dc4ad4661f56d1edb7bcce3b",
    "2ee3249c915b42cf050cf95bb2d6592a707016bc"
];

const datadir = "/tmp/BZZ/1499052724";

_runPrivateSwarm(bzzkeys, datadir, maxpeers, networkid)(password).then(console.log);