'use strict';

const NodeRsa = require('node-rsa');

// @flow

/**
 * @module constellate/src/rsa
 */

function decrypt(encrypted, privateKey) {
    return privateKey.decrypt(encrypted, 'buffer');
}

function encrypt(message, publicKey) {
    return publicKey.encrypt(message, 'buffer', 'utf8');
}

function exportKey(key, format) {
    let pem = '';
    try {
        pem = key.exportKey(format);
    } catch (err) {
        console.error(err);
    }
    return pem;
}

function exportPrivateKey(key) {
    return exportKey(key, 'pkcs1-private-pem');
}

function exportPublicKey(key) {
    return exportKey(key, 'pkcs8-public-pem');
}

function generatePrivateKey() {
    return new NodeRsa({
        b: 512
    }, {
        signingScheme: 'pkcs1-sha256'
    });
}

function importKey(pem, format) {
    let key = new NodeRsa();
    try {
        key.importKey(pem, format);
    } catch (err) {
        console.error(err);
        key = {};
    }
    return key;
}

function importPrivateKey(pem) {
    return importKey(pem, 'pkcs1-private-pem');
}

function importPublicKey(pem) {
    return importKey(pem, 'pkcs8-public-pem');
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
exports.generatePrivateKey = generatePrivateKey;
exports.importPrivateKey = importPrivateKey;
exports.importPublicKey = importPublicKey;
exports.sign = sign;
exports.verify = verify;