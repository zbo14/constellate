const crypto = require('../lib/crypto.js');
const secp256k1 = require('secp256k1/js');
const { digestSHA256 } = require('../lib/util.js');

// @flow

/**
* @module constellate/src/secp256k1
*/

// https://www.npmjs.com/package/secp256k1

function randomKeypair(): Object {
  let privateKey;
  do {
    privateKey = crypto.generateSeed();
  } while (!secp256k1.privateKeyVerify(privateKey));
  const publicKey = secp256k1.publicKeyCreate(privateKey);
  return {
    privateKey: privateKey,
    publicKey: publicKey
  }
}

function sign(message: string, privateKey: Buffer): Buffer {
  const hash = digestSHA256(message);
  return secp256k1.sign(hash, privateKey).signature;
}

function verify(message: string, publicKey: Buffer, signature: Buffer): boolean {
  const hash = digestSHA256(message);
  return secp256k1.verify(hash, signature, publicKey);
}

exports.randomKeypair = randomKeypair;
exports.sign = sign;
exports.verify = verify;
