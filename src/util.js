'use strict';

const bs58 = require('bs58');
const fs = require('fs');
const RIPEMD160 = require('ripemd160');
const sha256 = require('js-sha256').sha256;
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64  = require('urlsafe-base64');

// @flow

/**
* @module constellate/src/util
*/

function arrayFromObject(obj: Object): any[][] {
  return Object.keys(obj).map((key) => [key, obj[key]]);
}

function cloneObject(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

function decodeBase58(str: string): Buffer {
  return Buffer.from(bs58.decode(str));
}

function decodeBase64(str: string): Buffer {
  return urlsafeBase64.decode(str);
}

function digestRIPEMD160(str: string): Buffer {
  return new RIPEMD160().update(str).digest();
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

function isDescendant(ancestor: HTMLElement, elem: HTMLElement): boolean {
  if (!elem) return false;
  if (ancestor == elem) return true;
  const parent: HTMLElement = (elem.parentElement: any);
  return isDescendant(ancestor, parent);
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

function orderStringify(obj: Object, space?: number): Object {
  const keys = [];
  JSON.stringify(obj, (k, v) => {
    keys.push(k);
    if (isArray(v)) v.sort();
    return v;
  });
  return JSON.stringify(obj, keys.sort(), space);
}

function promiseSeq(...fns: Function[]): Promise<any> {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve()).catch(console.error);
}

function readFileInput(input: HTMLInputElement): Promise<ArrayBuffer> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result);
    reader.readAsArrayBuffer(input.files[0]);
  });
}

function transform(x: any, fn: Function): any {
  if (isArray(x)) {
    return x.map((y) => transform(fn(y), fn));
  }
  if (isObject(x)) {
    return Object.assign({}, ...arrayFromObject(x).map(([k, v]) => {
      return objectFromArray([[k, transform(fn(v), fn)]]);
    }));
  }
  return x;
}

function traverse(val: any, fn: Function, result: ?any) {
  _traverse('', val, fn, result);
}

function _traverse(path: string, val: any, fn: Function, result: ?any) {
  if (isArray(val)) {
    val.map((v) => _traverse(path, v, fn, result));
  } else if (isObject(val)) {
    arrayFromObject(val).map(([k, v]) => {
      const fullPath = (!path ? k : path + '/' + k);
      _traverse(fullPath, v, fn, result)
    });
  } else {
    fn(path, val, result);
  }
}

function withoutIndex(arr: Array, idx: number): Array {
  return arr.slice(0, idx).concat(arr.slice(idx+1));
}

function withoutKeys(obj: Object, ...keys: string[]): Object {
  return Object.keys(obj).reduce((result, key) => {
    if (keys.includes(key)) { return result; }
    return Object.assign({}, result, objectFromArray([[key, obj[key]]]));
  }, {});
}

exports.arrayFromObject = arrayFromObject;
exports.cloneObject = cloneObject;
exports.decodeBase58 = decodeBase58;
exports.decodeBase64 = decodeBase64;
exports.digestRIPEMD160 = digestRIPEMD160;
exports.digestSHA256 = digestSHA256;
exports.digestSHA3 = digestSHA3;
exports.encodeBase58 = encodeBase58;
exports.encodeBase64 = encodeBase64;
exports.hasKeys = hasKeys;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isDescendant = isDescendant;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
exports.now = now;
exports.objectFromArray = objectFromArray;
exports.orderStringify = orderStringify;
exports.promiseSeq = promiseSeq;
exports.readFileInput = readFileInput;
exports.transform = transform;
exports.traverse = traverse;
exports.withoutIndex = withoutIndex;
exports.withoutKeys = withoutKeys;
