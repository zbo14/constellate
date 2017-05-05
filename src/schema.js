'use strict';

const Ajv = require('ajv');

// @flow

/**
* @module constellate/src/schema
*/

const ajv = new Ajv();
const SCHEMA = 'http://json-schema.org/draft-06/schema#';

function validate(obj: Object, schema: Object): boolean {
  return ajv.compile(schema)(obj);
}

const id = {
  type: 'string',
  pattern: '^[A-Za-z0-9-_]{43}$'
}

const url = {
  type: 'string',
  // from http://stackoverflow.com/a/3809435
  pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

const header = {
  $schema: SCHEMA,
  title: 'header',
  type: 'object',
  properties: {
    id: id,
    url: url
  },
  required: ['id', 'url']
}

const user = {
  $schema: SCHEMA,
  title: 'user',
  type: 'object',
  properties: {
    id: Object.assign({readonly: true}, id),
    email: {
      type: 'string'
      // pattern: '^(([^<>()\\[\\]\\\.,;:\\s@"]+(\\.[^<>()\\[\\]\\\.,;:\\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\\.[0-9]{1,3}])|(([a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))$'
    },
    isni: {
      type: 'string',
      pattern: '^[0-9]{15}[0-9X]$'
    },
    name: {
      type: 'string'
    },
    publicKey: {
      type: 'string',
      pattern: '^[1-9A-HJ-NP-Za-km-z]{43,44}$'
    },
    url: url
  },
  required: ['email', 'id', 'name', 'url']
}

const headers = {
  type: 'array',
  items: {
    $ref: '#/definitions/header'
  },
  minItems: 1,
  uniqueItems: true
}

const composition = {
  $schema: SCHEMA,
  title: 'composition',
  type: 'object',
  definitions: {
    header: header
  },
  properties: {
    id: Object.assign({readonly: true}, id),
    composer: headers,
    iswc: {
      type: 'string',
      pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    },
    lyricist: headers,
    publisher: headers,
    recordedAs: headers,
    title: {
      type: 'string'
    },
    url: url
  },
  required: ['composer', 'id', 'title', 'url']
}

const recording = {
  $schema: SCHEMA,
  title: 'recording',
  type: 'object',
  definitions: {
    header: header
  },
  properties: {
    id: Object.assign({readonly: true}, id),
    isrc: {
      type: 'string',
      pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
    },
    performer: headers,
    producer: headers,
    recordingOf: {
      $ref: '#/definitions/header'
    },
    recordLabel: headers,
    url: url
  },
  required: ['id', 'performer', 'producer', 'recordingOf', 'url']
}

exports.SCHEMA = SCHEMA;
exports.header = header;
exports.user = user;
exports.composition= composition;
exports.recording = recording;
exports.validate = validate;
