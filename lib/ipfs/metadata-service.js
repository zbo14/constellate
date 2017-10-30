'use strict';

var BlockAPI = require('./block-api');
var CID = require('cids');
var dagCBOR = require('../dag-cbor');
var errUnexpectedCID = require('../errors').errUnexpectedCID;
var multiaddr = require('multiaddr');

var _require = require('../util'),
    order = _require.order,
    transform = _require.transform;

var isValidCID = function isValidCID(cid) {
  return CID.isCID(cid) && cid.codec === dagCBOR.codec && cid.version === dagCBOR.version;
};

function MetadataService(addr) {
  var maddr = multiaddr(addr);
  this.blocks = new BlockAPI(addr);
  this.host = maddr.nodeAddress().address;
  this.port = maddr.nodeAddress().port;
}

MetadataService.prototype.get = function (cid, cb) {
  if (!isValidCID(cid)) {
    return cb(errUnexpectedCID(cid));
  }
  this.blocks.get(cid, function (err, block) {
    if (err) {
      return cb(err);
    }
    dagCBOR.deserialize(block.data, function (err, obj) {
      if (err) {
        return cb(err);
      }
      try {
        obj = transform(obj, function (val) {
          if (val.constructor === Object && val['/']) {
            cid = new CID(val['/']);
            return {
              '/': cid.toBaseEncodedString()
            };
          }
          return val;
        });
        cb(null, order(obj));
      } catch (err) {
        cb(err);
      }
    });
  });
};

MetadataService.prototype.hash = function (obj, cb) {
  dagCBOR.cid(obj, function (err, cid) {
    if (err) {
      return cb(err);
    }
    cb(null, cid.toBaseEncodedString());
  });
};

MetadataService.prototype.hashFromCID = function (cid, cb) {
  if (!isValidCID(cid)) {
    return cb(errUnexpectedCID(cid));
  }
  var hash = cid.toBaseEncodedString();
  cb(null, hash);
};

MetadataService.prototype.pathToCID = function (path) {
  var parts = path.split('/');
  var cid = new CID(parts.shift());
  var remPath = parts.join('/');
  return { cid: cid, remPath: remPath };
};

MetadataService.prototype.pathToURL = function (path) {
  return 'http://' + this.host + ':' + this.port + '/api/v0/dag/get?arg=' + path;
};

MetadataService.prototype.put = function (obj, cb) {
  var _this = this;

  dagCBOR.serialize(obj, function (err, data) {
    if (err) {
      return cb(err);
    }
    _this.blocks.put(data, function (err, block) {
      if (err) {
        return cb(err);
      }
      cb(null, block.cid);
    });
  });
};

MetadataService.prototype.resolve = dagCBOR.resolve;

module.exports = MetadataService;