'use strict';

const {
  Draft,
  getRefSchema
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/meta
*/

const AudioObject = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'AudioObject',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['AudioObject'],
        readonly: true
      },
      contentUrl: ref,
      encodingFormat: {
        enum: [
          '',
          'mp3',
          'mpeg4'
        ]
      }
      //..
    },
    required: [
      '@context',
      '@type',
      'contentUrl'
    ]
  }
}

const ImageObject = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'ImageObject',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['ImageObject'],
        readonly: true
      },
      contentUrl: ref,
      encodingFormat: {
        enum: [
          '',
          'jpeg',
          'png'
        ]
      }
      //..
    },
    required: [
      '@context',
      '@type',
      'contentUrl'
    ]
  }
}
const MusicAlbum = (format : string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicAlbum',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicAlbum'],
        readonly: true
      },
      albumProductionType: {
        enum: [
          '',
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
      albumReleaseType: {
        enum: [
          '',
          'AlbumRelease',
          'BroadcastRelease',
          'EPRelease',
          'SingleRelease'
        ]
      },
      byArtist: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      image: ref,
      name: {
        type: 'string'
      },
      producer: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      track: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      }
    },
    required: [
      '@context',
      '@type',
      'byArtist',
      'name',
      'producer',
      'track'
    ]
  }
}

const MusicComposition = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicComposition',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicComposition'],
        readonly: true
      },
      composer: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      iswcCode: {
        type: 'string',
        pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
      },
      lyricist: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      name: {
        type: 'string'
      },
      publisher: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      }
    },
    required: [
      '@context',
      '@type',
      'composer',
      'name'
    ]
  }
}

const MusicPlaylist = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicPlaylist',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicPlaylist'],
        readonly: true
      },
      image: ref,
      name: {
        type: 'string'
      },
      track: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      }
    },
    required: [
      '@context',
      '@type',
      'track'
    ]
  }
}


const MusicRecording = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicRecording',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicRecording'],
        readonly: true
      },
      audio: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      byArtist: {
        type: 'array',
        items:  ref,
        minItems: 1,
        uniqueItems: true
      },
      image: ref,
      isrcCode: {
        type: 'string',
        pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
      },
      name: {
        type: 'string'
      },
      producer: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      recordingOf: ref
    },
    required: [
      '@context',
      '@type',
      'audio',
      'byArtist',
      'producer',
      'recordingOf'
    ]
  }
}

const MusicRelease = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'MusicRelease',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['MusicRelease'],
        readonly: true
      },
      catalogNumber: {
        type: 'string'
      },
      image: ref,
      musicReleaseFormat: {
        enum: [
          '',
          'CDFormat',
          'CassetteFormat',
          'DVDFormat',
          'DigitalAudioTapeFormat',
          'DigitalFormat',
          'LaserDiscFormat',
          'VinylFormat'
        ]
      },
      recordLabel: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      },
      releaseOf: ref,
      track: {
        type: 'array',
        items: ref,
        minItems: 1,
        uniqueItems: true
      }
    },
    oneOf: [
      {
        required: ['releaseOf']
      },
      {
        required: ['track']
      }
    ],
    required: [
      '@context',
      '@type'
    ]
  }
}

exports.AudioObject = AudioObject;
exports.ImageObject = ImageObject;
exports.MusicAlbum = MusicAlbum;
exports.MusicComposition = MusicComposition;
exports.MusicPlaylist = MusicPlaylist;
exports.MusicRecording = MusicRecording;
exports.MusicRelease = MusicRelease;
