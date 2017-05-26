'use strict';

const bs58 = require('bs58');
const fs = require('fs');
const RIPEMD160 = require('ripemd160');
const sha256 = require('js-sha256').sha256;
const sha3_256 = require('js-sha3').sha3_256;
const urlsafeBase64 = require('urlsafe-base64');

//

/**
 * @module constellate/src/util
 */

function arrayFromObject(obj) {
    return Object.keys(obj).map((key) => [key, obj[key]]);
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function decodeBase58(str) {
    return Buffer.from(bs58.decode(str));
}

function decodeBase64(str) {
    return urlsafeBase64.decode(str);
}

function digestRIPEMD160(str) {
    return new RIPEMD160().update(str).digest();
}

function digestSHA256(str) {
    const hash = sha256.create();
    hash.update(str);
    return Buffer.from(hash.digest());
}

function digestSHA3(str) {
    return Buffer.from(sha3_256.buffer(str));
}

function encodeBase58(buf) {
    return bs58.encode(buf);
}

function encodeBase64(buf) {
    return urlsafeBase64.encode(buf).toString('utf-8', 0, 3);
}

function hasKey(obj, key) {
    return obj.hasOwnProperty(key) && obj[key] != null;
}

function hasKeys(obj, ...keys) {
    if (!isArray(keys)) {
        return false;
    }
    return keys.every((key) => hasKey(obj, key));
}

function isArray(arr) {
    return arr != null && Array.isArray(arr) && arr.length > 0;
}

function isBoolean(bool) {
    return bool != null && typeof bool === 'boolean';
}

function isNumber(num) {
    return num != null && typeof num === 'number' && num !== NaN;
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

function now() {
    return Date.now() / 1000 | 0;
}

function objectFromArray(arr) {
    return arr.reduce((result, [key, val]) => Object.assign({}, result, {
        [key]: val
    }), {});
}

// from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj, space) {
    const keys = [];
    JSON.stringify(obj, (k, v) => {
        keys.push(k);
        if (isArray(v)) v.sort();
        return v;
    });
    return JSON.stringify(obj, keys.sort(), space);
}

function readFileInput(input) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.readAsArrayBuffer(input.files[0]);
    });
}

function recurse(x, fn) {
    if (isArray(x)) {
        return x.map((y) => {
          console.log(y);
          return recurse(fn(y), fn)
        });
    }
    if (isObject(x)) {
        return Object.assign({}, ...Object.keys(x).map((k) => objectFromArray([
            [k, recurse(fn(x[k], k), fn)]
        ])));
    }
    return x;
}

function withoutKeys(obj, ...keys) {
    return Object.keys(obj).reduce((result, key) => {
        if (keys.includes(key)) {
            return result;
        }
        return Object.assign({}, result, objectFromArray([
            [key, obj[key]]
        ]));
    }, {});
}

exports.arrayFromObject = arrayFromObject;
exports.clone = clone;
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
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
exports.now = now;
exports.objectFromArray = objectFromArray;
exports.orderStringify = orderStringify;
exports.readFileInput = readFileInput;
exports.recurse = recurse;
exports.withoutKeys = withoutKeys;
