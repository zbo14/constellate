'use strict';

const EventEmitter = require('events');
const fileType = require('file-type');
const fs = require('fs');

//      

/**
 * @module constellate/src/util
 */

function Tasks() {
    const tasks = [];
    let i = 0;
    this.run = (...args) => {
        args.push(this);
        tasks[i].run(...args);
    }
    this.move = (j) => {
        if (i + j < tasks.length) i += j;
    }
    this.next = (...args) => {
        this.move(1, ...args);
    }
    this.error = (err) => {
        tasks[i].error(err);
    }
    this.add = (fn) => {
        const task = new Task();
        task.onRun(fn);
        tasks.push(task);
    }
}

const RUN = 'run';
const ERROR = 'error';

function Task() {
    const ee = new EventEmitter();
    this.run = (...args) => {
        ee.emit(RUN, ...args);
    }
    this.error = (err) => {
        ee.emit(ERROR, err);
    }
    this.onRun = (fn) => {
        ee.on(RUN, fn);
    }
    ee.on(ERROR, err => {
        throw err;
    });
}

function arrayFromObject(obj) {
    return Object.keys(obj).map(key => [key, obj[key]]);
}

function assign(...objs) {
    return Object.assign({}, ...objs);
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

function clone(obj) {
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
    return obj && obj.constructor === Object && !!Object.keys(obj).length;
}

function isString(str) {
    return typeof str === 'string' && str.length;
}

function newArray(_default, length) {
    return (Array).apply(null, {
        length
    }).map(() => _default);
}

function objectFromArray(arr) {
    return arr.reduce((result, [key, val]) => assign(result, {
        [key]: val
    }), {});
}

function order(x) {
    return JSON.parse(orderStringify(x));
}

// adapted from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(x, space) {
    const keys = [];
    JSON.stringify(x, (k, v) => {
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
    return JSON.stringify(x, keys.sort(), space);
}

function promiseSequence(...fns) {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve());
}

function readFileAs(file, readAs) {
    const reader = new FileReader();
    return new Promise(resolve => {
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

function splice(arr, start, deleteCount, ...items) {
    return arr.slice(0, start).concat(items).concat(arr.slice(start + 1 + deleteCount));
}

function transform(x, fn) {
    if (isArray(x)) {
        return x.map(y => transform(fn(y), fn));
    }
    if (isObject(x)) {
        return assign(...arrayFromObject(x).map(([k, v]) => {
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

module.exports = {
    Task,
    Tasks,
    arrayFromObject,
    assign,
    bufferToArrayBuffer,
    bufferToFile,
    clone,
    fileToAnchor,
    isAncestor,
    isArray,
    isBoolean,
    isNumber,
    isObject,
    isString,
    newArray,
    objectFromArray,
    order,
    orderStringify,
    promiseSequence,
    readFileAs,
    splice,
    transform,
    traverse,
    withoutIndex
}