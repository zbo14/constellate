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
const dagCBOR = require('ipld-dag-cbor');
const dagPB = require('ipld-dag-pb')
const IPFS = require('ipfs');
const fileType = require('file-type');
const os = require('os');
const path = require('path');

const {
    isObject,
    orderObject,
    transform
} = require('../lib/gen-util.js');

//      

/**
 * @module constellate/src/ipfs-node
 */

module.exports = function() {
    this.ipfs = new IPFS({
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
    this.addFile = _addFile(this.ipfs);
    this.addObject = _addObject(this.ipfs);
    this.calcHash = calcHash;
    this.getFile = _getFile(this.ipfs);
    this.getObject = _getObject(this.ipfs);
    this.info = this.ipfs.id;
    this.start = () => {
        return new Promise((resolve, _) => {
            this.ipfs.on('start', () => {
                this.intervalId = setInterval(_refreshPeers(this.ipfs), 1000);
                resolve(console.log('Started IPFS Node'));
            });
        });
    }
    this.stop = () => {
        return new Promise((resolve, _) => {
            return this.ipfs.stop(() => {
                clearInterval(this.intervalId);
                resolve(console.log('Stopped IPFS Node'));
            });
        });
    }
    this.version = this.ipfs.version;
}

// https://github.com/ipfs/faq/issues/208
function calcHash(data) {
    return new Promise((resolve, reject) => {
        if (isObject(data)) {
            dagCBOR.util.cid(data, (err, cid) => {
                if (err) return reject(err);
                resolve(cid.toBaseEncodedString());
            });
        } else {
            dagPB.DAGNode.create(data, (err, node) => {
                if (err) return reject(err);
                resolve(node.multihash);
            });
        }
    });
}

function _addFile(ipfs) {
    return (data) => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot add file');
        }
        return ipfs.files.add({
            content: data,
            path: ''
        }).then(result => {
            return result[0].hash;
        });
    }
}

function _addObject(ipfs) {
    return (obj) => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot add object');
        }
        return ipfs.dag.put(orderObject(obj), {
            format: 'dag-cbor',
            hashAlg: 'sha2-256'
        });
    }
}

function _getFile(ipfs) {
    return (multihash) => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot get file');
        }
        return new Promise((resolve, reject) => {
            ipfs.files.get(multihash).then((stream) => {
                stream.on('data', file => {
                    if (!file.content) return reject('no file content');
                    const data = [];
                    let obj;
                    file.content.on('data', chunk => {
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
}

function _getObject(ipfs) {
    return (cid) => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot get object');
        }
        return new Promise((resolve, reject) => {
            ipfs.dag.get(cid, (err, dagNode) => {
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
                resolve(orderObject(obj));
            });
        });
    }
}

function _refreshPeers(ipfs) {
    return () => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot refresh peers');
        }
        ipfs.swarm.peers().then(() => {
            // console.log('Refreshed peers');
        });
    }
}