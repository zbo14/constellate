'use strict';

const fileType = require('file-type');
const fs = require('fs');

//      

/**
 * @module constellate/src/util
 */

function arrayFromObject(obj) {
    return Object.keys(obj).map(key => [key, obj[key]]);
}

function bufferToArrayBuffer(buf) {
    // from https://stackoverflow.com/a/31394257
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}

function bufferToFile(buf, name) {
    const ab = bufferToArrayBuffer(buf);
    const {
        ext,
        mime
    } = fileType(buf.slice(0, 4100));
    const type = mime.split('/')[0] + '/' + ext;
    return new File([ab], name + '.' + ext, {
        type
    });
}

function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function fileToAnchor(file, type) {
    const a = document.createElement('a');
    a.setAttribute('href', URL.createObjectURL(file));
    a.setAttribute('download', file.name);
    a.innerText = file.name;
    return a;
}

function isArray(arr, isType) {
    return Array.isArray(arr) && arr.length && (!isType || arr.every(isType));
}

function isBoolean(bool) {
    return typeof bool === 'boolean';
}

function isAncestor(ancestor, elem) {
    if (!elem) return false;
    if (ancestor == elem) return true;
    const parent = (elem.parentElement);
    return isAncestor(ancestor, parent);
}

function isNumber(num) {
    return typeof num === 'number' && num !== NaN;
}

function isObject(obj) {
    return obj.constructor === Object && !!Object.keys(obj).length;
}

function isString(str) {
    return typeof str === 'string' && str.length;
}

function objectFromArray(arr) {
    return arr.reduce((result, [key, val]) => Object.assign({}, result, {
        [key]: val
    }), {});
}

function orderObject(obj) {
    return JSON.parse(orderStringify(obj));
}

// adapted from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj, space) {
    const keys = [];
    JSON.stringify(obj, (k, v) => {
        keys.push(k);
        if (isArray(v)) {
            v.sort((x, y) => {
                if (isObject(x) && isObject(y)) {
                    const xkeys = Object.keys(x).sort();
                    const ykeys = Object.keys(y).sort();
                    let i;
                    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
                        if (xkeys[i] < ykeys[i]) return -1;
                        if (xkeys[i] > ykeys[i]) return 1;
                    }
                    if (xkeys.length < ykeys.length) return -1;
                    if (xkeys.length > ykeys.length) return 1;
                    for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
                        if (x[xkeys[i]] < y[ykeys[i]]) return -1;
                        if (x[xkeys[i]] > y[ykeys[i]]) return 1;
                    }
                    return 0;
                }
                if (x < y) return -1;
                if (x > y) return 1;
                return 0;
            });
        }
        return v;
    });
    return JSON.stringify(obj, keys.sort(), space);
}

function promiseSequence(...fns) {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve());
}

function readFileAs(file, readAs) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        if (readAs === 'arraybuffer') {
            reader.readAsArrayBuffer(file);
        } else if (readAs === 'text') {
            reader.readAsText(file);
        } else {
            throw new Error('unexpected readAs: ' + readAs);
        }
    });
}

function transform(x, fn) {
    if (isArray(x)) {
        return x.map(y => transform(fn(y), fn));
    }
    if (isObject(x)) {
        return Object.assign({}, ...arrayFromObject(x).map(([k, v]) => {
            return objectFromArray([
                [k, transform(fn(v), fn)]
            ]);
        }));
    }
    return x;
}

function traverse(val, fn, result) {
    _traverse('', val, fn, result);
}

function _traverse(path, val, fn, result) {
    if (path) fn(path, val, result);
    let i;
    if (isArray(val)) {
        for (i = 0; i < val.length; i++) {
            _traverse(path, val[i], fn, result);
        }
    } else if (isObject(val)) {
        let fullPath, k, v;
        const arr = arrayFromObject(val);
        for (i = 0; i < arr.length; i++) {
            [k, v] = arr[i];
            fullPath = (!path ? k : path + '/' + k);
            _traverse(fullPath, v, fn, result);
        }
    }
}

function withoutIndex(arr, idx) {
    return arr.slice(0, idx).concat(arr.slice(idx + 1));
}

exports.arrayFromObject = arrayFromObject;
exports.bufferToArrayBuffer = bufferToArrayBuffer;
exports.bufferToFile = bufferToFile;
exports.cloneObject = cloneObject;
exports.fileToAnchor = fileToAnchor;
exports.isAncestor = isAncestor;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
exports.objectFromArray = objectFromArray;
exports.orderObject = orderObject;
exports.orderStringify = orderStringify;
exports.promiseSequence = promiseSequence;
exports.readFileAs = readFileAs;
exports.transform = transform;
exports.traverse = traverse;
exports.withoutIndex = withoutIndex;