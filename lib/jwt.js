const Ajv = require('ajv');
const crypto = require('../lib/crypto.js');
const {
    id
} = require('../lib/meta.js');
const {
    decodeBase64,
    encodeBase64,
    now
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/jwt
 */

const ajv = new Ajv();

const draft = 'http://json-schema.org/draft-06/schema#';

const publicKey = {
    type: 'object',
    properties: {
        crv: {
            enum: ['Ed25519'],
            readonly: true
        },
        kty: {
            enum: ['OKP'],
            readonly: true
        },
        x: {
            type: 'string',
            pattern: '^[A-Za-z0-9-_]{43}$'
        }
    },
    required: [
        'crv',
        'kty',
        'x'
    ]
}

const header = {
    $schema: draft,
    type: 'object',
    title: 'JWTHeader',
    properties: {
        alg: {
            enum: ['EdDsa']
        },
        typ: {
            enum: ['JWT']
        }
    },
    required: [
        'alg',
        'typ'
    ]
}

const intDate = {
    type: 'integer'
}

const timestamp = Object.assign({}, intDate, {
    readonly: true
});

const Compose = {
    $schema: draft,
    type: 'object',
    title: 'Compose',
    properties: {
        iat: timestamp,
        iss: id,
        sub: id,
        typ: {
            enum: ['Compose'],
            readonly: true
        }
    },
    required: [
        'iat',
        'iss',
        'sub',
        'typ'
    ]
}

const License = {
    $schema: draft,
    type: 'object',
    title: 'License',
    properties: {
        aud: {
            type: 'array',
            items: id,
            minItems: 1,
            uniqueItems: true
        },
        exp: intDate,
        iat: timestamp,
        iss: id,
        nbf: intDate,
        sub: id,
        typ: {
            enum: ['License'],
            readonly: true
        }
    },
    required: [
        'aud',
        'exp',
        'iat',
        'iss',
        'sub',
        'typ'
    ]
}

const Record = {
    $schema: draft,
    type: 'object',
    title: 'Record',
    properties: {
        iat: timestamp,
        iss: id,
        sub: id,
        typ: {
            enum: ['Record'],
            readonly: true
        }
    },
    required: [
        'iat',
        'iss',
        'sub',
        'typ'
    ]
}

function setTimestamp(claims) {
    return Object.assign({}, claims, {
        iat: now()
    });
}

const encodedHeader = encodeBase64({
    alg: 'EdDsa',
    typ: 'JWT'
});

function sign(claims, secretKey) {
    const encodedPayload = encodeBase64(claims);
    return crypto.sign(encodedHeader + '.' + encodedPayload, secretKey);
}

function validate(claims, schema) {
    let valid = false;
    try {
        if (!ajv.compile(schema)(claims)) {
            throw new Error('has invalid schema: ' + JSON.stringify(claims, null, 2));
        }
        if (claims.iat > now()) {
            throw new Error('timestamp cannot be later than now');
        }
        if (claims.aud && claims.aud.some((aud) => aud === claims.iss)) {
            throw new Error('audience cannot contain issuer');
        }
        if (claims.exp) {
            if (claims.exp < claims.iat) {
                throw new Error('expire time cannot be earlier than timestamp');
            }
            if (claims.nbf && claims.exp < claims.nbf) {
                throw new Error('expire time cannot be earlier than start time');
            }
        }
        valid = true;
    } catch (err) {
        console.error(err.message);
    }
    return valid;
}

function verify(claims, schema, signature) {
    let verified = false;
    try {
        const encodedPayload = encodeBase64(claims);
        const publicKey = decodeBase64(claims.iss);
        if (!crypto.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
            throw new Error('invalid signature: ' + encodeBase64(signature));
        }
        verified = true;
    } catch (err) {
        console.error(err);
    }
    return verified;
}

/*
if (!composition.composer.concat(composition.lyricist).some((artist) => {
  return compose.iss === artist['@id'];
})) throw new Error('issuer is not composer or lyricist of composition');

if (!recording.performer.concat(recording.producer).some((artist) => {
  return record.iss === artist['@id'];
})) throw new Error('issuer is not performer or producer on recording');
*/

exports.Compose = Compose;
exports.License = License;
exports.Record = Record;

exports.setTimestamp = setTimestamp;
exports.sign = sign;
exports.validate = validate;
exports.verify = verify;