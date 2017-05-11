'use strict';

const Ajv = require('ajv');

// @flow

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const schemaOrg = {
    type: 'string',
    default: 'http://schema.org/',
    readonly: true
}

const draft = 'http://json-schema.org/draft-06/schema#';

function validate(obj, schema) {
    return ajv.compile(schema)(obj);
}

function hideFields(obj, ...keys) {
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
    }, obj);
}

function hideId(obj) {
    return hideFields(obj, '@id');
}

function requireFields(obj, ...keys) {
    return Object.assign({}, obj, {
        required: keys
    });
}

function requireHeader(obj) {
    return requireFields(obj, '@type', '@id');
}

const id = {
    type: 'string',
    pattern: '^[A-Za-z0-9-_]{43}$'
}

const required = ['@context', '@type', '@id'];

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
        '@context': {
            type: 'object',
            properties: {
                schema: schemaOrg,
                homepage: {
                    type: 'string',
                    default: 'schema:url'
                },
                profile: {
                    type: 'string',
                    default: 'schema:sameAs'
                }
            },
            readonly: true,
            required: ['schema', 'homepage', 'profile']
        },
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
        }
    }
}

const artistHeader = requireHeader(artist);

const organization = {
    $schema: draft,
    title: 'Organization',
    type: 'object',
    properties: {
        '@context': {
            type: 'object',
            properties: {
                schema: schemaOrg,
                homepage: {
                    type: 'string',
                    default: 'schema:url'
                },
                profile: {
                    type: 'string',
                    default: 'schema:sameAs'
                }
            },
            readonly: true,
            required: ['schema', 'homepage', 'profile']
        },
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

const composition = {
    $schema: draft,
    title: 'Composition',
    type: 'object',
    properties: {
        '@context': {
            type: 'object',
            properties: {
                schema: schemaOrg,
                title: {
                    type: 'string',
                    default: 'schema:name',
                }
            },
            readonly: true,
            required: ['schema', 'title']
        },
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
        '@context': {
            type: 'object',
            properties: {
                schema: schemaOrg,
                performer: {
                    type: 'string',
                    default: 'schema:performer'
                }
            },
            readonly: true,
            required: ['schema', 'performer']
        },
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
            items: artistHeader,
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
        '@context': {
            type: 'object',
            properties: {
                schema: schemaOrg,
                artist: {
                    type: 'string',
                    default: 'schema:byArtist'
                },
                recordLabel: {
                    type: 'string',
                    default: 'schema:recordLabel'
                }
            },
            readonly: true,
            required: ['schema', 'artist', 'recordLabel']
        },
        '@id': id,
        artist: {
            type: 'array',
            items: artistHeader,
            minItems: 1,
            uniqueItems: true
        },
        recordLabel: {
            type: 'array',
            items: organizationHeader,
            minItems: 1,
            uniqueItems: true
        },
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
    'email', 'name'
);

const Composition = requireFields(
    hideId(composition),
    '@context', '@type', '@id',
    'composer', 'title', 'url'
);

const Recording = requireFields(
    hideId(recording),
    '@context', '@type', '@id',
    'performer', 'recordingOf', 'url'
);

const Album = requireFields(
    hideId(album),
    '@context', '@type', '@id',
    'artist', 'track'
);

exports.Artist = Artist
exports.Organization = Organization;
exports.Composition = Composition;
exports.Recording = Recording;
exports.Album = Album;

exports.validate = validate;