'use strict';

const CID = require('cids');
const dagCBOR = require('ipld-dag-cbor');
const dagPB = require('ipld-dag-pb');
const IPFS = require('ipfs');
const isIPFS = require('is-ipfs');
const Unixfs = require('ipfs-unixfs');
const wrtc = require('wrtc');
const WStar = require('libp2p-webrtc-star');
require('setimmediate');

const {
  cloneObject,
  isArray,
  isObject,
  isString,
  order,
  transform,
  traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/ipfs
 */

 function _expand(get: Function): Function {
   return (obj: Object): Promise<Object> => {
     return new Promise((resolve, reject) => {
       const promises = [];
       traverse(obj, (path, val) => {
         if (path.substr(-1) !== '/' || !isObjectHash(val)) return;
         promises.push(
           get(val).then(obj => {
             return _expand(get)(obj);
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
         resolve(order(expanded));
       });
     });
   }
 }

 function _flatten(addObject: Function): Function {
   return (obj: Object): Promise<Object> => {
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
         return addObject(order(obj)).then(hash => {
           flattened = order(flattened);
           resolve({ flattened, hash });
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
         flattened = order(flattened);
         addObject(flattened).then(hash => {
           resolve({ flattened, hash });
         });
       });
     });
   }
 }

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

const wstar = new WStar({ wrtc });

module.exports = function() {
   const ipfs = new IPFS({
     init: true,
     repo: '/tmp/' + new Date().toString(),
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
   const addObject = _addObject(ipfs);
   const get = _get(ipfs);
   this.addFile = _addFile(ipfs);
   this.addObject = addObject;
   this.contentUrl = (hash: string): string => '/ipfs/' + hash;
   this.expand = _expand(get);
   this.flatten = _flatten(addObject);
   this.get = get;
   this.getFile = _getFile(ipfs);
   this.info = ipfs.id;
   this.hashObject = (obj: Object): Promise<string> => {
     return new Promise((resolve, reject) => {
       dagCBOR.util.cid(obj, (err, cid) => {
         if (err) return reject(err);
         resolve(cid.toBaseEncodedString());
       });
     });
   }
   this.hashFile = multihash;
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

function isObjectHash(hash: string): boolean {
  try {
    const cid = new CID(hash);
    return cid.codec === 'dag-cbor' && cid.version === 1;
  } catch(err) {
    return false;
  }
}

// https://github.com/ipfs/faq/issues/208
function multihash(data: Buffer): Promise<string> {
   return new Promise((resolve, reject) => {
     const file = new Unixfs('file', data);
     dagPB.DAGNode.create(file.marshal(), (err, node) => {
       if (err) return reject(err);
       resolve(node.toJSON().multihash);
     });
   });
}

function _addFile(ipfs: Object): Function {
  return (data: Buffer|ReadableStream): Promise<string> => {
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

function _addObject(ipfs: Object): Function {
  return (obj: Object): Promise<string> => {
    if (!ipfs.isOnline()) {
      throw new Error('IPFS Node is offline, cannot add object');
    }
    return ipfs.dag.put(order(obj), {
      format: 'dag-cbor',
      hashAlg: 'sha2-256'
    }).then(cid => {
      return cid.toBaseEncodedString()
    });
  }
}

function _getFile(ipfs: Object): Function {
  return (multihash: string): Promise<Buffer> => {
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

function _get(ipfs: Object): Function {
  return (path: string): Promise<Object> => {
    if (!ipfs.isOnline()) {
      throw new Error('IPFS Node is offline, cannot get');
    }
    return new Promise((resolve, reject) => {
      ipfs.dag.get(path, (err, node) => {
        if (err) return reject(err);
        let result = node.value;
        if (isArray(result) || isObject(result)) {
          result = order(transform(result, (val, key) => {
            if (key === '/') {
              return new CID(val).toBaseEncodedString();
            }
            if (isObject(val) && val['/']) {
              return { '/': new CID(val['/']).toBaseEncodedString() };
            }
            return val;
          }));
        }
        resolve(result);
      });
    });
  }
}

function _refreshPeers(ipfs: Object): Function {
  return () => {
    if (!ipfs.isOnline()) {
      throw new Error('IPFS Node is offline, cannot refresh peers');
    }
    ipfs.swarm.peers().then(peers => {
      console.log('Refreshed peers:', peers);
    });
  }
}
