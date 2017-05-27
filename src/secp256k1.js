'use strict';

const crypto = require('crypto');
const ethjsUtil = require('ethereumjs-util');
const secp256k1 = require('secp256k1/js');

const {
  decodeBase58,
  digestSHA256,
  encodeBase58
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/secp256k1
*/

function compress(x: Buffer, y: Buffer): Buffer {
  let publicKey = new Buffer([]);
  try {
    if (x.length !== 32) {
      throw new Error('expected x coord length=32; got ' + x.length);
    }
    if (y.length !== 32) {
      throw new Error('expected y coord length=32; got ' + y.length);
    }
    publicKey = secp256k1.publicKeyConvert(new Buffer([4, ...x, ...y]), true);
  } catch(err) {
    console.error(err);
  }
  return publicKey;
}

function decodeKeypair(encoded: string): Object {
  const keypair = JSON.parse(encoded);
  return {
    privateKey: decodeBase58(keypair.privateKey),
    publicKey: decodeBase58(keypair.publicKey)
  }
}

function encodeKeypair(keypair: Object): string {
  return JSON.stringify({
    privateKey: encodeBase58(keypair.privateKey),
    publicKey: encodeBase58(keypair.publicKey)
  });
}

// https://www.npmjs.com/package/secp256k1

function generateKeypair(): Object {
  let privateKey;
  do {
    privateKey = crypto.randomBytes(32);
  } while (!secp256k1.privateKeyVerify(privateKey));
  const publicKey = secp256k1.publicKeyCreate(privateKey);
  return {
    privateKey: privateKey,
    publicKey: publicKey
  }
}

function publicKeyToAddress(publicKey: Buffer): string {
  const buf = secp256k1.publicKeyConvert(publicKey, false).slice(1);
  return '0x' + ethjsUtil.pubToAddress(buf).toString('hex');
}

function sign(message: string, privateKey: Buffer): Buffer {
  const hash = digestSHA256(message);
  return secp256k1.sign(hash, privateKey).signature;
}

function uncompress(publicKey: Buffer): Object {
  const buf = secp256k1.publicKeyConvert(publicKey, false);
  return {
    x: buf.slice(1, 33),
    y: buf.slice(33)
  }
}

function verify(message: string, publicKey: Buffer, signature: Buffer): boolean {
  const hash = digestSHA256(message);
  return secp256k1.verify(hash, signature, publicKey);
}

exports.compress = compress;
exports.decodeKeypair = decodeKeypair;
exports.encodeKeypair = encodeKeypair;
exports.generateKeypair = generateKeypair;
exports.publicKeyToAddress = publicKeyToAddress;
exports.sign = sign;
exports.uncompress = uncompress;
exports.verify = verify;
