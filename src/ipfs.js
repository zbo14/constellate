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
  Emitter,
  Tasks,
  StateMachine
} = require('../lib/event.js');

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

 function _flatten(addObject: Function): Function {
   return (obj: Object) => {
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

module.exports = function(out?: Object) {
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
   this.addFile = (data: Buffer|ReadableStream, out: Object = out) => {
     if (!ipfs.isOnline()) {
       return out.error(new Error('IPFS Node is offline, cannot add file'));
     }
     ipfs.files.add({
       content: data,
       path: ''
     }, (err, result) => {
       if (err) {
         return out.error(err);
       }
       out.next(result[0].hash);
     });
   }
   this.addObject = (obj: Object, out: Object = out) => {
     if (!ipfs.isOnline()) {
       return out.error(new Error('IPFS Node is offline, cannot add object'));
     }
     ipfs.dag.put(order(obj), {
       format: 'dag-cbor',
       hashAlg: 'sha2-256'
     }, (err, cid) => {
       if (err) {
         return out.error(err);
       }
       out.next(cid.toBaseEncodedString());
     });
   }
   this.get = (path: string, out: Object = out) => {
     if (!ipfs.isOnline()) {
       return out.error(new Error('IPFS Node is offline, cannot get'));
     }
     ipfs.dag.get(path, (err, node) => {
       if (err) {
         return out.error(err);
       }
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
       out.next(result);
     });
   }
   this.getFile = (multihash: string) => {
     if (!ipfs.isOnline()) {
       return out.error(new Error('IPFS Node is offline, cannot get file'));
     }
     ipfs.files.get(multihash, (err, stream) => {
       if (err) {
         return out.error(err);
       }
       stream.on('data', file => {
         if (!file.content) {
           return out.error(new Error('No file content'));
         }
         const chunks = [];
         file.content.on('data', chunk => {
           chunks.push(chunk)
         });
         file.content.once('end', () => {
           out.next(Buffer.concat(chunks));
         });
         file.content.resume();
       });
       stream.resume();
     });
   }
   this.hashObject = (obj: Object) => {
     dagCBOR.util.cid(obj, (err, cid) => {
       if (err) {
         return out.error(err);
       }
       out.next(cid.toBaseEncodedString());
     });
   }
   this.contentUrl = (hash: string): string => '/ipfs/' + hash;
   // https://github.com/ipfs/faq/issues/208
   this.hashFile = (data: Buffer) => {
      const file = new Unixfs('file', data);
      dagPB.DAGNode.create(file.marshal(), (err, node) => {
        if (err) return ee.emit('error', err);
        out.next(node.toJSON().multihash);
      });
   }
   this.isFileHash = isIPFS.multihash;
   this.isObjectHash = (hash: string): boolean => {
     try {
       const cid = new CID(hash);
       return cid.codec === 'dag-cbor' && cid.version === 1;
     } catch(err) {
       return false;
     }
   };

   // Traverse Object
   //

   const resolveLinks = (obj: Object, out: Object = out) => {
     const fns = [];
     const paths = [];
     traverse(obj, (path, val) => {
       if (path.substr(-1) !== '/' || !isObjectHash(val)) return;
       fns.push(task => this.get(val, task));
       paths.push(path);
     });
     const tasks = new Tasks(results => {
       out.next()
     });
   }

   this.expand = (obj: Object, out: Object = out) => {
     const fns = [];
     const paths = [];
     traverse(obj, (path, val) => {
       if (path.substr(-1) !== '/' || !isObjectHash(val)) return;
       fns.push(task => this.get(val, task));
       paths.push(path);
     });
     let onEnd, task, tasks;
     task = new Task()
     onEnd = results => {

     }
     tasks = new Tasks(onEnd);
     tasks.run(fns);

     const expanded = assign(obj);
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
   }

   this.flatten = _flatten(addObject);


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
