'use strict';

const {
  exec
} = require('child_process');

/**
 * @module constellate/src/swarm-node
 */

const maxpeers = 10;

// from https://swarm-guide.readthedocs.io/en/latest/runninganode.html#

function runSwarm(mode, password) {
  let child;
  if (mode === 'private') {
    child = exec(`bash ../scripts/swarm-private.sh ${maxpeers}`);
  } else if (mode === 'testnet') {
    child = exec('bash ../scripts/swarm-testnet.sh');
  } else {
    throw new Error('unexpected mode:', mode);
  }
  child.stderr.on('data', data => {
    process.stderr.write(data + '\n');
    process.exit(-1);
  });
  child.stdout.on('data', data => {
    if (data.match(/^Enter password/)) {
      child.stdin.write(password + '\n');
    } else {
      process.stdout.write(data + '\n');
    }
  });
}
