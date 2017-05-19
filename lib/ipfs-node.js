/*

Adatped from..
  > https://github.com/ipfs/js-ipfs/blob/master/examples/basics/index.js
  > https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

----------------------------------------------------------------------------------

The MIT License (MIT)

Copyright (c) 2014 Juan Batiz-Benet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

'use strict';

const IPFS = require('ipfs');
const fileType = require('file-type');
const os = require('os');
const path = require('path');
const { readFileInput } = require('../lib/util.js');

let node, peerInfo;

function addFile(input, cb) {
  readFileInput(input, (reader) => {
    node.files.add({
        content: new Buffer(new Uint8Array(reader.result)),
        path: input.files[0].name
      },
      (err, result) => {
        callback(() => {
          cb(result[0]);
        })(err);
      }
    );
  });
}

function callback(cb) {
  return (err) => {
    if (err) {
      console.error(err);
      return;
    }
    cb();
  }
}

function catFile(multihash) {
  node.files.cat(multihash, (err, stream) => {
    callback(() => {
      try {
        console.log('File content:');
        stream.pipe(process.stdout);
        stream.on('end', process.exit);
      } catch(err) {
        // console.error(err);
        console.warn('Retrying file retrieval');
        setTimeout(catFile(multihash), 1000);
      }
    })(err);
  });
}

function connect2Peer(multiaddr) {
  node.swarm.connect(multiaddr, () => {
    console.log('Connected to peer:', multiaddr);
  });
}

function getFile(multihash, cb) {
  node.files.get(multihash, (err, stream) => {
    callback(() => {
      stream.on('data', (file) => {
        if (file.content) {
          const buf = [];
          let type;
          file.content.on('data', (data) => {
            buf.push(data)
            if (!type) type = fileType(data);
          });
          file.content.once('end', () => {
            // console.log(type);
            const link = newBlobURL(buf, type.ext, multihash);
            cb(link);
          });
          file.content.resume();
        }
      });
      stream.resume();
    })(err);
  });
}

function newBlobURL(data, ext, multihash) {
  const blob = new Blob(data, {type: 'application/octet-binary'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', multihash + '.' + ext);
  const date = (new Date()).toLocaleString();
  link.innerText = date + '-' + multihash + '- Size: ' + blob.size;
  return link;
}

function refreshPeers() {
  node.swarm.peers((err, peers) => {
    callback(() => {
      console.log('Refreshed peers:', peers);
    })(err);
  });
}

function start(cb) {
  node = new IPFS({
    config: {
      Addresses: {
        Swarm: [
          '/libp2p-webrtc-star/dns4/star-signal.cloud.ipfs.team/wss'
        ]
      }
    },
    init: true,
    repo: path.join(os.tmpdir() + '/' + new Date().toString()),
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
      sharding: true
    }
  });
  node.on('start', () => {
    if (node.isOnline()) {
      console.log('Node is online!');
      node.id().then((info) => {
        peerInfo = info;
        console.log('Peer info:', peerInfo);
        setInterval(refreshPeers, 1000);
        cb();
      });
    } else {
      console.error('node offline');
    }
  });
  node.on('stop', () => console.log('Stopping node...'));
  node.version((err, version) => {
    callback(() => {
      console.log('IPFS version:', version.version);
    })(err);
  });
}

exports.addFile = addFile;
exports.catFile = catFile;
exports.connect2Peer = connect2Peer;
exports.getFile = getFile;
exports.start = start;
