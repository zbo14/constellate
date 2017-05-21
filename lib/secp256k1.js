'use strict';

const crypto = require('../lib/crypto.js');
const secp256k1 = require('secp256k1/js');
const {
    digestSHA256
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/secp256k1
 */

function compress(x, y) {
    let publicKey = new Buffer([]);
    try {
        if (x.length !== 32) {
            throw new Error('expected x coord length=32; got ' + x.length);
        }
        if (y.length !== 32) {
            throw new Error('expected y coord length=32; got ' + y.length);
        }
        publicKey = secp256k1.publicKeyConvert(new Buffer([4, ...x, ...y]), true);
    } catch (err) {
        console.error(err);
    }
    return publicKey;
}

// https://www.npmjs.com/package/secp256k1

function generateKeypair() {
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

function sign(message, privateKey) {
    const hash = digestSHA256(message);
    return secp256k1.sign(hash, privateKey).signature;
}

function uncompress(publicKey) {
    const buf = secp256k1.publicKeyConvert(publicKey, false);
    return {
        x: buf.slice(1, 33),
        y: buf.slice(33)
    }
}

function verify(message, publicKey, signature) {
    const hash = digestSHA256(message);
    return secp256k1.verify(hash, signature, publicKey);
}

exports.compress = compress;
exports.generateKeypair = generateKeypair;
exports.sign = sign;
exports.uncompress = uncompress;
exports.verify = verify;
