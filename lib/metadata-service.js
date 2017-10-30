'use strict';

var IpfsMetadataService = require('./ipfs/metadata-service');
var isSubType = require('js-coalaip/src/util').isSubType;
var Person = require('js-coalaip/src/core').Person;
var Resolver = require('./resolver');

var _require = require('./errors'),
    errUnexpectedHash = _require.errUnexpectedHash,
    errUnsupportedService = _require.errUnsupportedService;

function MetadataService(_ref) {
  var name = _ref.name,
      path = _ref.path;

  if (name === 'bigchaindb') {
    // ...
  } else if (name === 'ipfs') {
    this.service = new IpfsMetadataService(path);
  } else {
    throw errUnsupportedService(name);
  }
  this.hashes = {};
  this.resolver = new Resolver(this.service);
}

MetadataService.prototype.get = function (path, expand, id, cb) {
  var _this = this;

  if (typeof id === 'function') {
    var _ref2 = [id, ''];
    cb = _ref2[0];
    id = _ref2[1];
  }
  var parts = path.split('/');
  var first = parts.shift();
  if (this.hashes[first]) {
    path = this.hashes[first];
    if (parts.length) {
      path += '/' + parts.join('/');
    }
  }
  try {
    var _service$pathToCID = this.service.pathToCID(path),
        cid = _service$pathToCID.cid,
        remPath = _service$pathToCID.remPath;

    this.resolver.get(cid, remPath, id, function (err, result) {
      if (err) {
        return cb(err);
      }
      if (!expand) {
        return cb(null, result);
      }
      _this.resolver.expand(result, id, cb);
    });
  } catch (err) {
    cb(err);
  }
};

MetadataService.prototype.import = function (metadata, cb) {
  var _this2 = this;

  var count = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
  var ipld = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];

  if (count === metadata.length) {
    this.ipld = ipld;
    return cb(null);
  }
  var meta = metadata[count];
  if (meta.path) {
    return this.import(metadata, cb, count + 1, ipld);
  }
  var obj = meta.ipld();
  ipld.push(obj);
  this.service.hash(obj, function (err, hash) {
    if (err) {
      return cb(err);
    }
    var name = void 0;
    if (isSubType(meta, new Person())) {
      name = meta.getGivenName() + ' ' + meta.getFamilyName();
    } else {
      name = meta.getName();
    }
    _this2.hashes[name || hash] = meta.path = hash;
    _this2.import(metadata, cb, count + 1, ipld);
  });
};

MetadataService.prototype.put = function (cb) {
  var _this3 = this;

  var count = 0;
  this.ipld.forEach(function (obj) {
    _this3.service.put(obj, function (err, cid) {
      if (err) {
        return cb(err);
      }
      _this3.service.hashFromCID(cid, function (err, hash) {
        if (err) {
          return cb(err);
        }
        var name = void 0;
        if (obj.name) {
          name = obj.name;
        } else if (obj.familyName && obj.givenName) {
          name = obj.givenName + ' ' + obj.familyName;
        } else {
          name = hash;
        }
        if (hash !== _this3.hashes[name]) {
          return cb(errUnexpectedHash(hash, _this3.hashes[name]));
        }
        if (++count === _this3.ipld.length) {
          cb(null);
        }
      });
    });
  });
};

module.exports = MetadataService;