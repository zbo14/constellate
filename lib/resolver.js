'use strict';

var errPathNotFound = require('./errors').errPathNotFound;
var traverse = require('./util').traverse;

/*

  The following code is adapted from https://github.com/ipld/js-ipld-resolver/blob/master/src/index.js

  ------------------------------- LICENSE -------------------------------

  The MIT License (MIT)

  Copyright (c) 2016 IPFS

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

function Resolver(service) {
  this.service = service;
}

Resolver.prototype.expand = function (obj, id, cb) {
  var _this = this;

  var val = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : obj;
  var keys = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : [];

  if (keys.length) {
    var lastKey = keys[keys.length - 1];
    var inner = keys.slice(0, -1).reduce(function (result, key) {
      return result[key];
    }, obj);
    var x = inner[lastKey];
    if (x.constructor === Object && !x['/'] || x instanceof Array && !x[0]['/']) {
      inner[lastKey] = [].concat(x, val);
    } else {
      inner[lastKey] = val;
    }
  }
  if (val.constructor !== Object) {
    return cb(null, obj);
  }
  if (obj['/']) {
    var _service$pathToCID = this.service.pathToCID(obj['/']),
        cid = _service$pathToCID.cid,
        remPath = _service$pathToCID.remPath;

    return this.get(cid, remPath, id, function (err, result) {
      if (err) {
        return cb(err);
      }
      _this.expand(result, id, function (err, result) {
        if (err) {
          return cb(err);
        }
        cb(null, result);
      });
    });
  }
  var queries = [];
  traverse(val, function (v, key) {
    if (v.constructor === Object && v['/']) {
      var _service$pathToCID2 = _this.service.pathToCID(v['/']),
          _cid = _service$pathToCID2.cid,
          _remPath = _service$pathToCID2.remPath;

      queries.push({ cid: _cid, remPath: _remPath, key: key });
    }
  });
  if (!queries.length) {
    return cb(null, obj);
  }
  var count = 0;

  var _loop = function _loop(i) {
    var _queries$i = queries[i],
        cid = _queries$i.cid,
        remPath = _queries$i.remPath,
        key = _queries$i.key;

    _this.get(cid, remPath, id, function (err, result) {
      if (err) {
        return cb(err);
      }
      _this.expand(obj, id, function (err, result) {
        if (err) {
          return cb(err);
        }
        if (++count === queries.length) {
          cb(null, result);
        }
      }, result, keys.concat(key));
    });
  };

  for (var i = 0; i < queries.length; i++) {
    _loop(i);
  }
};

Resolver.prototype.get = function (cid, path, id, cb) {
  var _this2 = this;

  var p = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : path;

  this.service.get(cid, function (err, obj) {
    if (err) {
      return cb(err);
    }
    _this2.service.resolve(obj, p, function (err, val, remPath) {
      if (err) {
        return cb(err);
      }
      if (!remPath || remPath === '/' && val && !val['/']) {
        if (!id) {
          return cb(null, val);
        }
        return _this2.service.hashFromCID(cid, function (err, hash) {
          if (err) {
            return cb(err);
          }
          val[id] = hash;
          if (path) {
            val[id] += '/' + path;
          }
          cb(null, val);
        });
      }
      if (val) {
        try {
          val = _this2.service.pathToCID(val['/']);
        } catch (err) {
          cb(errPathNotFound(path));
        }
        cid = val.cid;
        if (val.remPath) {
          p = val.remPath + '/' + remPath;
        } else {
          p = remPath;
        }
      }
      _this2.get(cid, path, id, cb, p);
    });
  });
};

module.exports = Resolver;