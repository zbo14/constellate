'use strict';

const CID = require('cids');
const dagCBOR = require('ipld-dag-cbor');
const dagPB = require('ipld-dag-pb')
const IPFS = require('ipfs');
const fileType = require('file-type');
const isBuffer = require('is-buffer');
const os = require('os');
const path = require('path');

const {
    cloneObject,
    isObject,
    isString,
    orderObject,
    transform,
    traverse
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/ipfs-node
 */

module.exports = function() {
    const ipfs = new IPFS({
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
    this.addFile = _addFile(ipfs);
    this.addObject = _addObject(ipfs);
    this.dereference = _dereference(ipfs);
    this.expand = _expand(ipfs);
    this.flatten = _flatten(ipfs);
    this.getFile = _getFile(ipfs);
    this.getObject = _getObject(ipfs);
    this.info = ipfs.id;
    this.multihash = multihash;
    let intervalId;
    this.start = () => {
        return new Promise((resolve, _) => {
            ipfs.on('start', () => {
                intervalId = setInterval(_refreshPeers(ipfs), 1000);
                resolve(console.log('Started IPFS Node'));
            });
        });
    }
    this.stop = () => {
        return new Promise((resolve, _) => {
            return ipfs.stop(() => {
                clearInterval(intervalId);
                resolve(console.log('Stopped IPFS Node'));
            });
        });
    }
    this.version = ipfs.version;
}

function _dereference(ipfs) {
    return (cid) => {
        return new Promise((resolve, reject) => {
            if (cid.codec === 'dag-pb' && cid.version === 0) {
                return _getFile(ipfs)(cid.multihash).then(resolve);
            }
            if (cid.codec === 'dag-cbor' && cid.version === 1) {
                return _getObject(ipfs)(cid).then(resolve);
            }
            reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
        });
    }
}

function _expand(ipfs) {
    return (obj) => {
        return new Promise((resolve, reject) => {
            const promises = [];
            traverse(obj, (path, val, result) => {
                if (path.substr(-1) !== '/') return;
                const cid = new CID(val);
                result.push(
                    _dereference(ipfs)(cid).then(deref => {
                        if (deref.type && deref.type.match(/audio|image/)) {
                            return deref;
                        }
                        if (isObject(deref)) {
                            const keys = path.split('/');
                            let key = keys.pop();
                            if (!key) {
                                for (let i = 0; i < keys.length; i++) {
                                    if (i && !keys[i]) {
                                        key = keys[i - 1];
                                        break;
                                    }
                                }
                            }
                            return _expand(ipfs)(deref);
                        }
                        return reject(new Error('unexpected deref: ' + JSON.stringify(deref)));
                    }).then(v => {
                        return [path, v];
                    })
                );
            }, promises);
            const expanded = cloneObject(obj);
            let i, inner, keys, lastKey;
            Promise.all(promises).then(results => {
                for (let i = 0; i < results.length; i++) {
                    keys = results[i][0].split('/').filter(key => !!key);
                    lastKey = keys.pop();
                    if (!lastKey) {
                        keys.pop();
                        lastKey = '/';
                    }
                    inner = keys.reduce((result, key) => {
                        return result[key];
                    }, expanded);
                    inner[lastKey] = results[i][1];
                }
                resolve(expanded);
            });
        });
    }
}

function _flatten(ipfs) {
    return (obj) => {
        return new Promise((resolve, _) => {
            const paths = [];
            const promises = [];
            traverse(obj, (path, val, result) => {
                if (isObject(val) && paths.every(p => !path.match(p))) {
                    paths.push(path);
                    if (isBuffer(val.data) && val.type && val.type.match(/audio|image/)) {
                        promises.push(
                            _addFile(ipfs)(val.data).then(hash => {
                                return [path, {
                                    hash
                                }];
                            })
                        );
                    } else if (isString(val['@context']) && isString(val['@type'])) {
                        promises.push(
                            _flatten(ipfs)(val).then(v => {
                                return [path, v];
                            })
                        );
                    }
                }
            }, promises);
            let flattened = cloneObject(obj);
            if (!promises.length) {
                return _addObject(ipfs)(orderObject(obj)).then(cid => {
                    flattened = orderObject(flattened);
                    const hash = cid.toBaseEncodedString();
                    resolve({
                        flattened,
                        hash
                    });
                });
            }
            Promise.all(promises).then(results => {
                let i, inner, keys, lastKey;
                for (i = 0; i < results.length; i++) {
                    keys = results[i][0].split('/');
                    lastKey = keys.pop();
                    inner = keys.reduce((result, key) => {
                        return result[key];
                    }, flattened);
                    inner[lastKey] = {
                        '/': results[i][1].hash
                    };
                }
                flattened = orderObject(flattened);
                _addObject(ipfs)(flattened).then(cid => {
                    const hash = cid.toBaseEncodedString();
                    resolve({
                        flattened,
                        hash
                    });
                });
            });
        });
    }
}

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

// https://github.com/ipfs/faq/issues/208
function multihash(data) {
    return new Promise((resolve, reject) => {
        dagPB.DAGNode.create(data, (err, node) => {
            if (err) return reject(err);
            resolve(node.toJSON().multihash);
        });
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
            ipfs.files.get(multihash).then(stream => {
                stream.on('data', file => {
                    if (!file.content) return reject('no file content');
                    const chunks = [];
                    let type;
                    file.content.on('data', chunk => {
                        chunks.push(chunk)
                        if (!type) {
                            type = fileType(chunk);
                        };
                    });
                    file.content.once('end', () => {
                        resolve({
                            data: Buffer.concat(chunks),
                            type: type.mime.split('/')[0] + '/' + type.ext
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