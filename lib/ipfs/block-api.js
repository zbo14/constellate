'use strict';

var Block = require('ipfs-block');
var CID = require('cids');
var moduleConfig = require('ipfs-api/src/utils/module-config');
var streamToValue = require('ipfs-api/src/utils/stream-to-value');

/*

  The following code is adapted from https://github.com/ipfs/js-ipfs-api/tree/master/src/block

  ------------------------------- LICENSE -------------------------------

  The MIT License (MIT)

  Copyright (c) 2016 Protocol Labs, Inc.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the 'Software'), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

*/

function BlockAPI(addr) {
  this.send = moduleConfig(addr);
}

BlockAPI.prototype.get = function (cid, cb) {
  var request = {
    path: 'block/get',
    args: cid.toBaseEncodedString()
  };
  var transform = function transform(response, cb) {
    if (Buffer.isBuffer(response)) {
      cb(null, new Block(response, cid));
    } else {
      streamToValue(response, function (err, data) {
        if (err) {
          return cb(err);
        }
        cb(null, new Block(data, cid));
      });
    }
  };
  this.send.andTransform(request, transform, cb);
};

BlockAPI.prototype.put = function (data, cb) {
  var request = {
    path: 'block/put',
    files: data,
    qs: {
      format: 'cbor'
    }
  };
  var transform = function transform(info, cb) {
    cb(null, new Block(data, new CID(info.Key)));
  };
  this.send.andTransform(request, transform, cb);
};

module.exports = BlockAPI;