'use strict';

var Ajv = require('ajv');

// @flow

/**
* @module constellate/src/schema
*/

const ajv = new Ajv();

const context = {
  type: 'object',
  properties: {
    '@vocab': {
      default: 'http://schema.org',
      type: 'string'
    }
  },
  readonly: true,
  required: ['@vocab']
}

const draft = 'http://json-schema.org/draft-06/schema#';

function validate(obj        , schema        )          {
  return ajv.compile(schema)(obj);
}

const id = {
  default: 'null',
  type: 'string',
  pattern: '^[A-Za-z0-9-_]{43}$|^null$'
}

const required = ['@context', '@type', '@id']

const url = {
  type: 'string',
  // from http://stackoverflow.com/a/3809435
  pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

var artist = {
  $schema: draft,
  title: 'artist',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['MusicGroup', 'Person']
    },
    '@id': id,
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
      // /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    },
    // isni: {
    //  type: 'string',
    //  pattern: '^[0-9]{15}[0-9X]$'
    // },
    name: {
      type: 'string'
    },
    publicKey: {
      type: 'string',
      pattern: '^[1-9A-HJ-NP-Za-km-z]{43,44}$'
    },
    sameAs: {
      type: 'array',
      items: url,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  },
  required: required
}

var organization = {
  $schema: draft,
  title: 'organization',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['Organization'],
      readonly: true
    },
    '@id': id,
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
    },
    name: {
      type: 'string'
    },
    publicKey: {
      type: 'string',
      pattern: '^[1-9A-HJ-NP-Za-km-z]{43,44}$'
    },
    sameAs: {
      type: 'array',
      items: url,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  },
  required: required
}

var composition = {
  $schema: draft,
  title: 'composition',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['MusicComposition'],
      readonly: true
    },
    '@id': id,
    arranger: {
      type: 'array',
      items: artist,
      minItems: 1,
      uniqueItems: true
    },
    composer: {
      type: 'array',
      items: artist,
      minItems: 1,
      uniqueItems: true
    },
    iswcCode: {
      type: 'string',
      pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    },
    lyricist: {
      type: 'array',
      items: artist,
      minItems: 1,
      uniqueItems: true
    },
    publisher: {
      type: 'array',
      items: organization,
      minItems: 1,
      uniqueItems: true
    },
    recordedAs: {
      type: 'array',
      items: recording,
      minItems: 1,
      uniqueItems: true
    },
    title: {
      type: 'string'
    },
    url: url
  },
  required: required
}

var recording = {
  $schema: draft,
  title: 'recording',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['MusicRecording'],
      readonly: true
    },
    '@id': id,
    isrcCode: {
      type: 'string',
      pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
    },
    performer: {
      type: 'array',
      items: artist,
      minItems: 1,
      uniqueItems: true
    },
    producer: {
      type: 'array',
      items: artist,
      minItems: 1,
      uniqueItems: true
    },
    recordingOf: composition,
    recordLabel: {
      type: 'array',
      items: organization,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  },
  required: required
}

var album = {
  $schema: draft,
  title: 'album',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['MusicAlbum'],
      readonly: true
    },
    '@id': id,
    track: {
      type: 'array',
      items: recording,
      minItems: 1,
      uniqueItems: true
    }
  },
  required: required
}

exports.context = context;
exports.draft = draft;

exports.artist = artist
exports.organization = organization;

exports.composition= composition;
exports.recording = recording;
// exports.album = album;

exports.validate = validate;
