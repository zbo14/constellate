'use strict';

const Ajv = require('ajv');
const { jwk2pem, pem2jwk } = require('pem-jwk');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { validateMeta } = require('../lib/meta.js');
const { calcHash } = require('../lib/ipfs.js');

const {
  Draft,
  Link,
  validateSchema
} = require('../lib/schema.js');

const {
  decodeBase64,
  encodeBase64,
  now,
  orderStringify,
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/jwt
*/

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

const Create = {
  $schema: Draft,
  type: 'object',
  title: 'Create',
  properties: {
    iat: iat,
    iss: Link,
    sub: Link,
    typ: {
      enum: ['Create'],
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
  $schema: Draft,
  type: 'object',
  title: 'License',
  properties: {
    aud: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    exp: intDate,
    iat: iat,
    iss: Link,
    nbf: intDate,
    sub: Link,
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

function signClaims(claims: Object, header: Object, privateKey: Buffer|Object): Buffer {
  let sig = Buffer.from([]);
  const encodedHeader = encodeBase64(Buffer.from(orderStringify(header)));
  const encodedPayload = encodeBase64(Buffer.from(orderStringify(claims)));
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

function validateClaims(claims: Object, meta: Object, subject?: Object): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const schema = getClaimsSchema(claims.typ);
    if (!validateSchema(claims, schema)) {
      return reject('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
    }
    const rightNow = now();
    if (claims.iat > rightNow) {
      return reject('iat cannot be later than now');
    }
    if (claims.typ === 'Create') {
      if (validateMeta(meta)) {
        calcHash(meta).then((hash) => {
          if (claims.sub['/'] !== hash) {
            return reject(`expected sub=${claims.sub}; got ` + hash);
          }
          switch(meta['@type']) {
            case 'Album':
              if (!meta.artist.some((hash) => {
                return claims.iss['/'] === hash;
              })) return reject('iss should be album artist');
              break;
            case 'Composition':
              if (!meta.composer.concat(meta.lyricist).some((hash) => {
                return claims.iss['/'] === hash;
              })) return reject('iss should be composer or lyricist');
              break;
            case 'Recording':
              if (!meta.performer.concat(meta.producer).some((hash) => {
                return claims.iss['/'] === hash;
              })) return reject('iss should be performer or producer');
              break;
            //..
          }
          resolve(true);
        });
      }
    }
    if (claims.typ === 'License') {
      if (claims.aud.some((aud) => aud['/'] === claims.iss['/'])) {
        return reject('aud cannot contain iss');
      }
      if (claims.exp <= claims.iat) {
        return reject('exp should be later than iat');
      }
      if (claims.exp < rightNow) {
        return reject('license expired');
      }
      if (claims.nbf) {
        if (claims.nbf >= claims.exp) {
          return reject('nbf should be before exp');
        }
        if (claims.nbf <= claims.iat) {
          return reject('nbf should be later than iat');
        }
        if (claims.nbf > rightNow) {
          return reject('license not yet valid');
        }
      }
      if (!subject) {
        return reject('no subject with license');
      }
      if (claims.iat < subject.iat) {
        return reject('iat cannot be before subject iat');
      }
      if (claims.iss['/'] !== subject.iss['/']) {
        return reject('iss should equal subject iss');
      }
      calcHash(subject).then((hash) => {
        if (claims.sub['/'] !== hash) {
          return reject('sub should equal subject jti');
        }
        return validateClaims(subject, meta);
      }).then(resolve, reject);
    }
  });
}

function verifyClaims(claims: Object, header: Object, meta: Object, signature: Buffer, subject?: Object, subjectSignature?: Buffer): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (!validateSchema(header, Header)) {
      return reject('header has invalid schema: ' + JSON.stringify(header, null, 2));
    }
    validateClaims(claims, meta, subject).then(() => {
      const encodedHeader = encodeBase64(Buffer.from(orderStringify(header)));
      let encodedPayload = encodeBase64(Buffer.from(orderStringify(claims)));
      let message = encodedHeader + '.' + encodedPayload;
      let publicKey, verify = () => {};
      if (header.alg === 'EdDsa') {
          publicKey = decodeBase64(header.jwk.x);
          verify = ed25519.verify;
      }
      if (header.alg === 'ES256') {
          const x = decodeBase64(header.jwk.x);
          const y = decodeBase64(header.jwk.y);
          publicKey = secp256k1.compress(x, y);
          verify = secp256k1.verify;
      }
      if (header.alg === 'RS256') {
          const pem = jwk2pem(header.jwk).slice(0, -1);
          publicKey = rsa.importPublicKey(pem);
          verify = rsa.verify;
      }
      if (!verify(message, publicKey, signature)) {
        return reject('invalid signature');
      }
      if (subject) {
        encodedPayload = encodeBase64(Buffer.from(orderStringify(subject)));
        message = encodedHeader + '.' + encodedPayload;
        if (!verify(message, publicKey, subjectSignature)) {
          return reject('invalid subject signature');
        }
      }
      resolve(true);
    });
  });
}

exports.getClaimsSchema = getClaimsSchema;
exports.newEd25519Header = newEd25519Header;
exports.newSecp256k1Header = newSecp256k1Header;
exports.newRsaHeader = newRsaHeader;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;
