'use strict';

const Ajv = require('ajv');

// @flow

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const Draft = 'http://json-schema.org/draft-06/schema#';

const DateTime = {
    type: 'string',
    format: 'date-time'
}

const Email = {
    type: 'string',
    format: 'email'
}

const Link = {
    type: 'object',
    properties: {
        '/': {
            type: 'string',
            pattern: '^[1-9A-HJ-NP-Za-km-z]{46,49}$'
        }
    }
}

const Uri = {
    type: 'string',
    format: 'uri'
}

const Url = {
    type: 'string',
    // from http://stackoverflow.com/a/3809435
    pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

function validateSchema(obj, schema) {
    return ajv.compile(schema)(obj);
}

exports.Draft = Draft;
exports.DateTime = DateTime;
exports.Email = Email;
exports.Link = Link;
exports.Uri = Uri;
exports.Url = Url;

exports.validateSchema = validateSchema;