const Ajv = require('ajv');
const crypto = require('../lib/crypto.js');
const meta = require('../lib/meta.js');
const util = require('../lib/util.js');

const { decodeBase64, encodeBase64, now } = util;

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

const intDate = {
  type: 'integer'
}

const timestamp = Object.assign({}, intDate, { readonly: true });

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

function setTimestamp(claims: Object): Object {
  return Object.assign({}, claims, { iat: now() });
}

const encodedHeader = encodeBase64({
  alg: 'EdDsa', typ: 'JWT'
});

function sign(claims: Object, secretKey: Uint8Array): Uint8Array {
  const encodedPayload = encodeBase64(claims);
  return crypto.sign(encodedHeader + '.' + encodedPayload, secretKey);
}

function validate(claims: Object, schema: Object): boolean {
  let valid = false;
  try {
    if (!ajv.compile(schema)(claims)) {
      throw new Error('has invalid schema: ' + JSON.stringify(claims, null, 2));
    }
    if (claims.iat > now()) {
      throw new Error('invalid timestamp: ' + claims.iat);
    }
    valid = true;
  } catch(err) {
    console.error(err.message);
  }
  return valid;
}

function verify(claims: Object, schema: Object, signature: Uint8Array): boolean {
  let verified = false;
  try {
    if (validate(claims, schema)) {
      const encodedPayload = encodeBase64(claims);
      const publicKey = new Uint8Array(decodeBase64(claims.iss));
      if (!crypto.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
        throw new Error('invalid signature: ' + encodeBase64(Buffer.from(signature)));
      }
      verified = true;
    }
  } catch(err) {
    console.error(err);
  }
  return verified;
}

function verifyCompose(compose: Object, composition: Object, signature: Uint8Array): boolean {
  let verified = false;
  try {
    if (!verify(compose, Compose, signature)) {
      throw new Error('invalid compose signature: ' + encodeBase64(Buffer.from(signature)) );
    }
    if (meta.validate(composition, meta.Composition)) {
      if (!composition.composer.concat(composition.lyricist).some((artist) => {
        return compose.iss === artist['@id'];
      })) throw new Error('issuer is not composer or lyricist of composition');
      if (compose.sub !== meta.calcId(composition)) {
        throw new Error('invalid compose subject: ' + compose.sub);
      }
      verified = true;
    }
  } catch(err) {
    console.error(err);
  }
  return verified;
}

function verifyRecord(record: Object, recording: Object, signature: Uint8Array): boolean {
  let verified = false;
  try {
    if (!verify(record, Record, signature)) {
      throw new Error('invalid record signature: ' + encodeBase64(Buffer.from(signature)));
    }
    if (meta.validate(record, meta.Recording)) {
      if (!recording.performer.concat(recording.producer).some((artist) => {
        return record.iss === artist['@id'];
      })) throw new Error('issuer is not performer or producer on recording');
      if (record.sub !== meta.calcId(recording)) {
        throw new Error('invalid record subject: ' + record.sub);
      }
      verified = true;
    }
  } catch(err) {
    console.error(err);
  }
  return verified;
}

exports.Compose = Compose;
exports.License = License;
exports.Record = Record;

exports.setTimestamp = setTimestamp;
exports.sign = sign;
exports.validate = validate;
exports.verify = verify;
exports.verifyCompose = verifyCompose;
exports.verifyRecord = verifyRecord;
