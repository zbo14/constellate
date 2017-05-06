'use strict';

const bs58 = require('bs58');
const Buffer = require('buffer/').Buffer;
const sha3_256 = require('js-sha3').sha3_256;
const stream = require('stream');
const urlsafeBase64  = require('urlsafe-base64');

// @flow

/**
* @module constellate/src/util
*/

function base58_encode(key: Buffer): string {
  if (key == null) { return null; }
  return bs58.encode(key);
}

function base64_digest(obj: Object): string {
  let ab = sha3_256.buffer(orderStringify(obj));
  return urlsafeBase64.encode(Buffer.from(ab)).toString('utf-8', 0, 3);
}

function clone(obj: Object): Object {
  return JSON.parse(JSON.stringify(obj));
}

function extend(_super: Object): Object {
  let intermediateConstructor = function() {};
  intermediateConstructor.prototype = _super.prototype;
  return new intermediateConstructor();
}

// from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

function orderStringify(obj: Object, space?: number): string {
  const keys = [];
  JSON.stringify(obj, (k, v) => { keys.push(k); return v; });
  return JSON.stringify(obj, keys.sort(), space);
}

// from http://stackoverflow.com/a/21127245

function StringifyStream() {
  stream.Transform.call(this);
  this._readableState.objectMode = false;
  this._writableState.objectMode = true;
}

StringifyStream.prototype = extend(stream.Transform);
StringifyStream.constructor = StringifyStream;

StringifyStream.prototype._transform = function(obj: Object, encoding: string, callback: Function) {
  this.push(orderStringify(obj));
  callback();
}

function writeObject(obj: Object, writable: stream.Writeable) {
  let rs = new stream.Readable({ objectMode: true });
  rs.push(obj);
  rs.push(null);
  rs.pipe(new StringifyStream()).pipe(writable);
}

exports.base58_encode = base58_encode;
exports.base64_digest = base64_digest;
exports.clone = clone;
exports.extend = extend;
exports.orderStringify = orderStringify;
exports.writeObject = writeObject;
