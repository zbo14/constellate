'use strict';

var aes = require('aes-js');
var IpfsContentService = require('../ipfs/content-service');

var _require = require('../crypto'),
    encryptFiles = _require.encryptFiles,
    scrypt2x = _require.scrypt2x;

var _require2 = require('../errors'),
    errInvalidPassword = _require2.errInvalidPassword,
    errUnexpectedHash = _require2.errUnexpectedHash,
    errUnexpectedType = _require2.errUnexpectedType,
    errUnsupportedService = _require2.errUnsupportedService;

var _require3 = require('js-coalaip/src/core'),
    AudioObject = _require3.AudioObject,
    ImageObject = _require3.ImageObject,
    VideoObject = _require3.VideoObject;

function ContentService(_ref) {
  var name = _ref.name,
      path = _ref.path;

  if (name === 'ipfs') {
    this.service = new IpfsContentService(path);
  } else if (name === 'swarm') {
    // ...
  } else {
    throw errUnsupportedService(name);
  }
  this.hashes = {};
}

ContentService.prototype.get = function (path, password, cb) {
  var _this = this;

  if (typeof password === 'function') {
    var _ref2 = [password, ''];
    cb = _ref2[0];
    password = _ref2[1];
  }
  var parts = path.split('/');
  var first = parts.shift();
  if (this.hashes[first]) {
    path = this.hashes[first];
    if (parts.length) {
      path += '/' + parts.join('/');
    }
  }
  this.service.get(path, function (err, content) {
    if (err) {
      return cb(err);
    } else if (!password) {
      return cb(null, content);
    } else if (!_this.decryption) {
      return cb(new Error('no decryption'));
    }
    var key = _this.decryption.keys[first];
    if (!key) {
      return cb(new Error('no decryption key for name: ' + first));
    }
    var salt = Buffer.from(_this.decryption.salt, 'hex');
    scrypt2x(password, salt, function (dkey, hash) {
      if (_this.decryption.hash !== hash) {
        return cb(errInvalidPassword(password));
      }
      try {
        var aesCtr = new aes.ModeOfOperation.ctr(dkey);
        key = Buffer.from(aesCtr.decrypt(Buffer.from(key, 'hex')).buffer);
        aesCtr = new aes.ModeOfOperation.ctr(key);
        content = Buffer.from(aesCtr.decrypt(content).buffer);
        cb(null, content);
      } catch (err) {
        cb(err);
      }
    });
  });
};

ContentService.prototype.process = function (files, cb) {
  var _this2 = this;

  var metadata = [];
  var count = 0;
  files.forEach(function (file, i) {
    _this2.service.hash(file.content, function (err, hash) {
      if (err) {
        return cb(err);
      }
      _this2.hashes[file.name] = hash;
      var type = file.type.split('/')[0];
      if (type === 'audio') {
        metadata[i] = new AudioObject();
      } else if (type === 'image') {
        metadata[i] = new ImageObject();
      } else if (type === 'video') {
        metadata[i] = new VideoObject();
      } else {
        return cb(errUnexpectedType(type, 'audio|image|video'));
      }
      metadata[i].setContentUrl(_this2.service.pathToURL(hash));
      metadata[i].setEncodingFormat(file.type);
      metadata[i].setName(file.name);
      if (++count === files.length) {
        cb(null, metadata);
      }
    });
  });
};

ContentService.prototype.import = function (files, password, cb) {
  var _this3 = this;

  if (typeof password === 'function') {
    var _ref3 = [password, ''];
    cb = _ref3[0];
    password = _ref3[1];
  }
  if (password) {
    encryptFiles(files, password, function (files, decryption) {
      _this3.process(files, function (err, metadata) {
        if (err) {
          return cb(err);
        }
        _this3.decryption = decryption;
        _this3.files = files;
        cb(null, metadata);
      });
    });
  } else {
    this.process(files, function (err, metadata) {
      if (err) {
        return cb(err);
      }
      _this3.files = files;
      cb(null, metadata);
    });
  }
};

ContentService.prototype.put = function (cb) {
  var _this4 = this;

  if (!this.files || !this.files.length) {
    return cb(new Error('no files'));
  }
  var contents = this.files.map(function (file) {
    return file.content;
  });
  var file = void 0;
  this.service.put(contents, function (err, results) {
    if (err) {
      return cb(err);
    }
    for (var i = 0; i < _this4.files.length; i++) {
      file = _this4.files[i];
      if (results[i] !== _this4.hashes[file.name]) {
        return cb(errUnexpectedHash(results[i], _this4.hashes[file.name]));
      }
    }
    cb(null);
  });
};

module.exports = ContentService;