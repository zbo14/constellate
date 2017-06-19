'use strict';

const Ajv = require('ajv');

const {
    getDescendantTypes
} = require('../lib/ontology.js');

//      

/**
 * @module constellate/src/schema-util
 */

const ajv = new Ajv();

const Boolean = {
    type: 'boolean'
}

const Integer = {
    type: 'integer'
}

const Number = {
    type: 'number'
}

const String = {
    type: 'string'
}

const Address = newString({
    pattern: '^0x[A-Fa-f0-9]{40}$'
});

// from https://stackoverflow.com/questions/12756159/regex-and-iso8601-formatted-datetime#comment39882425_12756279
const Date = newString({
    pattern: '^(\\d{4})-(0[1-9]|1[0-2])-(\\3([12]\\d|0[1-9]|3[01])|[1-9]‌​)$'
});

const DateTime = newString({
    format: 'date-time'
});
const Email = newString({
    format: 'email'
});
const Hex32 = newString({
    pattern: '0x[A-Fa-f0-9]{64}'
});
const Uri = newString({
    format: 'uri'
});
const WholeNumber = newInteger({
    minimum: 0
});

const Link = newObject({
    '/': newString({
        pattern: '^(Qm[A-HJ-NP-Za-km-z1-9]{44}|zdpu[A-HJ-NP-Za-km-z1-9]{45})$',
        default: ''
    })
}, {
    additionalProperties: false
});

const Territory = newObject({
    '@type': newType('Place'),
    geo: newObject({
        '@type': newType('GeoCoordinates'),
        addressCountry: newString({
            pattern: '^[A-Z]{2}$'
        })
    }, {
        additionalProperties: false
    })
}, {
    additionalProperties: false
});


function newArray(items, options) {
    const array = {
        type: 'array',
        items
    }
    if (options) {
        Object.assign(array, options);
    }
    return array;
}

function newBoolean(options) {
    return Object.assign({}, Boolean, options);
}

function newContext(...context) {
    if (context.length === 1) {
        return newEnum(context, {
            readonly: true
        });
    }
    const items = context.map(ctx => {
        return {
            enum: [ctx]
        };
    });
    return newArray(items, {
        readonly: true
    });
}

function newEnum(vals, options) {
    const _enum = {
        enum: vals
    }
    if (options) {
        Object.assign(_enum, options);
    }
    return _enum;
}

function newInteger(options) {
    return Object.assign({}, Integer, options);
}

function newNumber(options) {
    return Object.assign({}, Number, options);
}

function mergeObject(schema, properties, options) {
    const merged = {};
    merged.properties = Object.assign({}, schema.properties, properties);
    if (options) {
        if (options.required && options.required.length) {
            const required = [].concat(options.required);
            if (schema.required && schema.required.length) {
                required.push(...schema.required);
            }
            merged.required = new Set(required.sort());
        }
        //..
    }
    return merged;
}

function newObject(properties, options) {
    const obj = {
        type: 'object',
        properties
    }
    if (options) {
        Object.assign(obj, options);
    }
    return obj;
}

function newString(options) {
    return Object.assign({}, String, options);
}

function newType(type) {
    return newEnum(([type]), {
        readonly: true
    });
}

exports.Address = Address;
exports.Boolean = Boolean;
exports.Date = Date;
exports.DateTime = DateTime;
exports.Email = Email;
exports.Hex32 = Hex32;
exports.Integer = Integer;
exports.Link = Link;
exports.Number = Number;
exports.String = String;
exports.Territory = Territory;
exports.Uri = Uri;
exports.WholeNumber = WholeNumber;

exports.ajv = ajv;
exports.mergeObject = mergeObject;
exports.newArray = newArray;
exports.newBoolean = newBoolean;
exports.newContext = newContext;
exports.newEnum = newEnum;
exports.newInteger = newInteger;
exports.newNumber = newNumber;
exports.newObject = newObject;
exports.newString = newString;
exports.newType = newType;