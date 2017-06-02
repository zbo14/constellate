const {
    Draft,
    DateTime,
    Link,
    Territory
} = require('../lib/schema.js');

const Copyright = {
    $schema: Draft,
    type: 'object',
    title: 'Copyright',
    properties: {
        '@context': {
            type: 'array',
            items: [{
                    enum: ['http://schema.org/']
                },
                {
                    enum: ['http://coalaip.org/']
                }
            ],
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

// CreativeWork is used for licenses and transfer contracts
// Should there be subclass definitions for these?..

const CreativeWork = {
    $schema: Draft,
    title: 'CreativeWork',
    type: 'object',
    properties: {
        '@context': {
            enum: ['http://schema.org/'],
            readonly: true
        },
        '@type': {
            enum: ['CreativeWork'],
            readonly: true
        },
        text: {
            type: 'string'
        }
    },
    required: [
        '@context',
        '@type',
        'text'
    ]
}

const ReviewAction = {
    $schema: Draft,
    type: 'object',
    title: 'ReviewAction',
    properties: {
        '@context': {
            type: 'array',
            items: [{
                    enum: ['http://schema.org/']
                },
                {
                    enum: ['http://coalaip.org/']
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
            type: 'boolean'
        },
        error: {
            type: 'string'
        },
        validFrom: DateTime,
        validThrough: DateTime
    },
    switch: [{
            if: {
                properties: {
                    assertionTruth: false
                }
            },
            then: {
                required: ['error']
            }
        },
        {
            then: {
                not: {
                    required: ['error']
                }
            }
        }
    ],
    required: [
        '@context',
        '@type',
        'asserter',
        'assertionSubject'
    ]
}

const Right = {
    $schema: Draft,
    type: 'object',
    title: 'Right',
    properties: {
        '@context': {
            type: 'array',
            items: [{
                    enum: ['http://schema.org/']
                },
                {
                    enum: ['http://coalaip.org/']
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
    type: 'object',
    title: 'RightsTransferAction',
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
exports.CreativeWork = CreativeWork;
exports.ReviewAction = ReviewAction;
exports.Right = Right;
exports.RightsTransferAction = RightsTransferAction;