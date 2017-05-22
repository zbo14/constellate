'use strict';

const NodeRsa = require('node-rsa');
const { withoutKeys } = require('../lib/util.js');

// @flow

/**
* @module constellate/src/rsa
*/

const privateKeyFormat = 'pkcs1-private-pem';
const publicKeyFormat = 'pkcs1-public-pem';

function decodeKeypair(encoded: string): Object {
  const keypair = JSON.parse(encoded);
  return {
    privateKey: importPrivateKey(keypair.privateKey),
    publicKey: importPublicKey(keypair.publicKey)
  }
}

function decrypt(encrypted: Buffer, privateKey: Object): Buffer {
  return privateKey.decrypt(encrypted, 'buffer');
}

function encodeKeypair(keypair: Object): string {
  return JSON.stringify({
    privateKey: keypair.privateKey.toString(),
    publicKey: keypair.publicKey.toString()
  });
}

function encrypt(message: string, publicKey: Object): Buffer {
  return publicKey.encrypt(message, 'buffer', 'utf8');
}

function exportPrivateKey(privateKey: Object): Object {
  return privateKey.exportKey(privateKeyFormat);
}

function exportPublicKey(publicKey: Object): Object {
  return publicKey.exportKey(publicKeyFormat);
}

function generateKeypair(): Object {
  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  privateKey.toString = () => exportPrivateKey(privateKey);
  publicKey.toString = () => exportPublicKey(publicKey);
  return {
    privateKey: privateKey,
    publicKey: publicKey
  }
}

function generatePrivateKey(): Object {
  return new NodeRsa({ b: 512 }, { signingScheme: 'pkcs1-sha256' });
}

function getPublicKey(key: Object): Object {
  return importPublicKey(exportPublicKey(key));
}

function importKey(pem: string, format: string): Object {
  let key = new NodeRsa();
  try {
    key.importKey(pem, format);
  } catch(err) {
    console.error(err);
    key = {};
  }
  key.toString = () => key.exportKey(format);
  return key;
}

function importPrivateKey(pem: string): Object {
  return importKey(pem, privateKeyFormat);
}

function importPublicKey(pem: string): Object {
  return importKey(pem, publicKeyFormat);
}

function sign(message: string, privateKey: Object): Buffer {
  return privateKey.sign(message, 'buffer', 'utf8');
}

function verify(message: string, publicKey: Object, signature: Buffer): boolean {
  return publicKey.verify(message, signature, 'utf8', 'buffer');
}

exports.decodeKeypair = decodeKeypair;
exports.decrypt = decrypt;
exports.encodeKeypair = encodeKeypair;
exports.encrypt = encrypt;
exports.exportPrivateKey = exportPrivateKey;
exports.exportPublicKey = exportPublicKey;
exports.generateKeypair = generateKeypair;
exports.generatePrivateKey = generatePrivateKey;
exports.getPublicKey = getPublicKey;
exports.importKey = importKey;
exports.importPrivateKey = importPrivateKey;
exports.importPublicKey = importPublicKey;
exports.sign = sign;
exports.verify = verify;
