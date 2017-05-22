'use strict';

const crypto = require('../lib/crypto.js');
const nacl = require('tweetnacl');
const {
    decodeBase58,
    digestSHA256,
    encodeBase58
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/ed25519
 */

function decodeKeypair(encoded) {
    const keypair = JSON.parse(encoded);
    return {
        privateKey: decodeBase58(keypair.privateKey),
        publicKey: decodeBase58(keypair.publicKey)
    }
}

function encodeKeypair(keypair) {
    return JSON.stringify({
        privateKey: encodeBase58(keypair.privateKey),
        publicKey: encodeBase58(keypair.publicKey)
    });
}

function generateKeypair() {
    return keypairBuffers(nacl.sign.keyPair());
}

function keypairFromPassword(password) {
    const secret = crypto.generateSecret(password);
    return keypairFromSeed(secret);
}

function keypairFromSeed(seed) {
    if (!seed || seed.length !== 32) {
        seed = crypto.generateSeed();
    };
    return keypairBuffers(nacl.sign.keyPair.fromSeed(seed));
}

function keypairBuffers(keypair) {
    return {
        privateKey: Buffer.from(keypair.secretKey),
        publicKey: Buffer.from(keypair.publicKey)
    }
}

function sign(message, privateKey) {
    const hash = digestSHA256(message);
    return Buffer.from(nacl.sign.detached(
        new Uint8Array(hash),
        new Uint8Array(privateKey)));
}

function verify(message, publicKey, signature) {
    const hash = digestSHA256(message);
    return nacl.sign.detached.verify(
        new Uint8Array(hash),
        new Uint8Array(signature),
        new Uint8Array(publicKey)
    );
}

exports.decodeKeypair = decodeKeypair;
exports.encodeKeypair = encodeKeypair;
exports.generateKeypair = generateKeypair;
exports.keypairFromPassword = keypairFromPassword;
exports.keypairFromSeed = keypairFromSeed;
exports.sign = sign;
exports.verify = verify;