'use strict';

const atob = require('atob');
const bcryptjs = require('bcryptjs');
const crypto = require('crypto');

// @flow

/**
 * @module constellate/src/crypto
 */

const saltRounds = 10;

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

exports.generateSecret = generateSecret;
exports.generateSeed = generateSeed;