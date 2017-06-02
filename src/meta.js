'use strict';

const {
  Draft,
  Link
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/meta
*/

const AudioObject = {
  $schema: Draft,
  title: 'AudioObject',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['AudioObject'],
      readonly: true
    },
    contentUrl: Link,
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

const ImageObject = {
  $schema: Draft,
  title: 'ImageObject',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['ImageObject'],
      readonly: true
    },
    contentUrl: Link,
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

const MusicAlbum = {
  $schema: Draft,
  title: 'MusicAlbum',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
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
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    image: Link,
    name: {
      type: 'string'
    },
    producer: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    track: {
      type: 'array',
      items: Link,
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

const MusicComposition = {
  $schema: Draft,
  title: 'MusicComposition',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['MusicComposition'],
      readonly: true
    },
    composer: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    iswcCode: {
      type: 'string',
      pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    },
    lyricist: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    name: {
      type: 'string'
    },
    publisher: {
      type: 'array',
      items: Link,
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

const MusicPlaylist = {
  $schema: Draft,
  title: 'MusicPlaylist',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['MusicPlaylist'],
      readonly: true
    },
    image: Link,
    track: {
      type: 'array',
      items: Link,
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

const MusicRecording = {
  $schema: Draft,
  title: 'MusicRecording',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['MusicRecording'],
      readonly: true
    },
    audio: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    byArtist: {
      type: 'array',
      items:  Link,
      minItems: 1,
      uniqueItems: true
    },
    image: Link,
    isrcCode: {
      type: 'string',
      pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
    },
    name: {
      type: 'string'
    },
    producer: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    recordingOf: Link
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

const MusicRelease = {
  $schema: Draft,
  title: 'MusicRelease',
  type: 'object',
  properties: {
    '@context': {
      enum: ['http://schema.org/'],
      readonly: true
    },
    '@type': {
      enum: ['MusicRelease'],
      readonly: true
    },
    catalogNumber: {
      type: 'string'
    },
    image: Link,
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
      items: Link,
      minItems: 1,
      uniqueItems: true
    },
    releaseOf: Link,
    track: {
      type: 'array',
      items: Link,
      minItems: 1,
      uniqueItems: true
    }
  },
  not: {
    dependencies: {
      releaseOf: ['track'],
      track: ['releaseOf']
    }
  },
  required: [
    '@context',
    '@type'
  ]
}

exports.AudioObject = AudioObject;
exports.ImageObject = ImageObject;
exports.MusicAlbum = MusicAlbum;
exports.MusicComposition = MusicComposition;
exports.MusicPlaylist = MusicPlaylist;
exports.MusicRecording = MusicRecording;
exports.MusicRelease = MusicRelease;
