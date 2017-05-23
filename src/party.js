'use strict';

const secp256k1 = require('../lib/secp256k1.js');

const {
  calcId,
  setId
} = require('../lib/util.js');

const{
  Address,
  Draft,
  Email,
  Id,
  Url,
  contextPrefix,
  validateSchema
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/party
*/

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
        address: contextPrefix('schema', 'address'),
        Artist: contextPrefix('schema', 'MusicGroup'),
        email: contextPrefix('schema', 'email'),
        homepage: contextPrefix('schema', 'url'),
        name: contextPrefix('schema', 'name'),
        profile: contextPrefix('schema', 'sameAs')
      },
      readonly: true,
      required: [
        'schema',
        'address',
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
    '@id': Object.assign({}, Id, { readonly: true }),
    address: Address,
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
  required: ['@context', '@id', '@type', 'name']
}

const ArtistContext = {
  schema: 'http://schema.org/',
  address: 'schema:address',
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
        address: contextPrefix('schema', 'address'),
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
    '@id': Object.assign({}, Id, { readonly: true }),
    address: Address,
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
  required: ['@context', '@id', '@type', 'name']
}

const OrganizationContext = {
  schema: 'http://schema.org/',
  address: 'schema:address',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  Organization: 'schema:Organization',
  profile: 'schema:sameAs'
}

function newParty(party: Object, publicKey?: Buffer): Promise<Object> {
  return new Promise((resolve, reject) => {
    if (publicKey) {
      if (publicKey.length !== 33) {
        return reject(`expected public-key length=33; got ` + publicKey.length);
      }
      party.address = secp256k1.publicKeyToAddress(publicKey);
    }
    setId('@id', party).then((party) => {
      resolve(party);
    });
  });
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

function validateParty(party: Object, publicKey?: Buffer): Promise<Object> {
  return calcId('@id', party).then((id) => {
    const schema = getPartySchema(party['@type']);
    if (!validateSchema(party, schema)) {
      throw new Error('party has invalid schema: ' + JSON.stringify(party, null, 2));
    }
    if (party['@id'] !== id) {
      throw new Error(`expected id=${party['@id']}; got ` + id);
    }
    if (publicKey) {
      if (publicKey.length !== 33) {
        throw new Error(`expected public-key length=33; got ` + publicKey.length);
      }
      const addr = secp256k1.publicKeyToAddress(publicKey);
      if (party.address !== addr) {
        throw new Error(`expected addr=${party['address']}; got ` + addr)
      }
    }
    return party;
  });
}

exports.ArtistContext = ArtistContext;
exports.OrganizationContext = OrganizationContext;
exports.getPartySchema = getPartySchema;
exports.newParty = newParty;
exports.validateParty = validateParty;
