'use strict';

const Ajv = require('ajv');

// @flow

/**
* @module constellate/src/schema
*/

const ajv = new Ajv();

const schema = {
  type: 'string',
  default: 'http://schema.org/',
  readonly: true
}

function schemaPrefix(key: string) {
  return {
    type: 'string',
    default: 'schema:' + key
  }
}

const draft = 'http://json-schema.org/draft-06/schema#';

function validate(obj: Object, schema: Object): boolean {
  return ajv.compile(schema)(obj);
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

const id = {
  type: 'string',
  pattern: '^[A-Za-z0-9-_]{43}$'
}


const publicKey = {
  type: 'object',
  properties: {
    crv: {
      enum: ['Ed25519'],
      readonly: true
    },
    kty: {
      enum: ['OKP'],
      readonly: true
    },
    x: {
      type: 'string',
      pattern: '^[A-Za-z0-9-_]{43}$'
    }
  },
  required: ['crv', 'kty', 'x']
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
    email: schemaPrefix('email'),
    homepage: schemaPrefix('url'),
    name: schemaPrefix('name'),
    profile: schemaPrefix('sameAs')
    // publicKey
  },
  readonly: true,
  required: [
    'schema',
    'email',
    'homepage',
    'MusicGroup',
    'name',
    'Person',
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
      enum: ['MusicGroup', 'Person']
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
    },
    publicKey: publicKey
  }
}

const artistHeader = requireHeader(artist);

const organizationContext = artistContext;

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
    },
    publicKey: publicKey
  }
}

const organizationHeader = requireHeader(organization);

const compositionContext = {
  type: 'object',
  properties: {
    schema: schema,
    composer: schemaPrefix('composer'),
    iswc: schemaPrefix('iswcCode'),
    lyricist: schemaPrefix('lyricist'),
    MusicComposition: schemaPrefix('MusicComposition'),
    publisher: schemaPrefix('publisher'),
    title: schemaPrefix('name')
  },
  readonly: true,
  required: [
    'schema',
    'composer',
    'iswc',
    'lyricist',
    'MusicComposition',
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
      enum: ['MusicComposition'],
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
    AudioObject: schemaPrefix('AudioObject'),
    contentUrl: schemaPrefix('contentUrl'),
    encodingFormat: schemaPrefix('encodingFormat')
  },
  readonly: true,
  required: [
    'AudioObject',
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
      enum: ['AudioObject'],
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
    MusicRecording: schemaPrefix('MusicRecording'),
    performer: schemaPrefix('performer'),
    producer: schemaPrefix('producer'),
    recordingOf: schemaPrefix('recordingOf'),
    recordLabel: schemaPrefix('recordLabel')
  },
  readonly: true,
  required: [
    'schema',
    'audio',
    'isrc',
    'MusicRecording',
    'performer',
    'producer',
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
      enum: ['MusicRecording'],
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
    artist: schemaPrefix('byArtist'),
    MusicAlbum: schemaPrefix('MusicAlbum'),
    productionType: schemaPrefix('albumProductionType'),
    recordLabel: schemaPrefix('recordLabel'),
    releaseType: schemaPrefix('albumReleaseType'),
    track: schemaPrefix('track')
  },
  readonly: true,
  required: [
    'schema',
    'artist',
    'MusicAlbum',
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
      enum: ['MusicAlbum'],
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

const Artist = requireFields(
  hideId(artist),
  '@context', '@type', '@id',
  'email', 'name'
);

const Organization = requireFields(
  hideId(organization),
  '@context', '@type', '@id',
  'email', 'name'
);

const Composition = requireFields(
  hideId(composition),
  '@context', '@type', '@id',
  'composer', 'title'
);

const Audio = requireFields(
  hideId(audio),
  '@context', '@type', '@id',
  'contentUrl'
);

const Recording = requireFields(
  hideId(recording),
  '@context', '@type', '@id',
  'audio', 'performer', 'recordingOf'
);

const Album = requireFields(
  hideId(album),
  '@context', '@type', '@id',
  'artist', 'track'
);

exports.Artist = Artist
exports.Organization = Organization;
exports.Composition = Composition;
exports.Audio = Audio;
exports.Recording = Recording;
exports.Album = Album;

exports.schemaPrefix = schemaPrefix;
exports.validate = validate;
