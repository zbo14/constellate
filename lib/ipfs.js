'use strict';

const CID = require('cids');
const dagCBOR = require('ipld-dag-cbor');
const dagPB = require('ipld-dag-pb');
const IPFS = require('ipfs');
const isIPFS = require('is-ipfs');
const Repo = require('ipfs-repo');
const Unixfs = require('ipfs-unixfs');
const wrtc = require('wrtc');
const WStar = require('libp2p-webrtc-star');
require('setimmediate');

const {
    Tasks,
    assign,
    isArray,
    isObject,
    isString,
    order,
    transform,
    traverse
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/ipfs
 */

/*

The following code is adapted from..
  > https://github.com/ipfs/js-ipfs/blob/master/README.md
  > https://github.com/ipfs/js-ipfs/blob/master/examples/basics/index.js
  > https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2014 Juan Batiz-Benet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software withtask restriction, including withtask limitation the rights
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

const wstar = new WStar({
    wrtc
});

module.exports = function(repo) {

    let intervalId, ipfs;

    this.addFile = (data, t, id) => {
        if (!ipfs.isOnline()) {
            return t.error(new Error('IPFS Node is offline, cannot add file'));
        }
        ipfs.files.add({
            content: data,
            path: ''
        }, (err, result) => {
            if (err) {
                return t.error(err);
            }
            t.run(result[0].hash, id);
        });
    }

    this.addObject = (obj, t, id) => {
        if (!ipfs.isOnline()) {
            return t.error(new Error('IPFS Node is offline, cannot add object'));
        }
        ipfs.dag.put(order(obj), {
            format: 'dag-cbor',
            hashAlg: 'sha2-256'
        }, (err, cid) => {
            if (err) {
                return t.error(err);
            }
            t.run(cid.toBaseEncodedString(), id);
        });
    }

    this.get = (path, t, id) => {
        if (!ipfs.isOnline()) {
            return t.error(new Error('IPFS Node is offline, cannot get'));
        }
        ipfs.dag.get(path, (err, node) => {
            if (err) {
                return t.error(err);
            }
            let result = node.value;
            if (isArray(result) || isObject(result)) {
                result = order(transform(result, (val, key) => {
                    if (key === '/') {
                        return new CID(val).toBaseEncodedString();
                    }
                    if (isObject(val) && val['/']) {
                        return {
                            '/': new CID(val['/']).toBaseEncodedString()
                        };
                    }
                    return val;
                }));
            }
            t.run(result, id);
        });
    }

    this.getFile = (multihash, t, id) => {
        if (!ipfs.isOnline()) {
            return t.error(new Error('IPFS Node is offline, cannot get file'));
        }
        ipfs.files.get(multihash, (err, stream) => {
            if (err) {
                return t.error(err);
            }
            stream.on('data', file => {
                if (!file.content) {
                    return t.error(new Error('No file content'));
                }
                const chunks = [];
                file.content.on('data', chunk => {
                    chunks.push(chunk)
                });
                file.content.once('end', () => {
                    t.run(Buffer.concat(chunks), id);
                });
                file.content.resume();
            });
            stream.resume();
        });
    }

    this.hashObject = (obj, t, id) => {
        dagCBOR.util.cid(obj, (err, cid) => {
            if (err) {
                return t.error(err);
            }
            t.run(cid.toBaseEncodedString(), id);
        });
    }

    this.contentUrl = (hash) => '/ipfs/' + hash;

    // https://github.com/ipfs/faq/issues/208
    this.hashFile = (data, t, id) => {
        const file = new Unixfs('file', data);
        dagPB.DAGNode.create(file.marshal(), (err, node) => {
            if (err) return t.error(err);
            t.run(node.toJSON().multihash, id);
        });
    }

    this.isFileHash = isIPFS.multihash;

    this.isObjectHash = (hash) => {
        try {
            const cid = new CID(hash);
            return cid.codec === 'dag-cbor' && cid.version === 1;
        } catch (err) {
            return false;
        }
    };

    this.expand = (obj, t, id) => {
        const expanded = order(obj);
        const paths = [];
        const vals = [];
        let count = 0,
            i, inner, keys, lastKey, x;
        traverse(obj, (path, val) => {
            if (path.substr(-1) === '/' && this.isObjectHash(val)) {
                paths.push(path);
                vals.push(val);
            }
        });
        if (!vals.length) {
            return t.run(expanded, id);
        }
        t.prepend((obj, i) => {
            vals[i] = obj;
            if (++count !== vals.length) return;
            count = 0;
            for (i = 0; i < vals.length; i++) {
                keys = paths[i].split('/').filter(key => !!key);
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
                    inner[lastKey] = [].concat(x, vals[i]);
                } else {
                    inner[lastKey] = vals[i];
                }
            }
            t.run(expanded, id);
        });
        t.prepend((obj, i) => {
            vals[i] = obj;
            if (++count !== vals.length) return;
            count = 0;
            t.next();
            for (i = 0; i < vals.length; i++) {
                this.expand(vals[i], t, i);
            }
        });
        for (i = 0; i < vals.length; i++) {
            this.get(vals[i], t, i);
        }
    }

    this.flatten = (obj, t, id) => {
        const paths = [];
        const vals = [];
        let count = 0,
            flattened = order(obj),
            i, inner, keys, lastKey, x;
        t.prepend(hash => {
            t.run({
                flattened,
                hash
            }, id);
        });
        traverse(obj, (path, val) => {
            if (isObject(val) && !paths.some(p => path !== p && path.includes(p))) {
                paths.push(path);
                vals.push(val);
            }
        });
        if (!vals.length) {
            return this.hashObject(flattened, t);
        }
        t.prepend((obj, i) => {
            vals[i] = obj;
            if (++count !== vals.length) return;
            count = 0;
            for (i = 0; i < vals.length; i++) {
                keys = vals[i].path.split('/');
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
                        '/': vals[i].hash
                    });
                } else {
                    inner[lastKey] = {
                        '/': vals[i].hash
                    };
                }
            }
            flattened = order(flattened);
            t.next();
            this.hashObject(flattened, t);
        });
        for (i = 0; i < vals.length; i++) {
            this.flatten(vals[i], t, i);
        }
    }

    const refreshPeers = () => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot refresh peers');
        }
        ipfs.swarm.peers().then(peers => {
            // console.log('Refreshed peers:', peers);
        });
    }

    this.start = (init, t, id) => {
        ipfs = new IPFS({
            init,
            repo,
            start: true,
            EXPERIMENTAL: {
                pubsub: true,
                sharding: true,
                dht: true
            },
            config: {
                Addresses: {
                    Swarm: [
                        '/libp2p-webrtc-star/dns4/star-signal.cloud.ipfs.team/wss'
                    ]
                }
            },
            libp2p: {
                modules: {
                    transport: [wstar],
                    discovery: [wstar.discovery]
                }
            }
        });
        ipfs.on('error', err => {
            t.error(err);
        });
        ipfs.on('init', () => {
            console.log('Finished initing the repo');
        });
        ipfs.on('ready', () => {
            t.run(console.log('IPFS Node is ready'));
        })
        ipfs.on('start', () => {
            intervalId = setInterval(refreshPeers, 3000);
        });
    }

    this.stop = (t) => {
        ipfs.stop(() => {
            clearInterval(intervalId);
            t.run(console.log('Stopped IPFS Node'));
        });
    }
}