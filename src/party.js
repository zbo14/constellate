'use strict';

const{
  Draft,
  Email,
  Link,
  Url
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/party
*/

function partyFactory(type: string, isOrganization: boolean): Object {
  const party = {
    $schema: Draft,
    title: type,
    type: 'object',
    properties: {
      '@context': {
        enum: ['http://schema.org/'],
        readonly: true
      },
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
        items: Link,
        minItems: 1,
        uniqueItems: true
      }
    });
  }
  return party
}

const MusicGroup = partyFactory('MusicGroup', true);
const Organization = partyFactory('Organization', true);
const Person = partyFactory('Person', false);

exports.MusicGroup = MusicGroup;
exports.Organization = Organization;
exports.Person = Person;
