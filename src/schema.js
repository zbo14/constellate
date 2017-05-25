'use strict';

const Ajv = require('ajv');

const {
  arrayFromObject,
  isArray,
  isObject,
  isString
} = require('../lib/util.js');

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

const Link = {
  type: 'object',
  properties: {
    '/': {
      type: 'string',
      pattern: '^\/ipfs\/[1-9A-HJ-NP-Za-km-z]{46}$'
    }
  },
  required: ['/']
}

const Url = {
  type: 'string',
  // from http://stackoverflow.com/a/3809435
  pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

function getLinks(obj: Object, schema: Object): Object[] {
  const link = JSON.stringify(Link);
  return arrayFromObject(schema.properties).reduce((result, [key, prop]) => {
    if (JSON.stringify(prop) === link ||
        JSON.stringify(prop.items) === link) {
          const val = obj[key];
          if (isString(val)) {
            return result.concat({
              multihash: val,
              name: key
            });
          }
          if (isArray(val)) {
            return result.concat(
              val.map((v, i) => {
                return {
                  multihash: v,
                  name: key + '-' + (i + 1)
                }
              })
            );
          }
        }
    return result;
  }, []);
}

function validateSchema(obj: Object, schema: Object): boolean {
  return ajv.compile(schema)(obj);
}

exports.Address = Address;
exports.Draft = Draft;
exports.Email = Email;
exports.Link = Link;
exports.Url = Url;

exports.getLinks = getLinks;
exports.validateSchema = validateSchema;
