'use strict';

const Ajv = require('ajv');
const util = require('../lib/util.js');

const {
  digestSHA256,
  encodeBase64,
  hasKeys,
  orderStringify,
  withoutKeys
} = util;

// @flow

/**
* @module constellate/src/meta
*/

const ajv = new Ajv();

const draft = 'http://json-schema.org/draft-06/schema#';

const schema = {
  type: 'string',
  default: 'http://schema.org/',
  readonly: true
}

function calcId(obj: Object): string {
  return encodeBase64(digestSHA256(orderStringify(withoutKeys(obj, '@id'))));
}

function checkId(obj: Object, publicKey: ?Buffer): boolean {
  return obj['@id'] === setId(obj, publicKey)['@id'];
}

function getHeader(obj: Object): Object {
  let header = {};
  if (hasKeys(obj, '@type', '@id')) {
    header = {
      '@type': obj['@type'],
      '@id': obj['@id']
    }
  }
  return header;
}

function getHeaders(...objs: Object[]): Object[] {
  return objs.map(getHeader);
}

function hideFields(obj: Object, ...keys: string[]): Object {
  return keys.reduce((result, key) => {
    if (!result.properties.hasOwnProperty(key) || !result.properties[key]) { return result; }
    return Object.assign({}, result , {
      properties: Object.assign({}, result.properties, {
        [key]: Object.assign({}, result.properties[key], { readonly: true })
      })
    });
  }, obj);
}

function hideId(obj: Object): Object {
  return hideFields(obj, '@id');
}

function requireFields(obj: Object, ...keys: string[]): Object {
  return Object.assign({}, obj, { required: keys });
}

function requireHeader(obj: Object): Object {
  return requireFields(obj, '@type', '@id');
}

function schemaPrefix(field: string) {
  return {
    type: 'string',
    default: 'schema:' + field
  }
}

function setId(obj: Object, publicKey: ?Buffer): Object {
  if (publicKey && publicKey.length === 32) {
    return Object.assign({}, obj, {
      '@id': encodeBase64(publicKey)
    });
  }
  return Object.assign({}, obj, {
    '@id': calcId(obj)
  });
}

