const {
    Draft,
    DateTime,
    Link
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
        validFrom: DateTime,
        validThrough: DateTime
    }
    //..
}

// CreativeWork is used for licenses and transfer contracts
// Should there be subclass definitions for these instead?

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
    }
    //..
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
    }
    //..
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
    }
    //..
}

const RightsTransferAction = {
    $schema: Draft,
    type: 'object',
    title: 'RightsTransferAction',
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
            enum: ['RightsTransferAction'],
            readonly: true
        },
        transferContract: Link
    }
    //..
}

exports.Copyright = Copyright;
exports.CreativeWork = CreativeWork;
exports.ReviewAction = ReviewAction;
exports.Right = Right;
exports.RightsTransferAction = RightsTransferAction;