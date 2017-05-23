'use strict';

const Ajv = require('ajv');

// @flow

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const Draft = 'http://json-schema.org/draft-06/schema#';

const Address = {
    type: 'string',
    pattern: '^0x[a-fA-F0-9]{40}$'
}

const Email = {
    type: 'string',
    format: 'email',
    pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
}

const Id = {
    type: 'string',
    pattern: '^[1-9A-HJ-NP-Za-km-z]{46}$'
}

const Url = {
    type: 'string',
    // from http://stackoverflow.com/a/3809435
    pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

function contextIRI(prefix, key) {
    return {
        type: 'object',
        properties: {
            '@id': contextPrefix(prefix, key),
            '@type': {
                type: 'string',
                default: '@id'
            }
        },
        required: ['@id', '@type']
    }
}

function contextPrefix(prefix, key) {
    return {
        type: 'string',
        default: prefix + ':' + key
    }
}

function validateSchema(obj, schema) {
    return ajv.compile(schema)(obj);
}

exports.Address = Address;
exports.Draft = Draft;
exports.Email = Email;
exports.Id = Id;
exports.Url = Url;

exports.contextIRI = contextIRI;
exports.contextPrefix = contextPrefix;
exports.validateSchema = validateSchema;