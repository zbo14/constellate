'use strict';

const secp256k1 = require('../lib/secp256k1.js');

const {
    Address,
    Draft,
    Email,
    Link,
    Url,
    contextPrefix,
    validateSchema
} = require('../lib/schema.js');

// @flow

/**
 * @module constellate/src/party
 */

const Artist = {
    $schema: Draft,
    title: 'Artist',
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
        address: Address,
        email: Email,
        name: {
            type: 'string'
        },
        sameAs: {
            type: 'array',
            items: Url,
            minItems: 1,
            uniqueItems: true
        },
        url: Url
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
        address: Address,
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
            items: Url,
            minItems: 1,
            uniqueItems: true
        },
        url: Url
    },
    required: [
        '@context',
        '@type',
        'name'
    ]
}

function getPartySchema(type) {
    if (type === 'MusicGroup') {
        return Artist;
    }
    if (type === 'Organization') {
        return Organization;
    }
    throw new Error('unexpected party @type: ' + type);
}

function validateParty(party, publicKey) {
    const schema = getPartySchema(party['@type']);
    if (!validateSchema(party, schema)) {
        throw new Error('party has invalid schema: ' + JSON.stringify(party, null, 2));
    }
    if (publicKey) {
        if (publicKey.length !== 33) {
            throw new Error(`expected public-key length=33; got ` + publicKey.length);
        }
        const addr = secp256k1.publicKeyToAddress(publicKey);
        if (party.address !== addr) {
            throw new Error(`expected addr=${party['address']}; got ` + addr)
        }
    }
    return true;
}

exports.getPartySchema = getPartySchema;
exports.validateParty = validateParty;