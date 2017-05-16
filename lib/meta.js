'use strict';

const util = require('../lib/util.js');

const {
    calcId,
    digestSHA256,
    encodeBase64,
    getId,
    getIds,
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

function calcMetaId(meta, publicKey) {
    if (publicKey && publicKey.length === 32) { // check @type
        return encodeBase64(publicKey);
    }
    return calcId('@id', meta);
}

function getMetaId(meta) {
    return getId('@id', meta);
}

function getMetaIds(...metas) {
    return getIds('@id', ...metas);
}

function hideKeys(meta, ...keys) {
    return keys.reduce((result, key) => {
        if (!result.properties.hasOwnProperty(key) || !result.properties[key]) {
            return result;
        }
        return Object.assign({}, result, {
            properties: Object.assign({}, result.properties, {
                [key]: Object.assign({}, result.properties[key], {
                    readonly: true
                })
            })
        });
    }, meta);
}

function hideId(meta) {
    return hideKeys(meta, '@id');
}

function requireKeys(meta, ...keys) {
    return Object.assign({}, meta, {
        required: keys
    });
}

function requireId(meta) {
    return requireKeys(meta, '@id');
}

function schemaPrefix(key) {
    return {
        type: 'string',
        default: 'schema:' + key
    }
}

function schemaIRI(key) {
    return {
        type: 'object',
        properties: {
            '@id': schemaPrefix(key),
            '@type': {
                type: 'string',
                default: '@id'
            }
        },
        required: ['@id', '@type']
    }
}

function setMetaId(meta, publicKey) {
    return Object.assign({}, meta, {
        '@id': calcMetaId(meta, publicKey)
    });
}

function validateMeta(meta, schema, publicKey) {
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
    } catch (err) {
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

const compositionContext = {
    type: 'object',
    properties: {
        schema: schema,
        composer: schemaIRI('composer'),
        Composition: schemaPrefix('MusicComposition'),
        iswc: schemaPrefix('iswcCode'),
        lyricist: schemaIRI('lyricist'),
        publisher: schemaIRI('publisher'),
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
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        iswc: {
            type: 'string',
            pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
        },
        lyricist: {
            type: 'array',
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        publisher: {
            type: 'array',
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        title: {
            type: 'string'
        }
    }
}

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

const recordingContext = {
    type: 'object',
    properties: {
        schema: schema,
        audio: schemaIRI('audio'),
        isrc: schemaPrefix('isrcCode'),
        performer: schemaIRI('performer'),
        producer: schemaIRI('producer'),
        Recording: schemaPrefix('MusicRecording'),
        recordingOf: schemaIRI('recordingOf'),
        recordLabel: schemaIRI('recordLabel')
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
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        isrc: {
            type: 'string',
            pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
        },
        performer: {
            type: 'array',
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        producer: {
            type: 'array',
            items: metaId,
            minItems: 1,
            uniqueItems: true
        },
        recordingOf: metaId,
        recordLabel: {
            type: 'array',
            items: metaId,
            minItems: 1,
            uniqueItems: true
        }
    }
}

const albumContext = {
    type: 'object',
    properties: {
        schema: schema,
        Album: schemaPrefix('MusicAlbum'),
        artist: schemaIRI('byArtist'),
        productionType: schemaPrefix('albumProductionType'),
        recordLabel: schemaIRI('recordLabel'),
        releaseType: schemaPrefix('albumReleaseType'),
        track: schemaIRI('track')
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
            items: metaId,
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
            items: metaId,
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
            items: metaId,
            minItems: 1,
            uniqueItems: true
        }
    }
}

const Album = requireKeys(
    hideId(album),
    '@context', '@type', '@id',
    'artist', 'track'
);

const Artist = requireKeys(
    hideId(artist),
    '@context', '@type', '@id',
    'email', 'name'
);

const Audio = requireKeys(
    hideId(audio),
    '@context', '@type', '@id',
    'contentUrl'
);

const Composition = requireKeys(
    hideId(composition),
    '@context', '@type', '@id',
    'composer', 'title'
);

const Organization = requireKeys(
    hideId(organization),
    '@context', '@type', '@id',
    'email', 'name'
);

const Recording = requireKeys(
    hideId(recording),
    '@context', '@type', '@id',
    'audio', 'performer', 'recordingOf'
);

const AlbumContext = {
    schema: 'http://schema.org/',
    Album: 'schema:MusicAlbum',
    artist: {
        '@id': 'schema:byArtist',
        '@type': '@id'
    },
    productionType: 'schema:albumProductionType',
    recordLabel: {
        '@id': 'schema:recordLabel',
        '@type': '@id'
    },
    releaseType: 'schema:albumReleaseType',
    track: {
        '@id': 'schema:track',
        '@type': '@id'
    }
}

const ArtistContext = {
    schema: 'http://schema.org/',
    Artist: 'schema:MusicGroup',
    email: 'schema:email',
    homepage: 'schema:url',
    name: 'schema:name',
    profile: 'schema:sameAs'
}

const AudioContext = {
    schema: 'http://schema.org/',
    Audio: 'schema:AudioObject',
    contentUrl: 'schema:contentUrl',
    encodingFormat: 'schema:encodingFormat'
}

const CompositionContext = {
    schema: 'http://schema.org/',
    composer: {
        '@id': 'schema:composer',
        '@type': '@id'
    },
    Composition: 'schema:MusicComposition',
    iswc: 'schema:iswcCode',
    lyricist: {
        '@id': 'schema:lyricist',
        '@type': '@id'
    },
    publisher: {
        '@id': 'schema:publisher',
        '@type': '@id'
    },
    title: 'schema:name'
}

const OrganizationContext = {
    schema: 'http://schema.org/',
    email: 'schema:email',
    homepage: 'schema:url',
    name: 'schema:name',
    Organization: 'schema:Organization',
    profile: 'schema:sameAs'
}

const RecordingContext = {
    schema: 'http://schema.org/',
    audio: {
        '@id': 'schema:audio',
        '@type': '@id'
    },
    isrc: 'schema:isrcCode',
    performer: {
        '@id': 'schema:performer',
        '@type': '@id'
    },
    producer: {
        '@id': 'schema:producer',
        '@type': '@id'
    },
    Recording: 'schema:MusicRecording',
    recordingOf: {
        '@id': 'schema:recordingOf',
        '@type': '@id'
    },
    recordLabel: {
        '@id': 'schema:recordLabel',
        '@type': '@id'
    }
}

exports.Album = Album;
exports.Artist = Artist;
exports.Audio = Audio;
exports.Composition = Composition;
exports.Organization = Organization;
exports.Recording = Recording;

exports.AlbumContext = AlbumContext;
exports.ArtistContext = ArtistContext;
exports.AudioContext = AudioContext;
exports.CompositionContext = CompositionContext;
exports.OrganizationContext = OrganizationContext;
exports.RecordingContext = RecordingContext;

exports.calcMetaId = calcMetaId;
exports.getMetaId = getMetaId;
exports.getMetaIds = getMetaIds;
exports.metaId = metaId;
exports.setMetaId = setMetaId;
exports.validateMeta = validateMeta;