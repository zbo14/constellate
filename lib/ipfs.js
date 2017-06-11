/*

The following code is adapted from..
  > https://github.com/ipfs/js-ipfs/blob/master/examples/basics/index.js
  > https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

------------------------------- LICENSE -------------------------------

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

const CID = require('cids');
const IPFS = require('ipfs');
const fileType = require('file-type');
const os = require('os');
const path = require('path');

const {
    isObject,
    transform
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/ipfs
 */

let node;

function addFile(data, path) {
    return node.files.add({
        content: data,
        path: path
    }).then((result) => {
        return result[0];
    });
}

function getCBOR(cid, format) {
    return new Promise((resolve, reject) => {
        node.dag.get(cid, (err, dagNode) => {
            if (err) return reject(err);
            const obj = transform(dagNode.value, (val, key) => {
                if (key === '/') {
                    return new CID(val).toBaseEncodedString();
                }
                if (isObject(val) && val['/']) {
                    return {
                        '/': new CID(val['/']).toBaseEncodedString()
                    };
                }
                return val;
            });
            resolve(obj);
        });
    });
}

function getFile(multihash) {
    return new Promise((resolve, reject) => {
        node.files.get(multihash).then((stream) => {
            stream.on('data', (file) => {
                if (!file.content) return reject('no file content');
                const data = [];
                let obj;
                file.content.on('data', (chunk) => {
                    data.push(chunk)
                    if (!obj) {
                        obj = fileType(chunk);
                    };
                });
                file.content.once('end', () => {
                    const type = obj.mime.split('/')[0] + '/' + obj.ext;
                    resolve({
                        data,
                        type
                    });
                });
                file.content.resume();
            });
            stream.resume();
        });
    });
}

function putCBOR(obj) {
    return node.dag.put(obj, {
        format: 'dag-cbor',
        hashAlg: 'sha2-256'
    });
}

function refreshPeers() {
    return node.swarm.peers().then(() => {
        console.log('Refreshed peers');
    });
}

function startPeer() {
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
                console.log('Peer is online!');
                node.id().then((info) => {
                    setInterval(refreshPeers, 1000);
                    resolve(info);
                });
            } else {
                reject('Peer is offline');
            }
        });
    });
}

exports.addFile = addFile;
exports.getCBOR = getCBOR;
exports.getFile = getFile;
exports.putCBOR = putCBOR;
exports.startPeer = startPeer;