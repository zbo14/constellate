const {
  Draft,
  DateTime,
  Territory,
  getRefSchema
} = require('../lib/schema.js');

// @flow

/**
* @module constellate/src/coala
*/

const Copyright = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    type: 'object',
    title: 'Copyright',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['Copyright'],
        readonly: true
      },
      rightsOf: ref,
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
}

// CreativeWork is used for licenses and transfer contracts
// Should there be subclass definitions for these?..

const CreativeWork = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    title: 'CreativeWork',
    type: 'object',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
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
}

const ReviewAction = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    type: 'object',
    title: 'ReviewAction',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['ReviewAction'],
        readonly: true
      },
      asserter: ref,
      assertionSubject: ref,
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
}

const Right = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    type: 'object',
    title: 'Right',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['Right'],
        readonly: true
      },
      exclusive: {
        type: 'boolean'
      },
      license: ref,
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
      source: ref,
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
}

const RightsTransferAction = (format: string): Object => {
  const ref = getRefSchema(format);
  return {
    $schema: Draft,
    type: 'object',
    title: 'RightsTransferAction',
    properties: {
      '@context': Object.assign({}, ref, { readonly: true }),
      '@type': {
        enum: ['RightsTransferAction'],
        readonly: true
      },
      transferContract: ref
    },
    required: [
      '@context',
      '@type',
      'transferContract'
    ]
  }
}

exports.Copyright = Copyright;
exports.CreativeWork = CreativeWork;
exports.ReviewAction = ReviewAction;
exports.Right = Right;
exports.RightsTransferAction = RightsTransferAction;
