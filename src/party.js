'use strict';

const{
  Draft,
  Contereft,
  Email,
  Url,
  getRefSchema
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/party
*/

function partyFactory(type: string, format: string, isOrganization: boolean): Object {
  const ref = getRefSchema(format);
  const party = {
    $schema: Draft,
    title: type,
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: [type],
        readonly: true
      },
      email: Email,
      name: {
        type: 'string'
      },
      sameAs: {
        type: 'array',
        items: Url,
        minItems: 1,
        uniqueItems: true
      },
      url: Url
    },
    required: [
      '@context',
      '@type',
      'name'
    ]
  }
  if (isOrganization) {
    Object.assign(party.properties, {
      member: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      }
    });
  }
  return party
}

const MusicGroup = (format: string): Object => partyFactory('MusicGroup', format, true);
const Organization = (format: string): Object => partyFactory('Organization', format, true);
const Person = (format: string): Object => partyFactory('Person', format, false);

exports.MusicGroup = MusicGroup;
exports.Organization = Organization;
exports.Person = Person;
