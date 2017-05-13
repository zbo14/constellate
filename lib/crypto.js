'use strict';

const atob = require('atob');
const bcrypt = require('bcrypt');
const Buffer = require('buffer/').Buffer;
const crypto = require('crypto');
const nacl = require('tweetnacl');
const util = require('../lib/util.js');

const {
    stringToUint8
} = util;

// @flow

/**
 * @module constellate/src/crypto
 */

const saltRounds = 10;

function generateKeypairFromPassword(password) {
    const secret = generateSecret(password);
    return generateKeypairFromSeed(secret);
}

function generateKeypairFromSeed(seed) {
    if (seed == null || seed.length !== 32) {
        seed = crypto.randomBytes(32);
    };
    return nacl.sign.keyPair.fromSeed(seed);
}

function generateRandomKeypair() {
    return nacl.sign.keyPair();
}

function generateSecret(password) {
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(password, salt)
        .match(/^\$2[ayb]\$([0-9]{2}\$[A-Za-z0-9\.\/]{53})$/)[1];
    return new Buffer(atob(hash).slice(-32), 'ascii');
}

function signMessage(message, secretKey) {
    return nacl.sign.detached(stringToUint8(message), secretKey);
}

function verifySignature(message, publicKey, signature) {
    return nacl.sign.detached.verify(stringToUint8(message), signature, publicKey);
}

exports.generateKeypairFromPassword = generateKeypairFromPassword;
exports.generateKeypairFromSeed = generateKeypairFromSeed;
exports.generateRandomKeypair = generateRandomKeypair;
exports.signMessage = signMessage;
exports.verifySignature = verifySignature;