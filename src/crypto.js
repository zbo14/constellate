'use strict';

const atob = require('atob');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const nacl = require('tweetnacl');
const util = require('../lib/util.js');

const {
  decodeBase64,
  encodeBase64,
  strToUint8Array
} = util;

// @flow

/**
* @module constellate/src/crypto
*/

const saltRounds = 10;

function decodeKeypair(encoded: Object): Object {
  return {
    publicKey: decodeBase64(encoded.publicKey),
    secretKey: decodeBase64(encoded.secretKey)
  }
}

function encodeKeypair(keypair: Object): Object {
  return {
    publicKey: encodeBase64(keypair.publicKey),
    secretKey: encodeBase64(keypair.secretKey)
  }
}

function keypairFromPassword(password: string): Object {
  const secret = generateSecret(password);
  return keypairFromSeed(secret);
}

function keypairFromSeed(seed: ?Buffer): Object {
  if (seed == null || seed.length !== 32) {
    seed = generateSeed();
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

function generateSecret(password: string): Buffer {
  let secret;
  try {
    const salt = bcryptjs.genSaltSync(saltRounds);
    const hash = bcryptjs.hashSync(password, salt).slice(-53);
    secret = new Buffer(
      (atob(hash.slice(0, 22)) + atob(hash.slice(22))).slice(-32),
      'ascii'
    );
  } catch(err) {
    console.error(err);
    secret = crypto.createHash('sha256').update(password).digest();
  }
  return secret;
}

function generateSeed(): Buffer {
  return crypto.randomBytes(32);
}

function sign(message: string, secretKey: Buffer): Buffer {
  return Buffer.from(nacl.sign.detached(
    strToUint8Array(message),
    new Uint8Array(secretKey))
  );
}

function verify(message: string, publicKey: Buffer, signature: Buffer): boolean {
  return nacl.sign.detached.verify(
    strToUint8Array(message),
    new Uint8Array(signature),
    new Uint8Array(publicKey)
   );
}

exports.decodeKeypair = decodeKeypair;
exports.encodeKeypair = encodeKeypair;
exports.keypairFromPassword = keypairFromPassword;
exports.keypairFromSeed = keypairFromSeed;
exports.randomKeypair = randomKeypair;
exports.sign = sign;
exports.verify = verify;
