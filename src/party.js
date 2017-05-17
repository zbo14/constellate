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
  encodeBase64,
  getId
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/party
*/

function calcPartyId(party: Object, publicKey: Buffer): string {
  let partyId = '';
  try {
    if (party['@type'] !== 'Artist' && party['@type'] !== 'Organization') {
      throw new Error('unexpected @type: ' + party['@type']);
    }
    if (!publicKey) {
      throw new Error('no public key');
    }
    if (publicKey.length !== 32 && publicKey.length !== 33) {
      throw new Error('invalid public key length: ' + publicKey.length);
    }
    partyId = encodeBase64(digestRIPEMD160(encodeBase64(digestSHA256(encodeBase64(publicKey)))));
  } catch(err) {
    console.error(err);
  }
  return partyId;
}

function getPartyId(party: Object): string {
  return getId('@id', party);
}

function setPartyId(party: Object, publicKey: Buffer): Object {
  const id = calcPartyId(party, publicKey);
  if (!id) return party;
  return Object.assign({}, party, { '@id': id });
}

function validateParty(party: Object, publicKey: Buffer, schema: Object): boolean {
  let valid = false;
  try {
    if (!validateSchema(party, schema)) {
      throw new Error('party has invalid schema: ' + JSON.stringify(party, null, 2));
    }
    const partyId = calcPartyId(party, publicKey);
    if (party['@id'] !== partyId) {
      throw new Error(`expected partyId=${party['@id']}; got ` + partyId);
    }
    valid = true;
  } catch(err) {
    console.error(err);
  }
  return valid;
}

const PartyId = {
  type: 'string',
  pattern: '^[A-Za-z0-9-_]{27}$'
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
    '@id': Object.assign({}, PartyId, { readonly: true }),
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
    '@id': PartyId,
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

exports.PartyId = PartyId;
exports.Artist = Artist;
exports.ArtistContext = ArtistContext;
exports.Organization = Organization;
exports.OrganizationContext = OrganizationContext;

exports.calcPartyId = calcPartyId;
exports.getPartyId = getPartyId;
exports.setPartyId = setPartyId;
exports.validateParty = validateParty;
