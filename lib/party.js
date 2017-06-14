'use strict';

const {
    Date,
    Draft,
    Email,
    Link,
    Uri
} = require('../lib/schema.js');

//      

/**
 * @module constellate/src/party
 */

const MusicGroup = {
    $schema: Draft,
    title: 'MusicGroup',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://schema.org/'],
            readonly: true
        },
        '@type': {
            enum: ['MusicGroup'],
            readonly: true
        },
        email: Email,
        member: {
            type: 'array',
            items: Link,
            minItems: 1,
            uniqueItems: true
        },
        name: {
            type: 'string'
        },
        sameAs: {
            type: 'array',
            items: Uri,
            minItems: 1,
            uniqueItems: true
        },
        url: Uri
    },
    required: [
        '@context',
        '@type',
        'name'
    ]
}

const Organization = {
    $schema: Draft,
    title: 'Organization',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://schema.org/'],
            readonly: true
        },
        '@type': {
            enum: ['Organization'],
            readonly: true
        },
        email: Email,
        member: {
            type: 'array',
            items: Link,
            minItems: 1,
            uniqueItems: true
        },
        name: {
            type: 'string'
        },
        sameAs: {
            type: 'array',
            items: Uri,
            minItems: 1,
            uniqueItems: true
        },
        url: Uri
    },
    required: [
        '@context',
        '@type',
        'name'
    ]
}

const Person = {
    $schema: Draft,
    title: 'Person',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://schema.org/'],
            readonly: true
        },
        '@type': {
            enum: ['Person'],
            readonly: true
        },
        birthDate: Date,
        email: Email,
        familyName: {
            type: 'string'
        },
        givenName: {
            type: 'string'
        },
        sameAs: {
            type: 'array',
            items: Uri,
            minItems: 1,
            uniqueItems: true
        },
        url: Uri
    },
    required: [
        '@context',
        '@type',
        'familyName',
        'givenName'
    ]
}

exports.MusicGroup = MusicGroup;
exports.Organization = Organization;
exports.Person = Person;