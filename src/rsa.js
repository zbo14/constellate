'use strict';

const NodeRsa = require('node-rsa');

// @flow

/**
* @module constellate/src/rsa
*/

function decrypt(encrypted: Buffer, privateKey: Object): Buffer {
  return privateKey.decrypt(encrypted, 'buffer');
}

function encrypt(message: string, publicKey: Object): Buffer {
  return publicKey.encrypt(message, 'buffer', 'utf8');
}

function exportKey(key: Object, format: string): string {
  let pem = '';
  try {
    pem = key.exportKey(format);
  } catch(err) {
    console.error(err);
  }
  return pem;
}

function exportPrivateKey(key: Object): string {
  return exportKey(key, 'pkcs1-private-pem');
}

function exportPublicKey(key: Object): string {
  return exportKey(key, 'pkcs8-public-pem');
}

function generatePrivateKey(): Object {
  return new NodeRsa({ b: 512 }, { signingScheme: 'pkcs1-sha256' });
}

function importKey(pem: string, format: string): Object {
  let key = new NodeRsa();
  try {
    key.importKey(pem, format);
  } catch(err) {
    console.error(err);
    key = {};
  }
  return key;
}

function importPrivateKey(pem: string): Object {
  return importKey(pem, 'pkcs1-private-pem');
}

function importPublicKey(pem: string): Object {
  return importKey(pem, 'pkcs8-public-pem');
}

function sign(message: string, privateKey: Object): Buffer {
  return privateKey.sign(message, 'buffer', 'utf8');
}

function verify(message: string, publicKey: Object, signature: Buffer): boolean {
  return publicKey.verify(message, signature, 'utf8', 'buffer');
}

exports.decrypt = decrypt;
exports.encrypt = encrypt;
exports.exportPrivateKey = exportPrivateKey;
exports.exportPublicKey = exportPublicKey;
exports.generatePrivateKey = generatePrivateKey;
exports.importPrivateKey = importPrivateKey;
exports.importPublicKey = importPublicKey;
exports.sign = sign;
exports.verify = verify;
