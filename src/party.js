'use strict';

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
  getId
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/party
*/

function publicKey2Addr(publicKey: Buffer): string {
  return '0x' + digestRIPEMD160(digestSHA256(encodeBase58(publicKey)).toString('hex')).toString('hex');
}

function calcAddr(party: Object, publicKey: Buffer): string {
  let addr = '';
  try {
    if (party['@type'] !== 'Artist' && party['@type'] !== 'Organization') {
      throw new Error('unexpected @type: ' + party['@type']);
    }
    if (publicKey.length !== 32 && publicKey.length !== 33) {
      throw new Error('invalid public key length: ' + publicKey.length);
    }
    addr = publicKey2Addr(publicKey);
  } catch(err) {
    console.error(err);
  }
  return addr;
}

function getAddr(party: Object): string {
  return getId('@id', party);
}

function setAddr(party: Object, publicKey: Buffer): Object {
  const id = calcAddr(party, publicKey);
  if (!id) return party;
  return Object.assign({}, party, { '@id': id });
}

function validateParty(party: Object, publicKey: Buffer, schema: Object): boolean {
  let valid = false;
  try {
    if (!validateSchema(party, schema)) {
      throw new Error('party has invalid schema: ' + JSON.stringify(party, null, 2));
    }
    const addr = calcAddr(party, publicKey);
    if (party['@id'] !== addr) {
      throw new Error(`expected addr=${party['@id']}; got ` + addr);
    }
    valid = true;
  } catch(err) {
    console.error(err);
  }
  return valid;
}

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
    '@id': Addr,
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

exports.Addr = Addr;
exports.Artist = Artist;
exports.ArtistContext = ArtistContext;
exports.Organization = Organization;
exports.OrganizationContext = OrganizationContext;

exports.calcAddr = calcAddr;
exports.getAddr = getAddr;
exports.publicKey2Addr = publicKey2Addr;
exports.setAddr = setAddr;
exports.validateParty = validateParty;
