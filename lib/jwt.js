const Ajv = require('ajv');
const ed25519 = require('../lib/ed25519.js');
const secp256k1 = require('../lib/secp256k1.js');
const {
    Addr
} = require('../lib/party.js');

const {
    MetaId,
    calcMetaId,
    validateMeta
} = require('../lib/meta.js');

const {
    Draft,
    validateSchema
} = require('../lib/schema.js');

const {
    calcId,
    decodeBase64,
    digestSHA256,
    encodeBase64,
    getId,
    now
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/jwt
 */

function calcClaimsId(claims) {
    return calcId('jti', claims);
}

function getClaimsId(claims) {
    return getId('jti', claims);
}

function setClaimsId(claims) {
    return Object.assign({}, claims, {
        'jti': calcClaimsId(claims)
    });
}

function timestamp(claims) {
    return Object.assign({}, claims, {
        iat: now()
    });
}

const PublicKey = {
    $schema: Draft,
    type: 'object',
    title: 'PublicKey',
    allOf: [{
            properties: {
                x: {
                    type: 'string',
                    pattern: '^[A-Za-z0-9-_]{43}$'
                }
            }
        },
        {
            oneOf: [{
                    properties: {
                        crv: {
                            enum: ['Ed25519']
                        },
                        kty: {
                            enum: ['OKP']
                        }
                    }
                },
                {
                    properties: {
                        crv: {
                            enum: ['P-256']
                        },
                        kty: {
                            enum: ['EC']
                        },
                        y: {
                            type: 'string',
                            pattern: '^[A-Za-z0-9-_]{43}$'
                        }
                    },
                    required: ['y']
                }
            ]
        }
    ],
    required: [
        'crv',
        'kty',
        'x'
    ]
}

const Header = {
    $schema: Draft,
    type: 'object',
    title: 'JWTHeader',
    properties: {
        alg: {
            enum: ['EdDsa', 'ES256']
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

const iat = Object.assign({}, intDate, {
    readonly: true
});

const jti = Object.assign({}, MetaId, {
    readonly: true
});

const Create = {
    $schema: Draft,
    type: 'object',
    title: 'Create',
    properties: {
        iat: iat,
        iss: Addr,
        jti: jti,
        sub: MetaId,
        typ: {
            enum: ['Create'],
            readonly: true
        }
    },
    required: [
        'iat',
        'iss',
        'jti',
        'sub',
        'typ'
    ]
}

const License = {
    $schema: Draft,
    type: 'object',
    title: 'License',
    properties: {
        aud: {
            type: 'array',
            items: Addr,
            minItems: 1,
            uniqueItems: true
        },
        exp: intDate,
        iat: iat,
        iss: Addr,
        jti: jti,
        nbf: intDate,
        sub: MetaId,
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
        'jti',
        'sub',
        'typ'
    ]
}

function signClaims(claims, header, secretKey) {
    let sig = new Buffer([]);
    const encodedHeader = encodeBase64(header);
    const encodedPayload = encodeBase64(claims);
    if (header.alg === 'EdDsa') {
        sig = ed25519.sign(encodedHeader + '.' + encodedPayload, secretKey);
    }
    if (header.alg === 'ES256') {
        sig = secp256k1.sign(encodedHeader + '.' + encodedPayload, secretKey);
    }
    return sig;
}

function validateClaims(claims, meta, schemaClaims, schemaMeta) {
    let valid = false;
    try {
        if (validateMeta(meta, schemaMeta)) {
            if (!validateSchema(claims, schemaClaims)) {
                throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
            }
            if (!['Create', 'License'].includes(claims.typ)) {
                throw new Error('unexpected typ: ' + claims.typ);
            }
            if (claims.iat > now()) {
                throw new Error('iat cannot be later than now');
            }
            if (claims.aud && claims.aud.some((aud) => aud === claims.iss)) {
                throw new Error('aud cannot contain iss');
            }
            const rightNow = now();
            if (claims.exp) {
                if (claims.exp <= claims.iat) {
                    throw new Error('exp cannot be earlier than/same as iat');
                }
                if (claims.nbf && claims.exp <= claims.nbf) {
                    throw new Error('exp cannot be earlier than/same as nbf');
                }
                if (claims.exp < rightNow) {
                    throw new Error('claims expired');
                }
            }
            if (claims.nbf) {
                if (claims.nbf <= claims.iat) {
                    throw new Error('nbf cannot be earlier than/same as iat');
                }
                if (claims.nbf > rightNow) {
                    throw new Error('claims not yet valid');
                }
            }
            const claimsId = calcClaimsId(claims);
            if (claims.jti !== claimsId) {
                throw new Error(`expected jti=${claims.jti}; got ` + claimsId);
            }
            const metaId = calcMetaId(meta);
            if (claims.sub !== metaId) {
                throw new Error(`expected sub=${claims.sub}; got ` + metaId);
            }
            switch (meta['@type']) {
                case 'Album':
                    if (!meta.artist.some((id) => {
                            return claims.iss === id;
                        })) throw new Error('iss should be artist on album');
                    break;
                case 'Composition':
                    if (!meta.composer.concat(meta.lyricist).some((id) => {
                            return claims.iss === id;
                        })) throw new Error('iss should be composer or lyricist of composition');
                    break;
                case 'Recording':
                    if (!meta.performer.concat(meta.producer).some((id) => {
                            return claims.iss === id;
                        })) throw new Error('iss should be performer or producer on recording');
                    break;
                default:
                    throw new Error('unexpected @type: ' + meta['@type']);
            }
            //..
            valid = true;
        }
    } catch (err) {
        console.error(err.message);
    }
    return valid;
}

function verifyClaims(claims, header, meta, schemaClaims, schemaMeta, signature) {
    let verified = false;
    try {
        if (!validateSchema(header, Header)) {
            throw new Error('header has invalid schema: ' + JSON.stringify(header, null, 2));
        }
        if (validateClaims(claims, meta, schemaClaims, schemaMeta)) {
            const encodedHeader = encodeBase64(header);
            const encodedPayload = encodeBase64(claims);
            const publicKey = decodeBase64(claims.iss);
            if (header.alg === 'EdDsa') {
                if (!ed25519.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
                    throw new Error('invalid ed25519 signature: ' + encodeBase64(signature));
                }
            }
            if (header.alg === 'ES256') {
                if (!secp256k1.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
                    throw new Error('invalid secp256k1 signature: ' + encodeBase64(signature));
                }
            }
            verified = true;
        }
    } catch (err) {
        console.error(err);
    }
    return verified;
}

exports.Create = Create;
exports.License = License;

exports.calcClaimsId = calcClaimsId;
exports.getClaimsId = getClaimsId;
exports.setClaimsId = setClaimsId;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;