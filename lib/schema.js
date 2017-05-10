'use strict';

const Ajv = require('ajv');

// @flow

/**
* @module constellate/src/schema
*/

const ajv = new Ajv();

const context = {
  default: 'http://schema.org/',
  type: 'string',
  readonly: true
}

const draft = 'http://json-schema.org/draft-06/schema#';

function validate(obj        , schema        )          {
  return ajv.compile(schema)(obj);
}

function hideFields(obj        , ...keys          )         {
  return keys.reduce((result, key) => {
    if (!result.properties.hasOwnProperty(key) || !result.properties[key]) { return result; }
    return Object.assign({}, result , {
      properties: Object.assign({}, result.properties, {
        [key]: Object.assign({}, result.properties[key], { readonly: true })
      })
    });
  }, obj);
}

function hideId(obj        )         {
  return hideFields(obj, '@id');
}

function requireFields(obj        , ...keys          )         {
  return Object.assign({}, obj, { required: keys });
}

function requireHeader(obj        )         {
  return requireFields(obj, '@type', '@id');
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

const artist = {
  $schema: draft,
  title: 'Artist',
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
    sameAs: {
      type: 'array',
      items: url,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  }
}

const artistHeader = requireHeader(artist);

const organization = {
  $schema: draft,
  title: 'Organization',
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
  }
}

const organizationHeader = requireHeader(organization);

const composition = {
  $schema: draft,
  title: 'Composition',
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
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    composer: {
      type: 'array',
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    iswcCode: {
      type: 'string',
      pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    },
    lyricist: {
      type: 'array',
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    publisher: {
      type: 'array',
      items: organizationHeader,
      minItems: 1,
      uniqueItems: true
    },
    // recordedAs: {
    //  type: 'array',
    //  items: recording,
    //  minItems: 1,
    //  uniqueItems: true
    // },
    title: {
      type: 'string'
    },
    url: url
  }
}

const compositionHeader = requireHeader(composition);

const recording = {
  $schema: draft,
  title: 'Recording',
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
      items:  artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    producer: {
      type: 'array',
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    recordingOf: compositionHeader,
    recordLabel: {
      type: 'array',
      items: organizationHeader,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  }
}

const recordingHeader = requireHeader(recording);

const album = {
  $schema: draft,
  title: 'Album',
  type: 'object',
  properties: {
    '@context': context,
    '@type': {
      enum: ['MusicAlbum'],
      readonly: true
    },
    '@id': id,
    byArtist: artistHeader,
    track: {
      type: 'array',
      items: recordingHeader,
      minItems: 1,
      uniqueItems: true
    },
    url: url
  }
}

const Artist = requireFields(
  hideId(artist),
  '@context', '@type', '@id',
  'email', 'name'
);

const Organization = requireFields(
  hideId(organization),
  '@context', '@type', '@id',
  'email', 'name', 'url'
);

const Composition = requireFields(
  hideId(composition),
  '@context', '@type', '@id',
  'composer', 'title', 'url'
);

const Recording = requireFields(
  hideId(recording),
  '@context', '@type', '@id',
  'performer', 'producer', 'recordingOf', 'url'
);

const Album = requireFields(
  hideId(album),
  '@context', '@type', '@id',
  'byArtist', 'track', 'url'
);

exports.context = context;
exports.draft = draft;
exports.validate = validate;

exports.Artist = Artist
exports.Organization = Organization;
exports.Composition= Composition;
exports.Recording = Recording;
exports.Album = Album;
