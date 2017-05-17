const Ajv = require('ajv');

// @flow

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const Draft = 'http://json-schema.org/draft-06/schema#';

const Email = {
    type: 'string',
    format: 'email',
    pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
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
            '@id': contextPrefix(key, prefix),
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

exports.Draft = Draft;
exports.Email = Email;
exports.Url = Url;

exports.contextIRI = contextIRI;
exports.contextPrefix = contextPrefix;
exports.validateSchema = validateSchema;