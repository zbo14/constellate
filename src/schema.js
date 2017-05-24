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

const IPFSHash = {
  type: 'string',
  pattern: '^[1-9A-HJ-NP-Za-km-z]{46}$'
}

const Url = {
  type: 'string',
  // from http://stackoverflow.com/a/3809435
  pattern: '^https?:\/\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{2,256}\\.[a-z]{2,6}\\b([-a-zA-Z0-9@:%_\\+.~#?&\/\/=]*)$'
}

function contextIRI(prefix: string, key: string): Object {
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

function contextPrefix(prefix: string, key: string): Object {
  return {
    type: 'string',
    default: prefix + ':' + key
  }
}

function getLinks(obj: Object, schema: Object): Object[] {
  const ipfsHash = JSON.stringify(IPFSHash);
  if (!isObject(schema.properties))  {
    throw new Error('expected non-empty object for schema properties');
  }
  return arrayFromObject(schema.properties).reduce((result, [name, prop]) => {
    if (JSON.stringify(prop) !== ipfsHash
     && JSON.stringify(prop.items) !== ipfsHash) return result;
    const val = obj[name];
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
    throw new Error(`expected string/array for key=${key}; got ` + typeof val);
  }, []);
}

function validateSchema(obj: Object, schema: Object): boolean {
  return ajv.compile(schema)(obj);
}

exports.Address = Address;
exports.Draft = Draft;
exports.Email = Email;
exports.IPFSHash = IPFSHash;
exports.Url = Url;

exports.contextIRI = contextIRI;
exports.contextPrefix = contextPrefix;
exports.getLinks = getLinks;
exports.validateSchema = validateSchema;
