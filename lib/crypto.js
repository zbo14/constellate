'use strict';

const atob = require('atob');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');
const Buffer = require('buffer/').Buffer;
const nacl = require('tweetnacl');
const util = require('../lib/util.js');

const {
    decodeBase64,
    encodeBase64,
    strToUint8Array
} = util;

// @flow

/**
 * @module constellate/src/crypto
 */

const saltRounds = 10;

function decodeKeypair(encoded) {
    return {
        publicKey: new Uint8Array(decodeBase64(encoded.publicKey)),
        secretKey: new Uint8Array(decodeBase64(encoded.secretKey))
    }
}

function encodeKeypair(keypair) {
    return {
        publicKey: encodeBase64(Buffer.from(keypair.publicKey)),
        secretKey: encodeBase64(Buffer.from(keypair.secretKey))
    }
}

function generateKeypairFromPassword(password) {
    const secret = generateSecret(password);
    return generateKeypairFromSeed(secret);
}

function generateKeypairFromSeed(seed) {
    if (seed == null || seed.length !== 32) {
        seed = generateSeed();
    };
    return nacl.sign.keyPair.fromSeed(seed);
}

function generateRandomKeypair() {
    return nacl.sign.keyPair();
}

function generateSecret(password) {
    const salt = bcryptjs.genSaltSync(saltRounds);
    const hash = bcryptjs.hashSync(password, salt).slice(-53);
    const secret = (atob(hash.slice(22)) + atob(hash.slice(-31))).slice(-32);
    return new Buffer(secret, 'ascii');
}

function generateSeed() {
    return crypto.randomBytes(32);
}

function sign(message, secretKey) {
    return nacl.sign.detached(strToUint8Array(message), secretKey);
}

function verify(message, publicKey, signature) {
    return nacl.sign.detached.verify(strToUint8Array(message), signature, publicKey);
}

exports.decodeKeypair = decodeKeypair;
exports.encodeKeypair = encodeKeypair;
exports.generateKeypairFromPassword = generateKeypairFromPassword;
exports.generateKeypairFromSeed = generateKeypairFromSeed;
exports.generateRandomKeypair = generateRandomKeypair;
exports.generateSeed = generateSeed;
exports.sign = sign;
exports.verify = verify;