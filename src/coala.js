const {
  Draft,
  DateTime,
  Link
} = require('../lib/schema.js');

const Assertion = {
  $schema: Draft,
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      items: [
        {
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

const Copyright = {
  $schema: Draft,
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      items: [
        {
          enum: ['http://schema.org/']
        },
        {
          enum: ['http://coalaip.org/']
        }
      ],
      readonly: true
    },
    '@type': {
      enum: [ 'Copyright' ],
      readonly: true
    },
    rightsOf: Link,
    validFrom: DateTime,
    validThrough: DateTime
  }
  //..
}

const Right = {
  $schema: Draft,
  type: 'object',
  properties: {
    '@context': {
      type: 'array',
      items: [
        {
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
    numberOfUses: {
      type: 'number',
      minimum: 0,
      exclusiveMinimum: true
    },
    percentageShares: {
      type: 'number',
      minimum: 0,
      exclusiveMinimum: true,
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

exports.Assertion = Assertion;
exports.Copyright = Copyright;
exports.Right = Right;
