'use strict';

const {
  exec,
  spawn
} = require('child_process');

const fs = require('fs');

// @flow

/**
 * @module constellate/src/swarm-node
 */

module.exports = function(options?: Object) {
    let maxpeers = 10, networkid = 322, running = false;
    if (options) {
      if (options.maxpeers) {
        maxpeers = options.maxpeers;
      }
      if (options.networkid) {
        networkid = options.networkid;
      }
    }
    this.initPrivate = _initPrivateSwarm(maxpeers);
    this.initSingleton = initSingletonSwarm;
    this.initTestnet = initTestnetSwarm;
    this.runPrivate = _runPrivateSwarm(maxpeers, networkid);
    this.runSingleton = _runSingletonSwarm(networkid);
    this.runTestnet = runTestnetSwarm;
    this.reset = (): Promise<*> => {
      return new Promise((resolve, reject) => {
        exec('rm -rf /tmp/BZZ/ && mkdir /tmp/BZZ/', (err, stdout, stderr) => {
          if (err) return reject(err);
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
          resolve();
        });
      });
    }
    this.stop = (): Promise<*> => {
      return new Promise((resolve, reject) => {
        exec('killall -9 geth && killall -9 swarm', (err, stdout, stderr) => {
          if (err) return reject(err);
          if (stdout) process.stdout.write(stdout);
          if (stderr) process.stderr.write(stderr);
          resolve();
        });
      });
    }
    this.upload = (path: string): Promise<*> => {
      let cmd = 'swarm ';
      if (fs.lstatSync(path).isDirectory()) {
        cmd += '--recursive ';
      }
      if (!running) {
        cmd += '--bzzapi http://swarm-gateways.net/ ';
      }
      cmd += 'up ' +  path;
      return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
          if (err) return reject(err);
          if (stderr) return reject(stderr);
          if (stdout) resolve(stdout);
        });
      });
    }
}

function newDatadir(): string {
  return '/tmp/BZZ/' + Math.round(Date.now() / 1000);
}

function initSingletonSwarm(password: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    const datadir = newDatadir();
    exec('mkdir -p ' + datadir);
    const child = spawn('bash', [
      '../scripts/init-private-peer.sh',
      datadir, password, '0'
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
}

function _initPrivateSwarm(maxpeers: number): Function {
  return (password: string): Promise<Object> => {
    const datadir = newDatadir();
    exec('mkdir -p ' + datadir);
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
      password = 'passwerd' + (i+1);
    }
    return Promise.all(promises).then(bzzkeys => {
      return { bzzkeys, datadir };
    });
  }
}

function initTestnetSwarm(password: string): Promise<Object> {
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
        resolve({ bzzkey, datadir });
      }
    });
    child.on('error', err => {
      if (err) return reject(err);
    });
  });
}

function _runPrivateSwarm(maxpeers: number, networkid: number): Function {
  return (bzzkeys: string[], datadir: string, password: string): Promise<string> => {
    let match;
    return new Promise((resolve, reject) => {
      const child = spawn('bash', [
        '../scripts/run-private-swarm.sh',
        bzzkeys[0], datadir,
        maxpeers.toString(),
        networkid.toString()
      ]);
      child.stderr.on('data', data => {
        process.stderr.write(data);
      });
      child.stdout.on('data', data => {
        if (data && (match = data.toString().match(/(enode\:\/\/[a-f0-9]+\@\[\:\:\]\:\d+)/))) {
          resolve(match[1]);
        }
        process.stdout.write(data);
      });
      child.on('error', err => {
        if (err) return reject(err);
      });
    }).then(bootnode => {
      const promises = new Array(maxpeers-1);
      for (let i = 1; i < maxpeers; i++) {
        promises[i-1] = new Promise((resolve, reject) => {
          const child = spawn('bash', [
            '../scripts/run-private-peer.sh',
            bootnode, bzzkeys[i], datadir,
            maxpeers.toString(),
            networkid.toString(),
            i.toString()
          ]);
          child.stderr.on('data', data => {
            process.stderr.write(data);
          });
          child.stdout.on('data', data => {
            if (data && (match = data.toString().match(/peer is running/))) {
              resolve();
            }
            process.stdout.write(data);
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

function _runSingletonSwarm(networkid: number): Function {
  return (bzzkey: string, datadir: string, password: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const child = spawn('bash', [
        '../scripts/run-private-swarm.sh',
        bzzkey, datadir, '0', networkid.toString()
      ]);
      child.stderr.pipe(process.stderr);
      let match;
      child.stdout.on('data', data => {
        if (data && (match = data.toString().match(/swarm is running/))) {
          resolve('Singleton swarm is running\n');
        }
      });
      child.on('error', err => {
        if (err) return reject(err);
      });
    });
  }
}

function runTestnetSwarm(bzzkey: string, datadir: string, password: string): Promise<string> {
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
