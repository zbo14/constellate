'use strict';

const atob = require('atob');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const Buffer = require('buffer/').Buffer;
const nacl = require('tweetnacl');
const util = require('../lib/util.js');

// @flow

/**
* @module constellate/src/crypto
*/

const saltRounds = 10;

function generateKeypairFromPassword(password: string): Object {
  // const hash = util.digestSHA256(password);
  const secret = generateSecret(password);
  return generateKeypairFromSeed(secret);
}

function generateKeypairFromSeed(seed: ?Buffer): Object {
  if (seed == null || seed.length !== 32) {
    seed = generateSeed();
  };
  return nacl.sign.keyPair.fromSeed(seed);
}

function generateRandomKeypair(): Object {
  return nacl.sign.keyPair();
}

function generateSecret(password: string): Buffer {
  const salt = bcryptjs.genSaltSync(saltRounds);
  const hash = bcryptjs.hashSync(password, salt).slice(-53);
  const secret = (atob(hash.slice(22)) + atob(hash.slice(-31))).slice(-32);
  return new Buffer(secret, 'ascii');
}

function generateSeed(): Buffer {
  return crypto.randomBytes(32);
}

function signMessage(message: string, secretKey: Uint8Array): Object {
  return nacl.sign.detached(util.strToUint8Array(message), secretKey);
}

function verifySignature(message: string, publicKey: Uint8Array, signature: Uint8Array): boolean {
  return nacl.sign.detached.verify(util.strToUint8Array(message), signature, publicKey);
}

exports.generateKeypairFromPassword = generateKeypairFromPassword;
exports.generateKeypairFromSeed = generateKeypairFromSeed;
exports.generateRandomKeypair = generateRandomKeypair;
exports.generateSeed = generateSeed;
exports.signMessage = signMessage;
exports.verifySignature = verifySignature;
