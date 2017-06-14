'use strict';

const fs = require('fs');

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

function isArray(arr: any): boolean {
  return arr != null && Array.isArray(arr) && arr.length;
}

function isBoolean(bool: any): boolean {
  return bool != null && typeof bool === 'boolean';
}

function isAncestor(ancestor: HTMLElement, elem: HTMLElement): boolean {
  if (!elem) return false;
  if (ancestor == elem) return true;
  const parent: HTMLElement = (elem.parentElement: any);
  return isAncestor(ancestor, parent);
}

function isNumber(num: any): boolean {
  return num != null && typeof num === 'number' &&  num !== NaN;
}

function isObject(obj: any): boolean {
  return obj != null && obj.constructor === Object && Object.keys(obj).length;
}

function isString(str: any): boolean {
  return str != null && typeof str === 'string' && str.length;
}

function newAnchor(data: Buffer[], type: string): HTMLAnchorElement {
  const a = document.createElement('a');
  const blob = new Blob(data, { type });
  const filename = blob.type.replace('/', '.');
  const url = URL.createObjectURL(blob);
  a.setAttribute('href', url);
  a.setAttribute('download', filename);
  a.innerText = filename;
  return a;
}

function objectFromArray(arr: any[][]): Object {
  return arr.reduce((result, [key, val]) => Object.assign({}, result, {[key]: val}), {});
}

function orderObject(obj: Object): Object {
  return JSON.parse(orderStringify(obj));
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

function promiseSequence(...fns: Function[]): Promise<any> {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve());
}

function readFileInput(input: HTMLInputElement, readAs: string): Promise<ArrayBuffer> {
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
