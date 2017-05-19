'use strict';

const Ajv = require('ajv');
const ed25519 = require('../lib/ed25519.js');
const secp256k1 = require('../lib/secp256k1.js');
const {
    Addr,
    publicKey2Addr
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
    title: 'Header',
    properties: {
        alg: {
            enum: ['EdDsa', 'ES256']
        },
        jwk: PublicKey,
        typ: {
            enum: ['JWT']
        }
    },
    oneOf: [{
            properties: {
                alg: {
                    enum: ['EdDsa']
                },
                jwk: {
                    properties: {
                        crv: {
                            enum: ['Ed25519']
                        }
                    }
                }
            }
        },
        {
            properties: {
                alg: {
                    enum: ['ES256']
                },
                jwk: {
                    properties: {
                        crv: {
                            enum: ['P-256']
                        }
                    }
                }
            }
        }
    ],
    required: [
        'alg',
        'jwk',
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

function calcClaimsId(claims) {
    return calcId('jti', claims);
}

function ed25519Header(publicKey) {
    let header = {};
    try {
        if (publicKey.length !== 32) {
            throw new Error('expected public key length=32; got ' + publicKey.length);
        }
        header = {
            alg: 'EdDsa',
            jwk: {
                x: encodeBase64(publicKey),
                crv: 'Ed25519',
                kty: 'OKP'
            },
            typ: 'JWT'
        }
    } catch (err) {
        console.error(err);
    }
    return header;
}

function getClaimsId(claims) {
    return getId('jti', claims);
}

function getClaimsSchema(typ) {
    if (typ === 'Create') {
        return Create;
    }
    if (typ === 'License') {
        return License;
    }
    throw new Error('unexpected claims typ: ' + typ);
}

function secp256k1Header(publicKey) {
    let header = {};
    try {
        if (publicKey.length !== 33) {
            throw new Error('expected public key length=33; got ' + publicKey.length);
        }
        const coords = secp256k1.uncompress(publicKey);
        console.log(coords);
        header = {
            alg: 'ES256',
            jwk: {
                x: encodeBase64(coords.x),
                y: encodeBase64(coords.y),
                crv: 'P-256',
                kty: 'EC'
            },
            typ: 'JWT'
        }
    } catch (err) {
        console.error(err);
    }
    return header;
}

function setClaimsId(claims) {
    return Object.assign({}, claims, {
        'jti': calcClaimsId(claims)
    });
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

function timestamp(claims) {
    return Object.assign({}, claims, {
        iat: now()
    });
}

function validateClaims(claims, meta) {
    let valid = false;
    try {
        if (validateMeta(meta)) {
            const schema = getClaimsSchema(claims.typ);
            if (!validateSchema(claims, schema)) {
                throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
            }
            const rightNow = now();
            if (claims.iat > rightNow) {
                throw new Error('iat cannot be later than now');
            }
            if (claims.aud && claims.aud.some((aud) => aud === claims.iss)) {
                throw new Error('aud cannot contain iss');
            }
            if (claims.exp) {
                if (claims.exp <= claims.iat) {
                    throw new Error('exp should be later than iat');
                }
                if (claims.nbf && claims.exp <= claims.nbf) {
                    throw new Error('exp should be later than nbf');
                }
                if (claims.exp < rightNow) {
                    throw new Error('claims expired');
                }
            }
            if (claims.nbf) {
                if (claims.nbf <= claims.iat) {
                    throw new Error('nbf should be later than iat');
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
                        })) throw new Error('iss should be album artist addr');
                    break;
                case 'Composition':
                    if (!meta.composer.concat(meta.lyricist).some((id) => {
                            return claims.iss === id;
                        })) throw new Error('iss should be composer or lyricist addr');
                    break;
                case 'Recording':
                    if (!meta.performer.concat(meta.producer).some((id) => {
                            return claims.iss === id;
                        })) throw new Error('iss should be performer or producer addr');
                    break;
                    //..
            }
            valid = true;
        }
    } catch (err) {
        console.error(err);
    }
    return valid;
}

function verifyClaims(claims, header, meta, signature) {
    let verified = false;
    try {
        if (!validateSchema(header, Header)) {
            throw new Error('header has invalid schema: ' + JSON.stringify(header, null, 2));
        }
        if (validateClaims(claims, meta)) {
            const encodedHeader = encodeBase64(header);
            const encodedPayload = encodeBase64(claims);
            let publicKey;
            if (header.alg === 'EdDsa') {
                publicKey = decodeBase64(header.jwk.x);
                if (claims.iss !== publicKey2Addr(publicKey)) {
                    throw new Error('publicKey does not match addr');
                }
                if (!ed25519.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
                    throw new Error('invalid ed25519 signature: ' + encodeBase64(signature));
                }
            }
            if (header.alg === 'ES256') {
                publicKey = secp256k1.compress(
                    decodeBase64(header.jwk.x),
                    decodeBase64(header.jwk.y)
                )
                if (claims.iss !== publicKey2Addr(publicKey)) {
                    throw new Error('public-key does not match addr');
                }
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

exports.calcClaimsId = calcClaimsId;
exports.ed25519Header = ed25519Header;
exports.getClaimsId = getClaimsId;
exports.getClaimsSchema = getClaimsSchema;
exports.secp256k1Header = secp256k1Header;
exports.setClaimsId = setClaimsId;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;