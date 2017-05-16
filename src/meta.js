'use strict';

const util = require('../lib/util.js');

const {
  calcId,
  digestSHA256,
  encodeBase64,
  getId, getIds,
  hasKeys,
  orderStringify,
  validateSchema,
  withoutKeys
} = util;

// @flow

/**
* @module constellate/src/meta
*/

const draft = 'http://json-schema.org/draft-06/schema#';

const schema = {
  type: 'string',
  default: 'http://schema.org/',
  readonly: true
}

function calcMetaId(meta: Object, publicKey: ?Buffer): string {
  if (publicKey && publicKey.length === 32) {
    return encodeBase64(publicKey);
  }
  return calcId('@id', meta);
}

function getMetaId(meta: Object): Object {
  return getId('@id', meta);
}

function getMetaIds(...metas: Object[]): Object[] {
  return getIds('@id', ...metas);
}

function hideFields(meta: Object, ...keys: string[]): Object {
  return keys.reduce((result, key) => {
    if (!result.properties.hasOwnProperty(key) || !result.properties[key]) { return result; }
    return Object.assign({}, result , {
      properties: Object.assign({}, result.properties, {
        [key]: Object.assign({}, result.properties[key], { readonly: true })
      })
    });
  }, meta);
}

function hideId(meta: Object): Object {
  return hideFields(meta, '@id');
}

function requireFields(meta: Object, ...keys: string[]): Object {
  return Object.assign({}, meta, { required: keys });
}

function requireId(meta: Object): Object {
  return requireFields(meta, '@id');
}

function schemaPrefix(field: string) {
  return {
    type: 'string',
    default: 'schema:' + field
  }
}

function setMetaId(meta: Object, publicKey: ?Buffer): Object {
  return Object.assign({}, meta, { '@id': calcMetaId(meta, publicKey) });
}

function validateMeta(meta: Object, schema: Object, publicKey: ?Buffer): boolean {
  let valid = false;
  try {
    if (!validateSchema(meta, schema)) {
      throw new Error('meta has invalid schema: ' + JSON.stringify(meta, null, 2));
    }
    const id = calcMetaId(meta, publicKey);
    if (meta['@id'] !== id) {
      throw new Error(`expected metaId=${meta['@id']}; got ` + id);
    }
    valid = true;
  } catch(err) {
    console.error(err);
  }
  return valid;
}

const metaId = {
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
    '@id': metaId,
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

const artistId = requireId(artist);

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
    '@id': metaId,
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

const organizationId = requireId(organization);

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
    '@id': metaId,
    composer: {
      type: 'array',
      items: artistId,
      minItems: 1,
      uniqueItems: true
    },
    iswc: {
      type: 'string',
      pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    },
    lyricist: {
      type: 'array',
      items: artistId,
      minItems: 1,
      uniqueItems: true
    },
    publisher: {
      type: 'array',
      items: organizationId,
      minItems: 1,
      uniqueItems: true
    },
    title: {
      type: 'string'
    }
  }
}

const compositionId = requireId(composition);

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
    '@id': metaId,
    contentUrl: {
      type: 'string',
      pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
    },
    encodingFormat: {
      enum: ['mp3', 'mpeg4']
    }
  }
}

const audioId = requireId(audio);

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
    '@id': metaId,
    audio: {
      type: 'array',
      items: audioId,
      minItems: 1,
      uniqueItems: true
    },
    isrc: {
      type: 'string',
      pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
    },
    performer: {
      type: 'array',
      items:  artistId,
      minItems: 1,
      uniqueItems: true
    },
    producer: {
      type: 'array',
      items: artistId,
      minItems: 1,
      uniqueItems: true
    },
    recordingOf: compositionId,
    recordLabel: {
      type: 'array',
      items: organizationId,
      minItems: 1,
      uniqueItems: true
    }
  }
}

const recordingId = requireId(recording);

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
    '@id': metaId,
    artist: {
      type: 'array',
      items: artistId,
      minItems: 1,
      uniqueItems: true
    },
    productionType: {
      enum: [
        'CompilationAlbum',
        'DemoAlbum',
        'DJMixAlbum',
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
      items: organizationId,
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
      items: recordingId,
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

exports.calcMetaId = calcMetaId;
exports.getMetaId = getMetaId;
exports.getMetaIds = getMetaIds;
exports.metaId = metaId;
exports.schemaPrefix = schemaPrefix;
exports.setMetaId = setMetaId;
exports.validateMeta = validateMeta;
