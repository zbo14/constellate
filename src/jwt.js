const Ajv = require('ajv');
const ed25519 = require('../lib/ed25519.js');
const { calcMetaId, getMetaId, metaId, validateMeta } = require('../lib/meta.js');

const {
  calcId,
  decodeBase64,
  draft,
  encodeBase64,
  getId, getIds,
  now,
  validateSchema
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/jwt
*/

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

function timestamp(claims: Object): Object {
  return Object.assign({}, claims, { iat: now() });
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

const encodedHeader = encodeBase64({
  alg: 'EdDsa', typ: 'JWT'
});

const intDate = {
  type: 'integer'
}

const iat = Object.assign({}, intDate, { readonly: true });

const jti = Object.assign({}, metaId, { readonly: true });

const Create = {
  $schema: draft,
  type: 'object',
  title: 'Create',
  properties: {
    iat: iat,
    iss: metaId,
    jti: jti,
    sub: metaId,
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

/*
const Transfer = {
  $schema: draft,
  type: 'object',
  title: 'Transfer',
  properties: {
    aud: {
      type: 'array',
      items: metaId,
      minItems: 1,
      uniqueItems: true
    },
    iat: iat,
    iss: metaId,
    jti: jti,
    sub: metaId,
    typ: {
      enum: ['Transfer'],
      readonly: true
    }
  },
  required: [
    'aud',
    'iat',
    'iss',
    'jti',
    'sub',
    'typ'
  ]
}
*/

const typs = ['Create', 'License'];

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
      if (!typs.includes(claims.typ)) {
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
      switch(meta['@type']) {
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

exports.Create = Create;
exports.License = License;

exports.calcClaimsId = calcClaimsId;
exports.getClaimsId = getClaimsId;
exports.getClaimsIds = getClaimsIds;
exports.setClaimsId = setClaimsId;
exports.signClaims = signClaims;
exports.timestamp = timestamp;
exports.validateClaims = validateClaims;
exports.verifyClaims = verifyClaims;
