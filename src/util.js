'use strict';

const Ajv = require('ajv');
const bs58 = require('bs58');
const sha256 = require('js-sha256').sha256;
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64  = require('urlsafe-base64');

// @flow

/**
* @module constellate/src/util
*/

const ajv = new Ajv();

const draft = 'http://json-schema.org/draft-06/schema#';

function arrayFromObject(obj: Object): any[][] {
  return Object.keys(obj).map((key) => [key, obj[key]]);
}

function calcId(key: string, obj: Object): string {
  return encodeBase64(digestSHA256(orderStringify(withoutKeys(obj, key))));
}

function clone(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

function decodeBase58(str: string): Buffer {
  return Buffer.from(bs58.decode(str));
}

function decodeBase64(str: string): Buffer {
  return urlsafeBase64.decode(str);
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

function getId(key: string, obj: Object): string {
  let id = '';
  if (obj && obj.hasOwnProperty(key) && obj[key]) {
    id = obj[key];
  }
  return id;
}

function getIds(key: string, ...objs: Object[]): string[] {
  return objs.map((obj) => getId(key, obj));
}

function hasKey(obj: Object, key: string): boolean {
  return obj.hasOwnProperty(key) && obj[key] != null;
}

function hasKeys(obj: Object, ...keys: string[]): boolean {
  if (!isArray(keys)) { return false; }
  return keys.every((key) => hasKey(obj, key));
}

function isArray(arr: any): boolean {
  return arr != null && Array.isArray(arr) && arr.length > 0;
}

function isBoolean(bool: any): boolean {
  return bool != null && typeof bool === 'boolean';
}

function isNumber(num: any): boolean {
  return num != null && typeof num === 'number' &&  num !== NaN;
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

function now(): number {
  return Date.now() / 1000 | 0;
}

function objectFromArray(arr: any[][]): Object {
  return arr.reduce((result, [key, val]) => Object.assign({}, result, {[key]: val}), {});
}

// from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj: Object, space?: number) {
  const keys = [];
  JSON.stringify(obj, (k, v) => {
    keys.push(k);
    return v;
  });
  return JSON.stringify(obj, keys.sort(), space);
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

function validateSchema(obj: Object, schema: Object): boolean {
  return ajv.compile(schema)(obj);
}

function withoutKeys(obj: Object, ...keys: string[]): Object {
  return Object.keys(obj).reduce((result, key) => {
    if (keys.includes(key)) { return result; }
    return Object.assign({}, result, objectFromArray([[key, obj[key]]]));
  }, {});
}

exports.arrayFromObject = arrayFromObject;
exports.calcId = calcId;
exports.clone = clone;
exports.decodeBase58 = decodeBase58;
exports.decodeBase64 = decodeBase64;
exports.digestSHA256 = digestSHA256;
exports.digestSHA3 = digestSHA3;
exports.draft = draft;
exports.encodeBase58 = encodeBase58;
exports.encodeBase64 = encodeBase64;
exports.getId = getId;
exports.getIds = getIds;
exports.hasKeys = hasKeys;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
exports.now = now;
exports.objectFromArray = objectFromArray;
exports.orderStringify = orderStringify;
exports.recurse = recurse;
exports.strFromUint8Array = strFromUint8Array;
exports.strToUint8Array = strToUint8Array;
exports.validateSchema = validateSchema;
exports.withoutKeys = withoutKeys;
