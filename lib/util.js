'use strict';

const bs58 = require('bs58');
const Buffer = require('buffer/').Buffer;
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64  = require('urlsafe-base64');

//      

/**
* @module constellate/src/util
*/

function clone(obj        )         {
  return JSON.parse(JSON.stringify(obj));
}

function digestBase64(obj        )         {
  let ab = sha3_256.buffer(orderStringify(obj));
  return urlsafeBase64.encode(Buffer.from(ab)).toString('utf-8', 0, 3);
}

function encodeBase58(key        )         {
  return bs58.encode(key);
}

// from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj        , space         )         {
  const keys = [];
  JSON.stringify(obj, (k, v) => {
    keys.push(k);
    return v;
  });
  return JSON.stringify(obj, keys.sort(), space);
}

exports.encodeBase58 = encodeBase58;
exports.digestBase64 = digestBase64;
exports.clone = clone;
exports.orderStringify = orderStringify;

//--------------------------------------------------------------------------------

function isNull(x     )          {
  return x == null
};

function isArray(arr     )          {
  return !isNull(arr) && Array.isArray(arr) && arr.length > 0;
}

function isBoolean(bool     )          {
  return !isNull(bool) && typeof bool === 'boolean';
}

function isNumber(num     )          {
  return !isNull(num) && typeof num === 'number';
}

function isObject(obj     )          {
  return !isNull(obj) && typeof obj === 'object' && obj.constructor === Object && Object.keys(obj).length > 0;
}

function isString(str     )          {
  return !isNull(str) && typeof str === 'string' && str.length > 0;
}

function isEqual(val1     , val2     )          {
  return orderStringify(val1) === orderStringify(val2);
}

function negate(pred          )           {
  return function(...args) {
    return !pred(...args);
  }
}

function orderObject(obj        )         {
  return JSON.parse(orderStringify(obj));
}

function merge(...objs          )         {
  return Object.assign({}, ...objs);
}

function hasKey(obj        , key        )          {
  return obj.hasOwnProperty(key) && !isNull(obj[key]);
}

function hasKeys(obj        , ...keys          )          {
  if (!isArray(keys)) { return false; }
  return keys.every((key) => hasKey(obj, key));
}

function objectFromArray(arr         )         {
  return arr.reduce((result, [key, val]) => merge(result, {[key]: val}), {});
}

function arrayFromObject(obj        )          {
  return Object.keys(obj).map((key) => [key, obj[key]]);
}

function recurse(x     , fn          )      {
  if (isArray(x)) {
    return x.map((y) => recurse(fn(y), fn));
  }
  if (isObject(x)) {
    return merge(...Object.keys(x).map((k) => objectFromArray([[k, recurse(fn(x[k], k), fn)]])));
  }
  return x;
}

function withoutKeys(obj        , ...keys          )         {
  return Object.keys(obj).reduce((result, key) => {
    if (keys.includes(key)) { return result; }
    return merge(result, objectFromArray([[key, obj[key]]]));
  }, {});
}

exports.isNull = isNull;
exports.isArray = isArray;
exports.isObject = isObject;
exports.isString = isString;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;

exports.arrayFromObject = arrayFromObject;
exports.hasKeys = hasKeys;
exports.merge = merge;
exports.orderObject = orderObject;
exports.recurse = recurse;
exports.withoutKeys = withoutKeys;
