'use strict';

const Ajv = require('ajv');

//      

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const Date = {
    type: 'string',
    // from https://stackoverflow.com/questions/12756159/regex-and-iso8601-formatted-datetime#comment39882425_12756279
    pattern: '^(\\d{4})-(0[1-9]|1[0-2])-(\\3([12]\\d|0[1-9]|3[01])|[1-9]‌​)$'
}

const DateTime = {
    type: 'string',
    format: 'date-time'
}

const Draft = 'http://json-schema.org/draft-06/schema#';

const Email = {
    type: 'string',
    format: 'email'
}

const Id = {
    type: 'string',
    default: '',
    pattern: '^ipfs:\/(ipfs|ipld)\/[1-9A-HJ-NP-Za-km-z]{46,49}$'
}

const Link = {
    type: 'object',
    properties: {
        '/': {
            type: 'string',
            default: '',
            pattern: '^[1-9A-HJ-NP-Za-km-z]{46,49}$'
        }
    },
    additionalProperties: false
}

const Territory = {
    type: 'object',
    properties: {
        '@type': {
            enum: ['Place'],
            readonly: true
        },
        geo: {
            type: 'object',
            properties: {
                '@type': {
                    enum: ['GeoCoordinates'],
                    readonly: true
                },
                addressCountry: {
                    type: 'string',
                    pattern: '^[A-Z]{2}$'
                }
            }
        }
    }
}

const Uri = {
    type: 'string',
    format: 'Uri'
}

const Url = {
    type: 'string',
    // from http://stackoverflow.com/a/3809435
    pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

function getRefSchema(format) {
    if (format === 'ipld') return Link;
    if (format === 'json-ld') return Id;
    throw new Error('unexpected format: ' + format);
}

function validateSchema(schema, value) {
    const validate = ajv.compile(schema);
    validate(value);
    return validate.errors;
}

exports.Date = Date;
exports.DateTime = DateTime;
exports.Draft = Draft;
exports.Email = Email;
exports.Id = Id;
exports.Link = Link;
exports.Territory = Territory;
exports.Uri = Uri;
exports.Url = Url;

exports.getRefSchema = getRefSchema;
exports.validateSchema = validateSchema;