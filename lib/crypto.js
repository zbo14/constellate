'use strict';

const atob = require('atob');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const {
    decodeBase58,
    encodeBase58
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/crypto
 */

const saltRounds = 10;

function decodeKeypair(keypair) {
    return {
        publicKey: decodeBase58(keypair.publicKey),
        secretKey: decodeBase58(keypair.secretKey)
    }
}

function encodeKeypair(keypair) {
    return {
        publicKey: encodeBase58(keypair.publicKey),
        secretKey: encodeBase58(keypair.secretKey)
    }
}

function generateSecret(password) {
    let secret;
    try {
        const salt = bcryptjs.genSaltSync(saltRounds);
        const hash = bcryptjs.hashSync(password, salt).slice(-53);
        secret = new Buffer(
            (atob(hash.slice(0, 22)) + atob(hash.slice(22))).slice(-32),
            'ascii'
        );
    } catch (err) {
        console.error(err);
        secret = crypto.createHash('sha256').update(password).digest();
    }
    return secret;
}

function generateSeed() {
    return crypto.randomBytes(32);
}

exports.decodeKeypair = decodeKeypair;
exports.encodeKeypair = encodeKeypair;
exports.generateSecret = generateSecret;
exports.generateSeed = generateSeed;