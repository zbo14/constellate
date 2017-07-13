'use strict';

const fileType = require('file-type');
const fs = require('fs');

// @flow

/**
 * @module constellate/src/util
 */

function arrayFromObject(obj: Object): any[][] {
  return Object.keys(obj).map(key => [key, obj[key]]);
}

function assign(...objs: Object[]): Object {
  return Object.assign({}, ...objs);
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  // from https://stackoverflow.com/a/31394257
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}

function bufferToFile(buf: Buffer, name: string): File {
  const ab = bufferToArrayBuffer(buf);
  const { ext, mime } = fileType(buf.slice(0, 4100));
  const type = mime.split('/')[0] + '/' + ext;
  return new File([ab], name + '.' + ext, { type });
}

function cloneObject(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

function fileToAnchor(file: File, type: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.setAttribute('href', URL.createObjectURL(file));
  a.setAttribute('download', file.name);
  a.innerText = file.name;
  return a;
}

function isArray(arr: any, isType?: Function): boolean {
  return Array.isArray(arr) && arr.length && (!isType || arr.every(isType));
}

function isBoolean(bool: any): boolean {
  return typeof bool === 'boolean';
}

function isAncestor(ancestor: HTMLElement, elem: HTMLElement): boolean {
  if (!elem) return false;
  if (ancestor == elem) return true;
  const parent: HTMLElement = (elem.parentElement: any);
  return isAncestor(ancestor, parent);
}

function isNumber(num: any): boolean {
  return typeof num === 'number' &&  num !== NaN;
}

function isObject(obj: any): boolean {
  return obj && obj.constructor === Object && !!Object.keys(obj).length;
}

function isString(str: any): boolean {
  return typeof str === 'string' && str.length;
}

function newArray(_default: any, length: number): any[] {
  return (Array : any).apply(null, { length }).map(() => _default);
}

function objectFromArray(arr: any[][]): Object {
  return arr.reduce((result, [key, val]) => assign(result, {[key]: val}), {});
}

function order(x: any[]|Object): Object {
  return JSON.parse(orderStringify(x));
}

// adapted from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(x: any[]|Object, space?: number): string {
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

function promiseSequence(...fns: Function[]): Promise<any> {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve());
}

function readFileAs(file: File, readAs: string): Promise<ArrayBuffer|string> {
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

function splice(arr: any[], start: number, deleteCount: number, ...items: any[]): any[] {
  return arr.slice(0, start).concat(items).concat(arr.slice(start+1+deleteCount));
}

function transform(x: any, fn: Function): any {
  if (isArray(x)) {
    return x.map(y => transform(fn(y), fn));
  }
  if (isObject(x)) {
    return assign(...arrayFromObject(x).map(([k, v]) => {
      return objectFromArray([[k, transform(fn(v), fn)]]);
    }));
  }
  return x;
}

function traverse(val: any, fn: Function, result: ?any) {
  _traverse('', val, fn, result);
}

function _traverse(path: string, val: any, fn: Function, result: ?any) {
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

function withoutIndex(arr: any[], idx: number): any[] {
  return arr.slice(0, idx).concat(arr.slice(idx+1));
}

exports.arrayFromObject = arrayFromObject;
exports.assign = assign;
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
exports.newArray = newArray;
exports.objectFromArray = objectFromArray;
exports.order = order;
exports.orderStringify = orderStringify;
exports.promiseSequence = promiseSequence;
exports.readFileAs = readFileAs;
exports.splice = splice;
exports.transform = transform;
exports.traverse = traverse;
exports.withoutIndex = withoutIndex;
