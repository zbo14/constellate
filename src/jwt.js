const Ajv = require('ajv');
const ed25519 = require('../lib/ed25519.js');
const { calcMetaId, metaId, validateMeta } = require('../lib/meta.js');

const {
  calcId,
  decodeBase64,
  encodeBase64,
  getId, getIds,
  now,
  validateSchema
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/jwt
*/

const ajv = new Ajv();

const draft = 'http://json-schema.org/draft-06/schema#';

function calcClaimsId(claims: Object): string {
  return calcId('jti', claims);
}

function getClaimsId(claims: Object): string {
  return getId('jti', claims);
}

function getClaimsIds(...claims: Object[]): string[] {
  return getIds('jti', ...claims);
}

function setClaimsId(claims: Object): Object {
  return Object.assign({}, claims, { 'jti': calcClaimsId(claims) });
}

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

const intDate = {
  type: 'integer'
}

const iat = Object.assign({}, intDate, { readonly: true });

const jti = Object.assign({}, metaId, { readonly: true });

const Compose = {
  $schema: draft,
  type: 'object',
  title: 'Compose',
  properties: {
    iat: iat,
    iss: metaId,
    jti: jti,
    sub: metaId,
    typ: {
      enum: ['Compose'],
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
  $schema: draft,
  type: 'object',
  title: 'License',
  properties: {
    aud: {
      type: 'array',
      items: metaId,
      minItems: 1,
      uniqueItems: true
    },
    exp: intDate,
    iat: iat,
    iss: metaId,
    jti: jti,
    nbf: intDate,
    sub: metaId,
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

const Record = {
  $schema: draft,
  type: 'object',
  title: 'Record',
  properties: {
    iat: iat,
    iss: metaId,
    jti: jti,
    sub: metaId,
    typ: {
      enum: ['Record'],
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

function timestamp(claims: Object): Object {
  return Object.assign({}, claims, { iat: now() });
}

const encodedHeader = encodeBase64({
  alg: 'EdDsa', typ: 'JWT'
});

function signClaims(claims: Object, secretKey: Buffer): Buffer {
  const encodedPayload = encodeBase64(claims);
  return ed25519.sign(encodedHeader + '.' + encodedPayload, secretKey);
}

function validateClaims(claims: Object, meta: Object, schemaClaims: Object, schemaMeta: Object): boolean {
  let valid = false;
  try {
    if (validateMeta(meta, schemaMeta)) {
      if (!validateSchema(claims, schemaClaims)) {
        throw new Error('claims has invalid schema: ' + JSON.stringify(claims, null, 2));
      }
      if (claims.iat > now()) {
        throw new Error('iat cannot be later than now');
      }
      if (claims.aud && claims.aud.some((aud) => aud === claims.iss)) {
        throw new Error('audience cannot contain issuer');
      }
      if (claims.exp) {
        if (claims.exp < claims.iat) {
          throw new Error('expire time cannot be earlier than iat');
        }
        if (claims.nbf && claims.exp < claims.nbf) {
          throw new Error('expire time cannot be earlier than start time');
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
      //..
      valid = true;
    }
  } catch(err) {
    console.error(err.message);
  }
  return valid;
}

function verifyClaims(claims: Object, meta: Object, schemaClaims: Object, schemaMeta: Object, signature: Buffer): boolean {
  let verified = false;
  try {
    if (validateClaims(claims, meta, schemaClaims, schemaMeta)) {
      const encodedPayload = encodeBase64(claims);
      const publicKey = decodeBase64(claims.iss);
      if (!ed25519.verify(encodedHeader + '.' + encodedPayload, publicKey, signature)) {
        throw new Error('invalid signature: ' + encodeBase64(signature));
      }
      verified = true;
    }
  } catch(err) {
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

exports.calcClaimsId = calcClaimsId;
exports.getClaimsId = getClaimsId;
exports.getClaimsIds = getClaimsIds;
exports.setClaimsId = setClaimsId;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;
