const Ajv = require('ajv');
const crypto = require('../lib/crypto.js');
const util = require('../lib/util.js');

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

const header =  {
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

const id = {
  type: 'string',
  pattern: '^[A-Za-z0-9_-]{43}$'
}

const timestamp = {
  type: 'integer'
}

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
    exp: timestamp,
    iat: timestamp,
    iss: id,
    nbf: timestamp,
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
      enum: ['Record']
    }
  },
  required: [
    'iat',
    'iss',
    'sub',
    'typ'
  ]
}

const encodedHeader = util.encodeBase64({
  alg: 'EdDsa', typ: 'JWT'
});

function sign(claims: Object, schema: Object, secretKey: Uint8Array): Uint8Array {
  let signature = new Uint8Array([]);
  try {
    if (!ajv.compile(schema)(claims)) {
      throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
    }
    const encodedPayload = util.encodeBase64(claims);
    signature = crypto.sign(encodedHeader + '.' + encodedPayload, secretKey);
  } catch(err) {
    console.error(err);
  }
  return signature;
}

function verify(claims: Object, schema: Object, signature: Uint8Array): boolean {
  let verified = false;
  try {
    if (!ajv.compile(schema)(claims)) {
      throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
    }
    const encodedPayload = util.encodeBase64(claims);
    const publicKey = new Uint8Array(util.decodeBase64(claims.iss));
    verified = crypto.verify(encodedHeader + '.' + encodedPayload, publicKey, signature);
  } catch(err) {
    console.error(err);
  }
  return verified;
}

exports.Compose = Compose;
exports.License = License;
exports.Record = Record;

exports.sign = sign;
exports.verify = verify;
