'use strict';

const Ajv = require('ajv');

//      

/**
 * @module constellate/src/schema
 */

const ajv = new Ajv();

const Address = {
    type: 'string',
    pattern: '^0x[A-Fa-f0-9]{40}$'
}

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

const Link = {
    type: 'object',
    properties: {
        '/': {
            type: 'string',
            pattern: '^(Qm[A-HJ-NP-Za-km-z1-9]{44}|zdpu[A-HJ-NP-Za-km-z1-9]{45})$',
            default: ''
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
            },
            additionalProperties: false
        }
    },
    additionalProperties: false
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

const WholeNumber = {
    type: 'integer',
    minimum: 0
}

function validateSchema(schema, value) {
    const validate = ajv.compile(schema);
    validate(value);
    return validate.errors;
}

exports.Address = Address;
exports.Date = Date;
exports.DateTime = DateTime;
exports.Draft = Draft;
exports.Email = Email;
exports.Link = Link;
exports.Territory = Territory;
exports.Uri = Uri;
exports.Url = Url;
exports.WholeNumber = WholeNumber;

exports.validateSchema = validateSchema;