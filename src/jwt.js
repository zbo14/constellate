'use strict';

const Ajv = require('ajv');
const { jwk2pem, pem2jwk } = require('pem-jwk');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { Addr, calcAddr } = require('../lib/party.js');
const { calcIPFSHash } = require('../lib/ipfs.js');

const {
  MetaId,
  getMetaId,
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
  getId, now,
  orderStringify,
  withoutKeys
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/jwt
*/

const ClaimsId = {
  type: 'string',
  pattern: '^[1-9A-HJ-NP-Za-km-z]{46}$'
}

const PublicKey = {
  $schema: Draft,
  type: 'object',
  title: 'PublicKey',
  oneOf: [
    {
      properties: {
        crv: {
          enum: ['Ed25519']
        },
        kty: {
          enum: ['OKP']
        },
        x: {
          type: 'string',
          pattern: '^[A-Za-z0-9-_]{43}$'
        }
      },
      required: ['crv', 'x']
    },
    {
      properties: {
        e: {
          enum: ['AQAB']
        },
        kty: {
          enum: ['RSA']
        },
        n: {
          type: 'string',
          pattern: '^[A-Za-z0-9-_]+$'
        }
      },
      required: ['e', 'n']
    },
    {
      properties: {
        crv: {
          enum: ['P-256']
        },
        kty: {
          enum: ['EC']
        },
        x: {
          type: 'string',
          pattern: '^[A-Za-z0-9-_]{43}$'
        },
        y: {
          type: 'string',
          pattern: '^[A-Za-z0-9-_]{43}$'
        }
      },
      required: ['crv', 'x', 'y']
    }
  ],
  required: ['kty']
}

const Header =  {
  $schema: Draft,
  type: 'object',
  title: 'Header',
  properties: {
    alg: {
      enum: ['EdDsa', 'ES256', 'RS256']
    },
    jwk: PublicKey,
    typ: {
      enum: ['JWT']
    },
    use: {
      enum: ['sig']
    }
  },
  oneOf: [
    {
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
          enum: ['RS256']
        },
        jwk: {
          properties: {
            kty: {
              enum: ['RSA']
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
    'typ',
    'use'
  ]
}

const intDate = {
  type: 'integer'
}

const iat = Object.assign({}, intDate, { readonly: true });

const jti = Object.assign({}, ClaimsId, { readonly: true });

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

function calcClaimsId(claims: Object, cb: Function) {
  const buf = new Buffer.from(orderStringify(withoutKeys(claims, 'jti')));
  calcIPFSHash(buf, cb);
}

function getClaimsId(claims: Object): string {
  return getId('jti', claims);
}

function getClaimsSchema(typ: string): Object {
    if (typ === 'Create') {
      return Create;
    }
    if (typ === 'License') {
      return License;
    }
    throw new Error('unexpected claims typ: ' + typ);
}


function newEd25519Header(publicKey: Buffer): Object {
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
      typ: 'JWT',
      use: 'sig'
    }
  } catch(err) {
    console.error(err);
  }
  return header;
}

function newRsaHeader(publicKey: Object): Object {
  let header = {};
  try {
    const jwk = pem2jwk(publicKey.toString());
    header = {
      alg: 'RS256',
      jwk: jwk,
      typ: 'JWT',
      use: 'sig'
    }
  } catch(err) {
    console.error(err);
  }
  return header;
}

function newSecp256k1Header(publicKey: Buffer): Object {
  let header = {};
  try {
    if (publicKey.length !== 33) {
      throw new Error('expected public key length=33; got ' + publicKey.length);
    }
    const coords = secp256k1.uncompress(publicKey);
    header = {
      alg: 'ES256',
      jwk: {
        x: encodeBase64(coords.x),
        y: encodeBase64(coords.y),
        crv: 'P-256',
        kty: 'EC'
      },
      typ: 'JWT',
      use: 'sig'
    }
  } catch(err) {
    console.error(err);
  }
  return header;
}


function setClaimsId(claims: Object, cb: Function) {
  calcClaimsId(claims, (err, id) => {
    if (err) return cb(err, null);
    cb(null, Object.assign({}, claims, { 'jti': id }));
  });
}

function signClaims(claims: Object, header: Object, privateKey: Buffer|Object): Buffer {
  let sig = new Buffer([]);
  const encodedHeader = encodeBase64(header);
  const encodedPayload = encodeBase64(claims);
  const message = encodedHeader + '.' + encodedPayload;
  if (header.alg === 'EdDsa') {
    sig = ed25519.sign(message, privateKey);
  }
  if (header.alg === 'ES256') {
    sig = secp256k1.sign(message, privateKey);
  }
  if (header.alg === 'RS256') {
    sig = rsa.sign(message, privateKey);
  }
  return sig;
}

function timestamp(claims: Object): Object {
  return Object.assign({}, claims, { iat: now() });
}

function validateClaims(claims: Object, meta: Object, cb: Function) {
  validateMeta(meta, (err) => {
    try {
      if (err) throw err;
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
      calcClaimsId(claims, (err, id) => {
        try {
          if (err) throw err;
          if (claims.jti !== id) {
            throw new Error(`expected jti=${claims.jti}; got ` + id);
          }
          const metaId = getMetaId(meta);
          if (claims.sub !== metaId) {
            throw new Error(`expected sub=${claims.sub}; got ` + metaId);
          }
          switch(meta['@type']) {
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
          cb(null);
        } catch(err) {
          cb(err);
        }
      });
    } catch(err) {
      cb(err);
    }
  });
}

function verifyClaims(claims: Object, header: Object, meta: Object, signature: Buffer, cb: Function): boolean {
  validateClaims(claims, meta, (err) => {
    try {
        if (err) throw err;
        if (!validateSchema(header, Header)) {
            throw new Error('header has invalid schema: ' + JSON.stringify(header, null, 2));
        }
        const encodedHeader = encodeBase64(header);
        const encodedPayload = encodeBase64(claims);
        const message = encodedHeader + '.' + encodedPayload;
        let publicKey;
        if (header.alg === 'EdDsa') {
            publicKey = decodeBase64(header.jwk.x);
            if (claims.iss !== calcAddr(publicKey)) {
                throw new Error('publicKey does not match addr');
            }
            if (!ed25519.verify(message, publicKey, signature)) {
                throw new Error('invalid ed25519 signature: ' + encodeBase64(signature));
            }
        }
        if (header.alg === 'ES256') {
            publicKey = secp256k1.compress(
                decodeBase64(header.jwk.x),
                decodeBase64(header.jwk.y)
            )
            if (claims.iss !== calcAddr(publicKey)) {
                throw new Error('public-key does not match addr');
            }
            if (!secp256k1.verify(message, publicKey, signature)) {
                throw new Error('invalid secp256k1 signature: ' + encodeBase64(signature));
            }
        }
        if (header.alg === 'RS256') {
            const pem = jwk2pem(header.jwk).slice(0, -1);
            publicKey = rsa.importPublicKey(pem);
            if (claims.iss !== calcAddr(publicKey)) {
                throw new Error('public-key does not match addr');
            }
            if (!rsa.verify(message, publicKey, signature)) {
                throw new Error('invalid rsa signature: ' + encodeBase64(signature));
            }
        }
        cb(null);
    } catch (err) {
        cb(err);
    }
  });
}

exports.ClaimsId = ClaimsId;
exports.calcClaimsId = calcClaimsId;
exports.getClaimsId = getClaimsId;
exports.getClaimsSchema = getClaimsSchema;
exports.newEd25519Header = newEd25519Header;
exports.newSecp256k1Header = newSecp256k1Header;
exports.newRsaHeader = newRsaHeader;
exports.setClaimsId = setClaimsId;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;
