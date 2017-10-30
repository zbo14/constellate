'use strict';

var ContentService = require('./');
var fileType = require('file-type');

var bufferToFile = function bufferToFile(buf, name, cb) {
  var ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  var type = fileType(buf.slice(0, 4100));
  if (!type) {
    return cb(new Error('could not get file type'));
  }
  type = type.mime.split('/')[0] + '/' + type.ext; // e.g. audio/mpeg -> audio/mp3
  var file = new File([ab], name, { type: type });
  cb(null, file);
};

var readFiles = function readFiles(files, cb) {
  var results = [];
  var count = 0,
      reader = void 0;
  files = [].concat(files);
  files.forEach(function (file, i) {
    reader = new FileReader();
    reader.onload = function (evt) {
      results[i] = {
        content: Buffer.from(evt.target.result),
        name: file.name,
        type: file.type
      };
      if (++count === files.length) {
        cb(results);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

function BrowserContentService(params) {
  ContentService.call(this, params);
}

BrowserContentService.prototype = Object.create(ContentService.prototype);
BrowserContentService.constructor = BrowserContentService;

BrowserContentService.prototype.get = function (path, password, cb) {
  if (typeof password === 'function') {
    var _ref = [password, ''];
    cb = _ref[0];
    password = _ref[1];
  }
  ContentService.prototype.get.call(this, path, password, function (err, content) {
    if (err) {
      return cb(err);
    }
    var name = path.split('/')[0];
    bufferToFile(content, name, cb);
  });
};

BrowserContentService.prototype.import = function (files, password, cb) {
  var _this = this;

  readFiles(files, function (results) {
    ContentService.prototype.import.call(_this, results, password, cb);
  });
};

module.exports = BrowserContentService;