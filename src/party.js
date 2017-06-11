'use strict';

const{
  Date,
  Draft,
  Email,
  Url,
  getRefSchema
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/party
*/

const MusicGroup = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicGroup',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicGroup'],
        readonly: true
      },
      email: Email,
      member: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
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
}

const Organization = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'Organization',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['Organization'],
        readonly: true
      },
      email: Email,
      member: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
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
}

const Person = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'Person',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['Person'],
        readonly: true
      },
      birthDate: Date,
      email: Email,
      familyName: {
        type: 'string'
      },
      givenName: {
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
      'birthDate',
      'familyName',
      'givenName'
    ]
  }
}

exports.MusicGroup = MusicGroup;
exports.Organization = Organization;
exports.Person = Person;
