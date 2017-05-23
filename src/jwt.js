'use strict';

const Ajv = require('ajv');
const { jwk2pem, pem2jwk } = require('pem-jwk');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { validateMeta } = require('../lib/meta.js');

const {
  Draft,
  Id,
  validateSchema
} = require('../lib/schema.js');

const {
  calcId,
  decodeBase64,
  encodeBase64,
  now,
  orderStringify,
  setId
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

const jti = Object.assign({}, Id, { readonly: true });

const Create = {
  $schema: Draft,
  type: 'object',
  title: 'Create',
  properties: {
    iat: iat,
    iss: Id,
    jti: jti,
    sub: Id,
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
      items: Id,
      minItems: 1,
      uniqueItems: true
    },
    exp: intDate,
    iat: iat,
    iss: Id,
    jti: jti,
    nbf: intDate,
    sub: Id,
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

function newClaims(claims: Object): Promise<Object> {
  return setId('jti', timestamp(claims));
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

function validateClaims(claims: Object, meta: Object, subject?: Object): Promise<Object> {
  return calcId('jti', claims).then((id) => {
    const schema = getClaimsSchema(claims.typ);
    if (!validateSchema(claims, schema)) {
      throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
    }
    const rightNow = now();
    if (claims.iat > rightNow) {
      throw new Error('iat cannot be later than now');
    }
    if (claims.jti !== id) {
      throw new Error(`expected jti=${claims.jti}; got ` + id);
    }
    let promise = Promise.resolve();
    if (claims.typ === 'Create') {
      promise = validateMeta(meta).then(() => {
        if (claims.sub !== meta['@id']) {
          throw new Error(`expected sub=${claims.sub}; got ` + meta['@id']);
        }
        switch(meta['@type']) {
          case 'Album':
            if (!meta.artist.some((id) => {
              return claims.iss === id;
            })) throw new Error('iss should be album artist');
            break;
          case 'Composition':
            if (!meta.composer.concat(meta.lyricist).some((id) => {
              return claims.iss === id;
            })) throw new Error('iss should be composer or lyricist');
            break;
          case 'Recording':
            if (!meta.performer.concat(meta.producer).some((id) => {
              return claims.iss === id;
            })) throw new Error('iss should be performer or producer addr');
            break;
          //..
        }
        return claims;
      });
    }
    if (claims.typ === 'License') {
      if (claims.aud.some((aud) => aud === claims.iss)) {
        throw new Error('aud cannot contain iss');
      }
      if (claims.exp <= claims.iat) {
        throw new Error('exp should be later than iat');
      }
      if (claims.exp < rightNow) {
        throw new Error('license expired');
      }
      if (claims.nbf) {
        if (claims.nbf >= claims.exp) {
          throw new Error('nbf should be before exp');
        }
        if (claims.nbf <= claims.iat) {
          throw new Error('nbf should be later than iat');
        }
        if (claims.nbf > rightNow) {
          throw new Error('license not yet valid');
        }
      }
      if (!subject) {
        throw new Error('no subject with license');
      }
      if (claims.iat < subject.iat) {
        throw new Error('iat cannot be before subject iat');
      }
      if (claims.iss !== subject.iss) {
        throw new Error('iss should equal subject iss');
      }
      if (claims.sub !== subject.jti) {
        throw new Error('sub should equal subject jti');
      }
      //..
      promise = validateClaims(subject, meta).then(() => {
        return claims;
      });
    }
    return promise;
  });
}

function verifyClaims(claims: Object, header: Object, meta: Object, signature: Buffer, subject?: Object, subjectSignature?: Buffer): Promise<Object> {
  return validateClaims(claims, meta, subject).then(() => {
    if (!validateSchema(header, Header)) {
        throw new Error('header has invalid schema: ' + JSON.stringify(header, null, 2));
    }
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
      throw new Error('invalid signature');
    }
    if (subject) {
      encodedPayload = encodeBase64(Buffer.from(orderStringify(subject)));
      message = encodedHeader + '.' + encodedPayload;
      if (!verify(message, publicKey, subjectSignature)) {
        throw new Error('invalid subject signature');
      }
    }
    return claims;
  });
}

exports.getClaimsSchema = getClaimsSchema;
exports.newClaims = newClaims;
exports.newEd25519Header = newEd25519Header;
exports.newSecp256k1Header = newSecp256k1Header;
exports.newRsaHeader = newRsaHeader;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;
