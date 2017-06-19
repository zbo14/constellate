'use strict';

const fs = require('fs');

//      

/**
 * @module constellate/src/gen-util
 */

function arrayFromObject(obj) {
    return Object.keys(obj).map((key) => [key, obj[key]]);
}

function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function isArray(arr) {
    return arr != null && Array.isArray(arr) && arr.length;
}

function isBoolean(bool) {
    return bool != null && typeof bool === 'boolean';
}

function isAncestor(ancestor, elem) {
    if (!elem) return false;
    if (ancestor == elem) return true;
    const parent = (elem.parentElement);
    return isAncestor(ancestor, parent);
}

function isNumber(num) {
    return num != null && typeof num === 'number' && num !== NaN;
}

function isObject(obj) {
    return obj != null && obj.constructor === Object && Object.keys(obj).length;
}

function isString(str) {
    return str != null && typeof str === 'string' && str.length;
}

function newAnchor(data, type) {
    const a = document.createElement('a');
    const blob = new Blob(data, {
        type
    });
    const filename = blob.type.replace('/', '.');
    const url = URL.createObjectURL(blob);
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    a.innerText = filename;
    return a;
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
                return x < y;
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

function readFileInput(input, readAs) {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        const file = input.files[0];
        if (readAs === 'array-buffer') {
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
        return x.map((y) => transform(fn(y), fn));
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

function withoutIndex(arr, idx) {
    return arr.slice(0, idx).concat(arr.slice(idx + 1));
}

exports.arrayFromObject = arrayFromObject;
exports.cloneObject = cloneObject;
exports.isAncestor = isAncestor;
exports.isArray = isArray;
exports.isBoolean = isBoolean;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isString = isString;
exports.newAnchor = newAnchor;
exports.objectFromArray = objectFromArray;
exports.orderObject = orderObject;
exports.orderStringify = orderStringify;
exports.promiseSequence = promiseSequence;
exports.readFileInput = readFileInput;
exports.transform = transform;
exports.traverse = traverse;
exports.withoutIndex = withoutIndex;