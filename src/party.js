'use strict';

const{
  Address,
  Draft,
  Email,
  Link,
  Url
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/party
*/

const MusicGroup = {
  $schema: Draft,
  title: 'MusicGroup',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['MusicGroup'],
      readonly: true
    },
    address: Address,
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

const Organization = {
  $schema: Draft,
  title: 'Organization',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['Organization'],
      readonly: true
    },
    address: Address,
    email: Email,
    member: {
      type: 'array',
      items: Link,
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

exports.MusicGroup = MusicGroup;
exports.Organization = Organization;