function validate(meta: Object, schema: Object, publicKey: ?Buffer): boolean {
  let valid = false;
  try {
    if (!checkId(meta, publicKey)) {
      throw new Error('meta has invalid id: ' + meta['@id']);
    }
    if (!ajv.compile(schema)(meta)) {
      throw new Error('meta has invalid schema: ' + JSON.stringify(meta, null, 2));
    }
    valid = true;
  } catch(err) {
    console.error(err.message);
  }
  return valid;
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

const artistContext = {
  type: 'object',
  properties: {
    schema: schema,
    Artist: schemaPrefix('MusicGroup'),
    email: schemaPrefix('email'),
    homepage: schemaPrefix('url'),
    name: schemaPrefix('name'),
    profile: schemaPrefix('sameAs')
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
}

const artist = {
  $schema: draft,
  title: 'Artist',
  type: 'object',
  properties: {
    '@context': artistContext,
    '@type': {
      enum: ['Artist'],
      readonly: true
    },
    '@id': id,
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
    },
    homepage: url,
    name: {
      type: 'string'
    },
    profile: {
      type: 'array',
      items: url,
      minItems: 1,
      uniqueItems: true
    }
  }
}

const artistHeader = requireHeader(artist);

const organizationContext = {
  type: 'object',
  properties: {
    schema: schema,
    email: schemaPrefix('email'),
    homepage: schemaPrefix('url'),
    name: schemaPrefix('name'),
    Organization: schemaPrefix('Organization'),
    profile: schemaPrefix('sameAs')
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
}

const organization = {
  $schema: draft,
  title: 'Organization',
  type: 'object',
  properties: {
    '@context': organizationContext,
    '@type': {
      enum: ['Organization'],
      readonly: true
    },
    '@id': id,
    email: {
      type: 'string',
      pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
    },
    homepage: url,
    name: {
      type: 'string'
    },
    profile: {
      type: 'array',
      items: url,
      minItems: 1,
      uniqueItems: true
    }
  }
}

const organizationHeader = requireHeader(organization);

const compositionContext = {
  type: 'object',
  properties: {
    schema: schema,
    composer: schemaPrefix('composer'),
    Composition: schemaPrefix('MusicComposition'),
    iswc: schemaPrefix('iswcCode'),
    lyricist: schemaPrefix('lyricist'),
    publisher: schemaPrefix('publisher'),
    title: schemaPrefix('name')
  },
  readonly: true,
  required: [
    'schema',
    'composer',
    'Composition',
    'iswc',
    'lyricist',
    'publisher',
    'title'
  ]
}

const composition = {
  $schema: draft,
  title: 'Composition',
  type: 'object',
  properties: {
    '@context': compositionContext,
    '@type': {
      enum: ['Composition'],
      readonly: true
    },
    '@id': id,
    composer: {
      type: 'array',
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    iswc: {
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
    title: {
      type: 'string'
    }
  }
}

const compositionHeader = requireHeader(composition);

const audioContext = {
  type: 'object',
  properties: {
    schema: schema,
    Audio: schemaPrefix('AudioObject'),
    contentUrl: schemaPrefix('contentUrl'),
    encodingFormat: schemaPrefix('encodingFormat')
  },
  readonly: true,
  required: [
    'Audio',
    'contentUrl',
    'encodingFormat'
  ]
}

const audio = {
  $schema: draft,
  title: 'Audio',
  type: 'object',
  properties: {
    '@context': audioContext,
    '@type': {
      enum: ['Audio'],
      readonly: true
    },
    '@id': id,
    contentUrl: {
      type: 'string',
      pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
    },
    encodingFormat: {
      enum: ['mp3', 'mpeg4']
    }
  }
}

const audioHeader = requireHeader(audio);

const recordingContext = {
  type: 'object',
  properties: {
    schema: schema,
    audio: schemaPrefix('audio'),
    isrc: schemaPrefix('isrcCode'),
    performer: schemaPrefix('performer'),
    producer: schemaPrefix('producer'),
    Recording: schemaPrefix('MusicRecording'),
    recordingOf: schemaPrefix('recordingOf'),
    recordLabel: schemaPrefix('recordLabel')
  },
  readonly: true,
  required: [
    'schema',
    'audio',
    'isrc',
    'performer',
    'producer',
    'Recording',
    'recordingOf',
    'recordLabel'
  ]
}

const recording = {
  $schema: draft,
  title: 'Recording',
  type: 'object',
  properties: {
    '@context': recordingContext,
    '@type': {
      enum: ['Recording'],
      readonly: true
    },
    '@id': id,
    audio: {
      type: 'array',
      items: audioHeader,
      minItems: 1,
      uniqueItems: true
    },
    isrc: {
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
    }
  }
}

const recordingHeader = requireHeader(recording);

const albumContext =  {
  type: 'object',
  properties: {
    schema: schema,
    Album: schemaPrefix('MusicAlbum'),
    artist: schemaPrefix('byArtist'),
    productionType: schemaPrefix('albumProductionType'),
    recordLabel: schemaPrefix('recordLabel'),
    releaseType: schemaPrefix('albumReleaseType'),
    track: schemaPrefix('track')
  },
  readonly: true,
  required: [
    'schema',
    'Album',
    'artist',
    'productionType',
    'recordLabel',
    'releaseType',
    'track'
  ]
}

const album = {
  $schema: draft,
  title: 'Album',
  type: 'object',
  properties: {
    '@context': albumContext,
    '@type': {
      enum: ['Album'],
      readonly: true
    },
    '@id': id,
    artist: {
      type: 'array',
      items: artistHeader,
      minItems: 1,
      uniqueItems: true
    },
    productionType: {
      enum: [
        'CompilationAlbum',
        'DJMixAlbum',
        'DemoAlbum',
        'LiveAlbum',
        'MixtapeAlbum',
        'RemixAlbum',
        'SoundtrackAlbum',
        'SpokenWordAlbum',
        'StudioAlbum'
      ]
    },
    recordLabel: {
      type: 'array',
      items: organizationHeader,
      minItems: 1,
      uniqueItems: true
    },
    releaseType: {
      enum: [
        'AlbumRelease',
        'BroadcastRelease',
        'EPRelease',
        'SingleRelease'
      ]
    },
    track: {
      type: 'array',
      items: recordingHeader,
      minItems: 1,
      uniqueItems: true
    }
  }
}

const Album = requireFields(
  hideId(album),
  '@context', '@type', '@id',
  'artist', 'track'
);

const Artist = requireFields(
  hideId(artist),
  '@context', '@type', '@id',
  'email', 'name'
);

const Audio = requireFields(
  hideId(audio),
  '@context', '@type', '@id',
  'contentUrl'
);

const Composition = requireFields(
  hideId(composition),
  '@context', '@type', '@id',
  'composer', 'title'
);

const Organization = requireFields(
  hideId(organization),
  '@context', '@type', '@id',
  'email', 'name'
);

const Recording = requireFields(
  hideId(recording),
  '@context', '@type', '@id',
  'audio', 'performer', 'recordingOf'
);

exports.Album = Album;
exports.Artist = Artist;
exports.Audio = Audio;
exports.Composition = Composition;
exports.Organization = Organization;
exports.Recording = Recording;

exports.calcId = calcId;
exports.checkId = checkId;
exports.getHeader = getHeader;
exports.getHeaders = getHeaders;
exports.id = id;
exports.schemaPrefix = schemaPrefix;
exports.setId = setId;
exports.validate = validate;
