/*

Adatped from https://github.com/ipfs/js-ipfs/blob/master/examples/basics/index.js

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

const EventEmitter = require('events');
const IPFS = require('ipfs');
const os = require('os');
const path = require('path');
const { readFileInput } = require('../lib/util.js');

const emitter = new EventEmitter();
emitter.on('started', setup);
emitter.on('node-ready', goOnline);
emitter.on('node-online', waitOnUpload);
emitter.on('file-uploaded', addFile);
emitter.on('file-added', retrieveFile);
emitter.on('file-retrieved', () => {});

let fileInput, fileMultihash, node;

function callback(cb) {
  return (err) => {
    if (err) {
      console.error(err);
      return;
    }
    cb();
  }
}

function start(input) {
  fileInput = input;
  node = new IPFS({
    init: false,
    repo: path.join(os.tmpdir() + '/' + new Date().toString()),
    start: false,
    EXPERIMENTAL: {
      pubsub: false
    }
  });
  emitter.emit('started');
}

function setup() {
  node.version((err, version) => {
    callback(() => {
      console.log('IPFS version:', version.version);
      node.init({
          bits: 2048,
          emptyRepo: true
        },
        callback(() => {
          emitter.emit('node-ready');
        })
      );
    })(err);
  });
}

function goOnline() {
  node.start(
    callback(() => {
      if (node.isOnline()) {
        console.log('Node is online!');
        emitter.emit('node-online');
      } else {
        console.error('node offline');
      }
    })
  );
}

function waitOnUpload() {
  fileInput = document.querySelector('input[type="file"]');
  fileInput.addEventListener('change', () => {
    console.log('File uploaded!');
    emitter.emit('file-uploaded');
  });
}

function addFile() {
  readFileInput(fileInput, (reader) => {
    node.files.add({
      content: new Buffer(new Uint8Array(reader.result)),
      path: '/tmp/' + fileInput.files[0].name
    }, (err, result) => {
      callback(() => {
        console.log('Added file:', result[0]);
        fileMultihash = result[0].hash;
        emitter.emit('file-added');
      })(err);
    })
  });
}

function retrieveFile() {
  console.log(fileMultihash);
  node.files.get(fileMultihash, (err, stream) => {
    callback(() => {
      console.log('File content:');
      stream.pipe(process.stdout);
      stream.on('end', process.exit);
      emitter.emit('file-retrieved');
    })(err);
  });
}

exports.start = start;
