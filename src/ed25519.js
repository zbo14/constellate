'use strict';

const crypto = require('../lib/crypto.js');
const nacl = require('tweetnacl');
const { digestSHA256 } = require('../lib/util.js');

// @flow

/**
* @module constellate/src/ed25519
*/

function keypairFromPassword(password: string): Object {
  const secret = crypto.generateSecret(password);
  return keypairFromSeed(secret);
}

function keypairFromSeed(seed: ?Buffer): Object {
  if (!seed || seed.length !== 32) {
    seed = crypto.generateSeed();
  };
  return keypairBuffers(nacl.sign.keyPair.fromSeed(seed));
}

function randomKeypair(): Object {
  return keypairBuffers(nacl.sign.keyPair());
}

function keypairBuffers(keypair: Object): Object {
  return {
    publicKey: Buffer.from(keypair.publicKey),
    secretKey: Buffer.from(keypair.secretKey)
  }
}

function sign(message: string, secretKey: Buffer): Buffer {
  const hash = digestSHA256(message);
  return Buffer.from(nacl.sign.detached(
    new Uint8Array(hash),
    new Uint8Array(secretKey))
  );
}

function verify(message: string, publicKey: Buffer, signature: Buffer): boolean {
  const hash = digestSHA256(message);
  return nacl.sign.detached.verify(
    new Uint8Array(hash),
    new Uint8Array(signature),
    new Uint8Array(publicKey)
   );
}

exports.keypairFromPassword = keypairFromPassword;
exports.keypairFromSeed = keypairFromSeed;
exports.randomKeypair = randomKeypair;
exports.sign = sign;
exports.verify = verify;
