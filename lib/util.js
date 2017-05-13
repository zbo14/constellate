'use strict';

const bs58 = require('bs58');
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64  = require('urlsafe-base64');

// @flow

/**
* @module constellate/src/util
*/

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sha3Buffer(str) {
  return Buffer.from(sha3_256.buffer(str));
}

function digestBase64(str) {
  return urlsafeBase64.encode(sha3Buffer(str)).toString('utf-8', 0, 3);
}

function encodeBase58(key) {
  return bs58.encode(key);
}


// from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj, space) {
  const keys = [];
  JSON.stringify(obj, (k, v) => {
    keys.push(k);
    return v;
  });
  return JSON.stringify(obj, keys.sort(), space);
}

function stringToUint8(str) {
  const ab = new ArrayBuffer(str.length);
  const uint8 = new Uint8Array(ab);
  Array.from(uint8).forEach((_, i) => {
		uint8[i] = str.charCodeAt(i);
	});
  return uint8;
}

function stringFromUint8(uint8) {
  return Array.from(uint8).reduce((result, x) => {
    result += String.fromCharCode(x);
    return result;
  }, '');
}

exports.encodeBase58 = encodeBase58;
exports.digestBase64 = digestBase64;
exports.clone = clone;
exports.orderStringify = orderStringify;
exports.sha3Buffer = sha3Buffer;
exports.stringFromUint8 = stringFromUint8
exports.stringToUint8 = stringToUint8;

//--------------------------------------------------------------------------------

function isArray(arr) {
  return arr != null && Array.isArray(arr) && arr.length > 0;
}

function isBoolean(bool) {
  return bool != null && typeof bool === 'boolean';
}

function isNumber(num) {
  return num != null && typeof num === 'number';
}

function isObject(obj) {
  return obj != null && obj.constructor === Object && Object.keys(obj).length > 0;
}

function isString(str) {
  return str != null && typeof str === 'string' && str.length > 0;
}

function isEqual(val1, val2) {
  return orderStringify(val1) === orderStringify(val2);
}

function arrayFromObject(obj) {
  return Object.keys(obj).map((key) => [key, obj[key]]);
}

function hasKey(obj, key) {
  return obj.hasOwnProperty(key) && obj[key] != null;
}

function hasKeys(obj, ...keys) {
  if (!isArray(keys)) { return false; }
  return keys.every((key) => hasKey(obj, key));
}

function objectFromArray(arr) {
  return arr.reduce((result, [key, val]) => Object.assign({}, result, {[key]: val}), {});
}

function recurse(x, fn) {
  if (isArray(x)) {
    return x.map((y) => recurse(fn(y), fn));
  }
  if (isObject(x)) {
    return Object.assign({}, ...Object.keys(x).map((k) => objectFromArray([[k, recurse(fn(x[k], k), fn)]])));
  }
  return x;
}

function withoutKeys(obj, ...keys) {
  return Object.keys(obj).reduce((result, key) => {
    if (keys.includes(key)) { return result; }
    return Object.assign({}, result, objectFromArray([[key, obj[key]]]));
  }, {});
}

exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;

exports.arrayFromObject = arrayFromObject;
exports.hasKeys = hasKeys;
exports.objectFromArray = objectFromArray;
exports.orderStringify = orderStringify;
exports.recurse = recurse;
exports.withoutKeys = withoutKeys;
