'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var cbor = require('borc');
var crypto = require('crypto');
var CID = require('cids');
var errPathNotFound = require('./errors').errPathNotFound;
var multihash = require('multihashes');

var _require = require('./util'),
    orderStringify = _require.orderStringify,
    transform = _require.transform;

/*

  The following code is adapted from..
    > https://github.com/ipld/js-ipld-dag-cbor/blob/master/src/resolver.js
    > https://github.com/ipld/js-ipld-dag-cbor/blob/master/src/util.js

  ------------------------------- LICENSE -------------------------------

  The MIT License (MIT)

  Copyright (c) 2015 David Dias

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

var CID_CBOR_TAG = 42;

var decoder = new cbor.Decoder({
  tags: _defineProperty({}, CID_CBOR_TAG, function (val) {
    return {
      '/': val.slice(1)
    };
  })
});

var sha2_256 = function sha2_256(data) {
  return crypto.createHash('sha256').update(data).digest();
};

exports.codec = 'dag-cbor';
exports.version = 1;

exports.cid = function (obj, cb) {
  exports.serialize(obj, function (err, data) {
    if (err) {
      return cb(err);
    }
    try {
      var mh = multihash.encode(sha2_256(data), 'sha2-256');
      var cid = new CID(exports.version, exports.codec, mh);
      cb(null, cid, data);
    } catch (err) {
      cb(err);
    }
  });
};

exports.deserialize = function (data, cb) {
  try {
    var obj = decoder.decodeFirst(data);
    cb(null, obj);
  } catch (err) {
    cb(err);
  }
};

exports.resolve = function (obj, path, cb) {
  if (!path || path === '/') {
    return cb(null, obj, '');
  }
  var parts = path.split('/');
  var remPath = '',
      val = obj;
  for (var i = 0; i < parts.length; i++) {
    if (val instanceof Array) {
      val = val[Number(parts[i])];
    } else if (val[parts[i]]) {
      val = val[parts[i]];
    } else {
      if (!val) {
        return cb(errPathNotFound(path));
      }
      remPath = parts.slice(i).join('/');
      break;
    }
  }
  cb(null, val, remPath);
};

exports.serialize = function (obj, cb) {
  var seen = [];
  var cid = void 0,
      stop = void 0;
  var tagged = transform(obj, function (val) {
    if (val.constructor !== Object) {
      return val;
    }
    if (seen.some(function (obj) {
      return orderStringify(obj) === orderStringify(val);
    })) {
      stop = true;
      return cb(new Error('the object passed has circular references'));
    }
    seen.push(val);
    if (!(cid = val['/'])) {
      return val;
    }
    if (typeof cid === 'string') {
      cid = new CID(cid.split('/')[0]).buffer;
    }
    return new cbor.Tagged(CID_CBOR_TAG, Buffer.concat([Buffer.from('00', 'hex'), cid]));
  });
  if (!stop) {
    try {
      var data = cbor.encode(tagged);
      cb(null, data);
    } catch (err) {
      cb(err);
    }
  }
};