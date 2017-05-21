'use strict';

const NodeRsa = require('node-rsa');
const {
    withoutKeys
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/rsa
 */

const privateKeyFormat = 'pkcs1-private-pem';
const publicKeyFormat = 'pkcs1-public-pem';

function decrypt(encrypted, privateKey) {
    return privateKey.decrypt(encrypted, 'buffer');
}

function encrypt(message, publicKey) {
    return publicKey.encrypt(message, 'buffer', 'utf8');
}

function exportPrivateKey(privateKey) {
    return privateKey.exportKey(privateKeyFormat);
}

function exportPublicKey(publicKey) {
    return publicKey.exportKey(publicKeyFormat);
}

function generateKeypair() {
    const privateKey = generatePrivateKey();
    const publicKey = getPublicKey(privateKey);
    privateKey.toString = () => exportPrivateKey(privateKey);
    publicKey.toString = () => exportPublicKey(publicKey);
    return {
        privateKey: privateKey,
        publicKey: publicKey
    }
}

function generatePrivateKey() {
    return new NodeRsa({
        b: 512
    }, {
        signingScheme: 'pkcs1-sha256'
    });
}

function getPublicKey(key) {
    return importPublicKey(exportPublicKey(key));
}

function importKey(pem, format) {
    let key = new NodeRsa();
    try {
        key.importKey(pem, format);
    } catch (err) {
        console.error(err);
        key = {};
    }
    key.toString = () => key.exportKey(format);
    return key;
}

function importPrivateKey(pem) {
    return importKey(pem, privateKeyFormat);
}

function importPublicKey(pem) {
    return importKey(pem, publicKeyFormat);
}

function sign(message, privateKey) {
    return privateKey.sign(message, 'buffer', 'utf8');
}

function verify(message, publicKey, signature) {
    return publicKey.verify(message, signature, 'utf8', 'buffer');
}

exports.decrypt = decrypt;
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