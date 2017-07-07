'use strict';

const CID = require('cids');
const dagPB = require('ipld-dag-pb');
const IPFS = require('ipfs');
const isIPFS = require('is-ipfs');
const os = require('os');
const path = require('path');
const Unixfs = require('ipfs-unixfs');
require('setimmediate');

const {
    cloneObject,
    isArray,
    isObject,
    isString,
    orderObject,
    transform,
    traverse
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/ipfs
 */

function _expand(getObject) {
    return (obj) => {
        return new Promise((resolve, reject) => {
            const promises = [];
            traverse(obj, (path, val) => {
                if (path.substr(-1) !== '/' || !isObjectHash(val)) return;
                promises.push(
                    getObject(val).then(obj => {
                        return _expand(getObject)(obj);
                    }).then(v => {
                        return [path, v];
                    })
                );
            });
            const expanded = cloneObject(obj);
            let inner, keys, lastKey, x;
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
                    x = inner[lastKey];
                    if ((isObject(x) && !x['/']) || (isArray(x) && !x[0]['/'])) {
                        inner[lastKey] = [].concat(x, results[i][1]);
                    } else {
                        inner[lastKey] = results[i][1];
                    }
                }
                resolve(orderObject(expanded));
            });
        });
    }
}

function _flatten(addObject) {
    return (obj) => {
        return new Promise((resolve, _) => {
            const paths = [];
            const promises = [];
            let hash;
            traverse(obj, (path, val) => {
                if (isObject(val) &&
                    isString(val['@context']) &&
                    isString(val['@type']) &&
                    !paths.some(p => {
                        return path !== p && path.includes(p);
                    })) {
                    paths.push(path);
                    promises.push(
                        _flatten(addObject)(val).then(v => {
                            return [path, v];
                        })
                    );
                }
            });
            let flattened = cloneObject(obj);
            if (!promises.length) {
                return addObject(orderObject(obj)).then(hash => {
                    flattened = orderObject(flattened);
                    resolve({
                        flattened,
                        hash
                    });
                });
            }
            Promise.all(promises).then(results => {
                let inner, keys, lastKey, x;
                for (let i = 0; i < results.length; i++) {
                    keys = results[i][0].split('/');
                    lastKey = keys.pop();
                    if (!lastKey) {
                        keys.pop();
                        lastKey = '/';
                    }
                    inner = keys.reduce((result, key) => {
                        return result[key];
                    }, flattened);
                    x = inner[lastKey];
                    if ((isObject(x) && x['/']) || (isArray(x) && x[0]['/'])) {
                        inner[lastKey] = [].concat(x, {
                            '/': results[i][1].hash
                        });
                    } else {
                        inner[lastKey] = {
                            '/': results[i][1].hash
                        };
                    }
                }
                flattened = orderObject(flattened);
                addObject(flattened).then(hash => {
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
    const addObject = _addObject(ipfs);
    const getObject = _getObject(ipfs);
    this.addFile = _addFile(ipfs);
    this.addObject = addObject;
    this.contentUrl = (hash) => '/ipfs/' + hash;
    this.expand = _expand(getObject);
    this.flatten = _flatten(addObject);
    this.getFile = _getFile(ipfs);
    this.getObject = getObject;
    this.info = ipfs.id;
    this.hash = multihash;
    this.isFileHash = isIPFS.multihash;
    this.isObjectHash = isObjectHash;
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

function isObjectHash(hash) {
    try {
        const cid = new CID(hash);
        return cid.codec === 'dag-cbor' && cid.version === 1;
    } catch (err) {
        return false;
    }
}

// https://github.com/ipfs/faq/issues/208
function multihash(data) {
    return new Promise((resolve, reject) => {
        const file = new Unixfs('file', data);
        dagPB.DAGNode.create(file.marshal(), (err, node) => {
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
        }).then(cid => {
            return cid.toBaseEncodedString()
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
                    file.content.on('data', chunk => {
                        chunks.push(chunk)
                    });
                    file.content.once('end', () => {
                        resolve(Buffer.concat(chunks));
                    });
                    file.content.resume();
                });
                stream.resume();
            });
        });
    }
}

function _getObject(ipfs) {
    return (hash) => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot get object');
        }
        const cid = new CID(hash);
        if (cid.codec !== 'dag-cbor' || cid.version !== 1) {
            throw new Error(`expected CID(codec="dag-cbor",version=1), got CID(codec="${cid.codec}",version=${cid.version})`);
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