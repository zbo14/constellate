'use strict';

const {
    Draft,
    Link,
    validateSchema
} = require('../lib/schema.js');

// @flow

/**
 * @module constellate/src/meta
 */

const Album = {
    $schema: Draft,
    title: 'Album',
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
        recordLabel: {
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
        'track'
    ]
}

const Audio = {
    $schema: Draft,
    title: 'Audio',
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
            enum: ['mp3', 'mpeg4']
        }
        //..
    },
    required: [
        '@context',
        '@type',
        'contentUrl'
    ]
}

const Composition = {
    $schema: Draft,
    title: 'Composition',
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

const Image = {
    $schema: Draft,
    title: 'Image',
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
            enum: ['jpeg', 'png']
        }
        //..
    },
    required: [
        '@context',
        '@type',
        'contentUrl'
    ]
}

const Recording = {
    $schema: Draft,
    title: 'Recording',
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
        image: Link,
        isrcCode: {
            type: 'string',
            pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
        },
        name: {
            type: 'string'
        },
        performer: {
            type: 'array',
            items: Link,
            minItems: 1,
            uniqueItems: true
        },
        producer: {
            type: 'array',
            items: Link,
            minItems: 1,
            uniqueItems: true
        },
        recordingOf: Link,
        recordLabel: {
            type: 'array',
            items: Link,
            minItems: 1,
            uniqueItems: true
        }
    },
    required: [
        '@context',
        '@type',
        'audio',
        'performer',
        'recordingOf'
    ]
}

function getMetaSchema(type) {
    switch (type) {
        case 'MusicAlbum':
            return Album;
        case 'AudioObject':
            return Audio;
        case 'MusicComposition':
            return Composition;
        case 'ImageObject':
            return Image;
        case 'MusicRecording':
            return Recording;
        default:
            throw new Error('unexpected meta @type: ' + type);
    }
}

function validateMeta(meta) {
    const schema = getMetaSchema(meta['@type']);
    if (!validateSchema(meta, schema)) {
        throw new Error('meta has invalid schema: ' + JSON.stringify(meta, null, 2));
    }
    return true;
}

exports.getMetaSchema = getMetaSchema;
exports.validateMeta = validateMeta;