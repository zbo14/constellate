const {
    Draft,
    DateTime,
    Link,
    Territory
} = require('../lib/schema.js');

// @flow

/**
 * @module constellate/src/coala
 */

const Copyright = {
    $schema: Draft,
    title: 'Copyright',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://coalaip.org/'],
            readonly: true
        },
        '@type': {
            enum: ['Copyright'],
            readonly: true
        },
        rightsOf: Link,
        territory: Territory,
        validFrom: DateTime,
        validThrough: DateTime
    },
    required: [
        '@context',
        '@type',
        'rightsOf'
    ]
}

const ReviewAction = {
    $schema: Draft,
    title: 'ReviewAction',
    type: 'object',
    properties: {
        '@context': {
            type: 'array',
            items: [{
                    enum: ['http://coalaip.org/']
                },
                {
                    enum: ['http://schema.org/']
                }
            ],
            readonly: true
        },
        '@type': {
            enum: ['ReviewAction'],
            readonly: true
        },
        asserter: Link,
        assertionSubject: Link,
        assertionTruth: {
            type: 'boolean',
            default: true
        },
        error: {
            type: 'string'
        },
        validFrom: DateTime,
        validThrough: DateTime
    },
    dependencies: {
        error: {
            properties: {
                assertionTruth: {
                    type: 'boolean',
                    enum: [false]
                }
            }
        }
    },
    not: {
        properties: {
            assertionTruth: {
                type: 'boolean',
                enum: [false]
            },
            error: {
                enum: [null]
            }
        }
    },
    required: [
        '@context',
        '@type',
        'asserter',
        'assertionSubject'
    ]
}

const Right = {
    $schema: Draft,
    title: 'Right',
    type: 'object',
    properties: {
        '@context': {
            type: 'array',
            items: [{
                    enum: ['http://coalaip.org/']
                },
                {
                    enum: ['http://schema.org/']
                }
            ],
            readonly: true
        },
        '@type': {
            enum: ['Right'],
            readonly: true
        },
        exclusive: {
            type: 'boolean'
        },
        license: Link,
        numberOfUses: {
            type: 'number',
            minimum: 1
        },
        percentageShares: {
            type: 'number',
            minimum: 1,
            maximum: 100
        },
        rightContext: {
            type: 'array',
            items: {
                type: 'string'
            },
            minItems: 1,
            uniqueItems: true
        },
        source: Link,
        territory: Territory,
        usageType: {
            type: 'array',
            items: {
                type: 'string'
            },
            minItems: 1,
            uniqueItems: true
        },
        validFrom: DateTime,
        validThrough: DateTime
    },
    required: [
        '@context',
        '@type',
        'license',
        'source'
    ]
}

const RightsTransferAction = {
    $schema: Draft,
    title: 'RightsTransferAction',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://coalaip.org/'],
            readonly: true
        },
        '@type': {
            enum: ['RightsTransferAction'],
            readonly: true
        },
        transferContract: Link
    },
    required: [
        '@context',
        '@type',
        'transferContract'
    ]
}

exports.Copyright = Copyright;
exports.ReviewAction = ReviewAction;
exports.Right = Right;
exports.RightsTransferAction = RightsTransferAction;