'use strict';

const crypto = require('../lib/crypto.js');
const secp256k1 = require('secp256k1/js');
const {
    digestSHA256
} = require('../lib/util.js');

//

/**
 * @module constellate/src/secp256k1
 */

// https://www.npmjs.com/package/secp256k1

function randomKeypair() {
    let secretKey;
    do {
        secretKey = crypto.generateSeed();
    } while (!secp256k1.privateKeyVerify(secretKey));
    const publicKey = secp256k1.publicKeyCreate(secretKey);
    return {
        publicKey: publicKey,
        secretKey: secretKey
    }
}

function sign(message, secretKey) {
    const hash = digestSHA256(message);
    return secp256k1.sign(hash, secretKey).signature;
}

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
exports.randomKeypair = randomKeypair;
exports.sign = sign;
exports.uncompress = uncompress;
exports.verify = verify;
