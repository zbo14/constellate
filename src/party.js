'use strict';

const isBuffer = require('is-buffer');

const{
  Draft,
  Email,
  Url,
  contextPrefix,
  validateSchema
} = require('../lib/schema.js');

const {
  digestRIPEMD160,
  digestSHA256,
  encodeBase58,
  getId, isObject
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/party
*/

const Addr = {
  type: 'string',
  pattern: '^0x[a-fA-F0-9]{40}$'
}

const Artist = {
  $schema: Draft,
  title: 'Artist',
  type: 'object',
  properties: {
    '@context': {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          default: 'http://schema.org/'
        },
        Artist: contextPrefix('schema', 'MusicGroup'),
        email: contextPrefix('schema', 'email'),
        homepage: contextPrefix('schema', 'url'),
        name: contextPrefix('schema', 'name'),
        profile: contextPrefix('schema', 'sameAs')
      },
      readonly: true,
      required: [
        'schema',
        'Artist',
        'email',
        'homepage',
        'name',
        'profile'
      ]
    },
    '@type': {
      enum: ['Artist'],
      readonly: true
    },
    '@id': Object.assign({}, Addr, { readonly: true }),
    email: Email,
    homepage: Url,
    name: {
      type: 'string'
    },
    profile: {
      type: 'array',
      items: Url,
      minItems: 1,
      uniqueItems: true
    }
  },
  required: ['@context', '@id', '@type']
}

const ArtistContext = {
  schema: 'http://schema.org/',
  Artist: 'schema:MusicGroup',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  profile: 'schema:sameAs'
}

const Organization = {
  $schema: Draft,
  title: 'Organization',
  type: 'object',
  properties: {
    '@context': {
      type: 'object',
      properties: {
        schema: {
          type: 'string',
          default: 'http://schema.org/'
        },
        email: contextPrefix('schema', 'email'),
        homepage: contextPrefix('schema', 'url'),
        name: contextPrefix('schema', 'name'),
        Organization: contextPrefix('schema', 'Organization'),
        profile: contextPrefix('schema', 'sameAs')
      },
      readonly: true,
      required: [
        'schema',
        'email',
        'homepage',
        'name',
        'Organization',
        'profile'
      ]
    },
    '@type': {
      enum: ['Organization'],
      readonly: true
    },
    '@id': Object.assign({}, Addr, { readonly: true }),
    email: Email,
    homepage: Url,
    name: {
      type: 'string'
    },
    profile: {
      type: 'array',
      items: Url,
      minItems: 1,
      uniqueItems: true
    }
  },
  required: ['@context', '@id', '@type']
}

const OrganizationContext = {
  schema: 'http://schema.org/',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  Organization: 'schema:Organization',
  profile: 'schema:sameAs'
}

function calcAddr(publicKey: Buffer|Object): string {
  let str;
  if (isBuffer(publicKey)) {
    if (publicKey.length !== 32 && publicKey.length !== 33) {
      throw new Error('invalid public-key buffer length: ' + publicKey.length);
    }
    str = encodeBase58(publicKey);
  } else if (typeof publicKey === 'object') {
    str = publicKey.toString();
    //..
  } else {
    throw new Error('unexpected public-key type: ' + typeof publicKey);
  }
  return'0x' + digestRIPEMD160(digestSHA256(str).toString('hex')).toString('hex');
}

function getAddr(party: Object): string {
  return getId('@id', party);
}

function getPartySchema(type: string): Object {
  if (type === 'Artist') {
    return Artist;
  }
  if (type === 'Organization') {
    return Organization;
  }
  throw new Error('unexpected party @type: ' + type);
}

function setAddr(party: Object, publicKey: Buffer|Object): Object {
  try {
    if (party['@type'] !== 'Artist' && party['@type'] !== 'Organization') {
      throw new Error('expected Artist or Organization; got' + party['@type']);
    }
    const addr = calcAddr(publicKey);
    party = Object.assign({}, party, { '@id': addr });
  } catch(err) {
    console.error(err);
  }
  return party;
}

function validateParty(party: Object, publicKey: Buffer|Object): boolean {
  let valid = false;
  try {
    const schema = getPartySchema(party['@type']);
    if (!validateSchema(party, schema)) {
      throw new Error('party has invalid schema: ' + JSON.stringify(party, null, 2));
    }
    if (party['@type'] !== 'Artist' && party['@type'] !== 'Organization') {
      throw new Error('expected Artist or Organization; got' + party['@type']);
    }
    const addr = calcAddr(publicKey);
    if (party['@id'] !== addr) {
      throw new Error(`expected addr=${party['@id']}; got ` + addr);
    }
    valid = true;
  } catch(err) {
    console.error(err);
  }
  return valid;
}

exports.Addr = Addr;
exports.ArtistContext = ArtistContext;
exports.OrganizationContext = OrganizationContext;

exports.calcAddr = calcAddr;
exports.getAddr = getAddr;
exports.getPartySchema = getPartySchema;
exports.setAddr = setAddr;
exports.validateParty = validateParty;
