'use strict';

var FilesAPI = require('ipfs-api/src/files');
var multiaddr = require('multiaddr');
var UnixFS = require('ipfs-unixfs');

var _require = require('ipld-dag-pb'),
    DAGNode = _require.DAGNode,
    DAGLink = _require.DAGLink;

var CHUNK_LENGTH = 262144;

function ContentService(addr) {
  var maddr = multiaddr(addr);
  this.host = maddr.nodeAddress().address;
  this.port = maddr.nodeAddress().port;
  this.files = FilesAPI(addr);
}

ContentService.prototype.pathToURL = function (path) {
  return 'http://' + this.host + ':' + this.port + '/api/v0/get?arg=' + path;
};

ContentService.prototype.put = function (contents, cb) {
  this.files.add(contents, function (err, results) {
    if (err) {
      return cb(err);
    }
    var hashes = results.map(function (result) {
      return result.hash;
    });
    cb(null, hashes);
  });
};

/*

The following code is adapted from https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2014 Juan Batiz-Benet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software withtask restriction, including withtask limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

ContentService.prototype.get = function (path, cb) {
  this.files.get(path, function (err, stream) {
    if (err) {
      return cb(err);
    }
    stream.on('data', function (file) {
      var chunks = [];
      file.content.on('data', function (chunk) {
        chunks.push(chunk);
      });
      file.content.once('end', function () {
        cb(null, Buffer.concat(chunks));
      });
      file.content.resume();
    });
    stream.resume();
  });
};

/*

The following code is adapted from https://github.com/ipfs/js-ipfs-unixfs-engine/tree/master/src/builder

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2016 David Dias

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

ContentService.prototype.hash = function (content, cb) {
  var numChunks = Math.ceil(content.length / CHUNK_LENGTH);
  if (numChunks === 1) {
    var file = new UnixFS('file', content);
    return DAGNode.create(file.marshal(), function (err, dagNode) {
      if (err) {
        return cb(err);
      }
      var mh = dagNode.toJSON().multihash;
      cb(null, mh);
    });
  }
  var dagNodes = [];
  var files = [];
  var links = [];
  var count = 0,
      chunk = void 0;
  var fn = function fn(i) {
    DAGNode.create(files[i].marshal(), function (err, dagNode) {
      if (err) {
        return cb(err);
      }
      dagNodes[i] = dagNode;
      if (++count === numChunks) {
        var _file = new UnixFS('file');
        for (i = 0; i < numChunks; i++) {
          dagNode = dagNodes[i];
          _file.addBlockSize(files[i].fileSize());
          links[i] = new DAGLink('', dagNode.size, dagNode.multihash);
        }
        DAGNode.create(_file.marshal(), links, function (err, dagNode) {
          if (err) {
            return cb(err);
          }
          var mh = dagNode.toJSON().multihash;
          cb(null, mh);
        });
      }
    });
  };
  for (var i = 0; i < numChunks; i++) {
    chunk = content.slice(i * CHUNK_LENGTH, (i + 1) * CHUNK_LENGTH);
    files[i] = new UnixFS('file', chunk);
    fn(i);
  }
};

module.exports = ContentService;