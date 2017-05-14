'use strict';

const bs58 = require('bs58');
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64  = require('urlsafe-base64');

// @flow

/**
* @module constellate/src/util
*/

function clone(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

function digestSHA256(str: string): Buffer {
  const hash = sha256.create();
  hash.update(str);
  return Buffer.from(hash.digest());
}

function digestSHA3(str: string): Buffer {
  return Buffer.from(sha3_256.buffer(str));
}

function encodeBase58(buf: Buffer): string {
  return bs58.encode(buf);
}

function encodeBase64(buf: Buffer): string {
  return urlsafeBase64.encode(buf).toString('utf-8', 0, 3);
}

function strToUint8Array(str: string): Uint8Array {
  const ab = new ArrayBuffer(str.length);
  const uint8 = new Uint8Array(ab);
  Array.from(uint8).forEach((_, i) => {
		uint8[i] = str.charCodeAt(i);
	});
  return uint8;
}

function strFromUint8Array(uint8: Uint8Array): string {
  return Array.from(uint8).reduce((result, x) => {
    result += String.fromCharCode(x);
    return result;
  }, '');
}

exports.clone = clone;
exports.encodeBase58 = encodeBase58;
exports.encodeBase64 = encodeBase64;
exports.orderStringify = orderStringify;
exports.digestSHA256 = digestSHA256;
exports.digestSHA3 = digestSHA3;
exports.strFromUint8Array = strFromUint8Array;
exports.strToUint8Array = strToUint8Array;

//--------------------------------------------------------------------------------

function isArray(arr: any): boolean {
  return arr != null && Array.isArray(arr) && arr.length > 0;
}

function isBoolean(bool: any): boolean {
  return bool != null && typeof bool === 'boolean';
}

function isNumber(num: any): boolean {
  return num != null && typeof num === 'number';
}

function isObject(obj: any): boolean {
  return obj != null && obj.constructor === Object && Object.keys(obj).length > 0;
}

function isString(str: any): boolean {
  return str != null && typeof str === 'string' && str.length > 0;
}

function isEqual(val1: any, val2: any): boolean {
  return orderStringify(val1) === orderStringify(val2);
}

function arrayFromObject(obj: Object): any[][] {
  return Object.keys(obj).map((key) => [key, obj[key]]);
}

function hasKey(obj: Object, key: string): boolean {
  return obj.hasOwnProperty(key) && obj[key] != null;
}

function hasKeys(obj: Object, ...keys: string[]): boolean {
  if (!isArray(keys)) { return false; }
  return keys.every((key) => hasKey(obj, key));
}

function objectFromArray(arr: any[][]): Object {
  return arr.reduce((result, [key, val]) => Object.assign({}, result, {[key]: val}), {});
}

function recurse(x: any, fn: Function): any {
  if (isArray(x)) {
    return x.map((y) => recurse(fn(y), fn));
  }
  if (isObject(x)) {
    return Object.assign({}, ...Object.keys(x).map((k) => objectFromArray([[k, recurse(fn(x[k], k), fn)]])));
  }
  return x;
}

function withoutKeys(obj: Object, ...keys: string[]): Object {
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
