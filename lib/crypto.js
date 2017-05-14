'use strict';

const atob = require('atob');
// const bcrypt = require('bcrypt');
const Buffer = require('buffer/').Buffer;
const nacl = require('tweetnacl');
const util = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/crypto
 */

const saltRounds = 10;

function generateKeypairFromPassword(password) {
    // const secret = generateSecret(password);
    const hash = util.digestSHA256(password);
    return generateKeypairFromSeed(hash);
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

/*
function generateSecret(password: string): Buffer {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt)
            .match(/^\$2[ayb]\$([0-9]{2}\$[A-Za-z0-9\.\/]{53})$/)[1];
  return new Buffer(atob(hash).slice(-32), 'ascii');
}
*/

function generateSeed() {
    return crypto.randomBytes(32);
}

function signMessage(message, secretKey) {
    return nacl.sign.detached(util.strToUint8Array(message), secretKey);
}

function verifySignature(message, publicKey, signature) {
    return nacl.sign.detached.verify(util.strToUint8Array(message), signature, publicKey);
}

exports.generateKeypairFromPassword = generateKeypairFromPassword;
exports.generateKeypairFromSeed = generateKeypairFromSeed;
exports.generateRandomKeypair = generateRandomKeypair;
exports.generateSeed = generateSeed;
exports.signMessage = signMessage;
exports.verifySignature = verifySignature;