/*

Adatped from..
  > https://github.com/ipfs/js-ipfs/blob/master/examples/basics/index.js
  > https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

--------------------------------LICENSE--------------------------------

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

const dagPB = require('ipld-dag-pb');
const DAGNode = dagPB.DAGNode;
const IPFS = require('ipfs');
const fileType = require('file-type');
const multihash = require('multihashes');
const os = require('os');
const path = require('path');
const Unixfs = require('ipfs-unixfs');
const {
    encodeBase58,
    readFileInput
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/ipfs
 */

let node;

function addFile(buf, path) {
    return node.files.add({
        content: buf,
        path: path
    }).then((result) => {
        return result[0];
    });
}

function addFileInput(input) {
    return readFileInput(input).then((ab) => {
        const buf = Buffer.from(ab);
        const path = input.files[0].name;
        return addFile(buf, path);
    });
}

// https://github.com/ipfs/faq/issues/208
// https://github.com/ipfs/js-ipfs-unixfs#create-an-unixfs-data-element
function calcIPFSHash(buf) {
    const data = new Unixfs('file', buf);
    return new Promise((resolve, reject) => {
        DAGNode.create(data.marshal(), (err, node) => {
            if (err) return reject(err);
            resolve(encodeBase58(node._multihash));
        });
    });
}

function connect2Peer(multiaddr) {
    node.swarm.connect(multiaddr).then(() => {
        console.log('Connected to peer:', multiaddr);
    });
}

function getFile(multihash) {
    return node.files.get(multihash).then((stream) => {
        return new Promise((resolve, reject) => {
            stream.on('data', (file) => {
                if (!file.content) return reject('no file content');
                const data = [];
                let type;
                file.content.on('data', (chunk) => {
                    data.push(chunk)
                    if (!type) type = fileType(chunk);
                });
                file.content.once('end', () => {
                    const link = newBlobURL(data, type.ext, multihash);
                    resolve(link);
                });
                file.content.resume();
            });
            stream.resume();
        });
    });
}

function newBlobURL(data, ext, multihash) {
    const blob = new Blob(data, {
        type: 'application/octet-binary'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', multihash + '.' + ext);
    const date = (new Date()).toLocaleString();
    link.innerText = date + '-' + multihash + '- Size: ' + blob.size;
    return link;
}

function refreshPeers() {
    node.swarm.peers().then((peers) => {
        console.log('Refreshed peers:', peers);
    });
}

function startNode() {
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
    node.version().then((version) => {
        console.log('IPFS version:', version.version);
    });
    return new Promise((resolve, reject) => {
        node.on('start', () => {
            if (node.isOnline()) {
                console.log('Node is online!');
                node.id().then((info) => {
                    setInterval(refreshPeers, 1000);
                    resolve(info);
                });
            } else {
                reject('Node is offline');
            }
        });
    });
}

exports.addFile = addFile;
exports.addFileInput = addFileInput;
exports.calcIPFSHash = calcIPFSHash;
exports.connect2Peer = connect2Peer;
exports.getFile = getFile;
exports.startNode = startNode;