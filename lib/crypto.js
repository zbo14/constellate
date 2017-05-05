'use strict';

const atob = require('atob');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Buffer = require('buffer/').Buffer;
const ed25519 = require('ed25519');

// @flow

/**
* @module constellate/src/crypto
*/

const saltRounds = 10;

function generateSecret(password        )         {
  const salt = bcrypt.genSaltSync(saltRounds);
  const hash = bcrypt.hashSync(password, salt)
            .match(/^\$2[ayb]\$([0-9]{2}\$[A-Za-z0-9\.\/]{53})$/)[1];
  return new Buffer(atob(hash).slice(-32), 'ascii');
}

function generateSeed()         {
  return crypto.randomBytes(32);
}

function generateKeypairFromSeed(seed         )         {
  if (seed == null || seed.length !== 32) {
    seed = generateSeed();
  };
  return ed25519.MakeKeypair(seed);
}

function generateKeypairFromPassword(password        )         {
  // const hash = crypto.createHash('sha256').update(password).digest();
  const secret = generateSecret(password);
  return ed25519.MakeKeypair(secret);
}

function signMessage(message        , privateKey        )         {
  return ed25519.Sign(new Buffer(message, 'utf-8'), privateKey);
}

function verifySignature(message        , publicKey        , signature        )          {
  return ed25519.Verify(new Buffer(message, 'utf-8'), signature, publicKey);
}

exports.generateSeed = generateSeed;
exports.generateKeypairFromPassword = generateKeypairFromPassword;
exports.generateKeypairFromSeed = generateKeypairFromSeed;
exports.signMessage = signMessage;
exports.verifySignature = verifySignature;
