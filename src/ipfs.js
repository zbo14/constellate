/*

Adatped from..
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
const isIPFS = require('is-ipfs');
const fileType = require('file-type');
const os = require('os');
const path = require('path');
const Unixfs = require('ipfs-unixfs');
const dagCBOR = require('ipld-dag-cbor');
const { DAGLink, DAGNode } = require('ipld-dag-pb');
const { decodeBase58 } = require('../lib/util.js');

const {
  encodeBase58,
  isObject,
  orderStringify,
  readFileInput,
  traverse,
  withoutKeys
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/ipfs
*/

let node;

function addFile(data: Buffer|ReadableStream, path: string): Promise<Object> {
  return node.files.add({
    content: data,
    path: path
  }).then((result) => {
    return result[0];
  });
}

function addFileInput(fileInput: HTMLInputElement): Promise<Object> {
  return readFileInput(fileInput).then((ab) => {
    const buf = Buffer.from(ab);
    const path = fileInput.files[0].name;
    return addFile(buf, path);
  });
}

// https://github.com/ipfs/faq/issues/208
// https://github.com/ipfs/js-ipfs-unixfs#create-an-unixfs-data-element
function calcHash(obj: Object, format: string): Promise<string> {
  obj = JSON.parse(orderStringify(obj));
  return new Promise((resolve, reject) => {
    if (format === 'dag-cbor') {
      dagCBOR.util.cid(obj, (err, cid) => {
        if (err) return reject(err);
        resolve(cid.toBaseEncodedString());
      });
    } else if (format === 'dag-pb') {
      const buf = Buffer.from(JSON.stringify(obj));
      DAGNode.create(buf, (err, dagNode) => {
        if (err) return reject(err);
        resolve(encodeBase58(dagNode._multihash));
      });
    } else {
      reject(new Error('unexpected format: ' + format));
    }
  })
}

function connectToPeer(multiaddr: string) {
  node.swarm.connect(multiaddr).then(() => {
    console.log('Connected to peer:', multiaddr);
  });
}

function deserializeCBOR(serialized: Buffer): Promise<Object> {
  return new Promise((resolve, reject) => {
    dagCBOR.util.deserialize(serialized, (err, deserialized) => {
      if (err) return reject(err);
      resolve(deserialized);
    })
  })
}

function getDAGNode(cid: Object|string, format: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    node.dag.get(cid, (err, dagNode) => {
      if (err) return reject(err);
      let obj;
      if (format === 'dag-cbor') {
        obj = traverse(dagNode.value, (val, key) => {
          if (key === '/') {
            return new CID(val).toBaseEncodedString();
          }
          if (isObject(val) && val['/']) {
            return { '/': new CID(val['/']).toBaseEncodedString() };
          }
          return val;
        });
      } else if (format === 'dag-pb') {
        obj = JSON.parse(Buffer.from(dagNode.value._data).toString('utf8'));
      } else {
        return reject(new Error('unexpected format: ' + format));
      }
      resolve(obj);
    });
  });
}

function getFile(multihash: string): Promise<HTMLAnchorElement> {
  return new Promise((resolve, reject) => {
    node.files.get(multihash).then((stream) => {
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

function isMultihash(multihash: string): boolean {
  return isIPFS.multihash(multihash);
}

function newBlobURL(data: any[], ext: string, multihash: string): HTMLAnchorElement {
  const blob = new Blob(data, {type: 'application/octet-binary'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.setAttribute('href', url);
  a.setAttribute('download', multihash + '.' + ext);
  const date = (new Date()).toLocaleString();
  a.innerText = date + '-' + multihash + '- Size: ' + blob.size;
  return a;
}

function serializeCBOR(obj: Object): Promise<Object> {
  return new Promise((resolve, reject) => {
    dagCBOR.util.serialize(obj, (err, serialized) => {
      if (err) return reject(err);
      resolve(serialized);
    });
  });
}

function newPBLinks(links: Object[]): Promise<Object[]> {
    return links.reduce((result, link) => {
        return result.then((dagLinks) => {
            return getDAGNode(link.multihash).then((dagNode) => {
                return dagLinks.concat(
                  new DAGLink(link.name, dagNode.value._size, link.multihash)
                );
            });
        });
    }, Promise.resolve([]));
}

function newPBNode(obj: Object, links?: Object[]): Promise<Object> {
  return new Promise((resolve, reject) => {
    const buf = Buffer.from(orderStringify(obj));
    if (!links || !links.length) {
      return DAGNode.create(buf, (err, node) => {
        if (err) return reject(err)
        resolve(node);
      });
    }
    return newPBLinks(links).then((dagLinks) => {
      return DAGNode.create(buf, dagLinks, (err, node) => {
        if (err) return reject(err);
        resolve(node);
      });
    });
  });
}

function putDAGNode(obj: Object, format: string): Promise<string> {
  return node.dag.put(obj, {
    format: format,
    hashAlg: 'sha2-256'
  });
}

function refreshPeers() {
  return node.swarm.peers();
  // node.swarm.peers().then((peers) => {
  //    console.log('Refreshed peers:', peers);
  // });
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
exports.addFileInput = addFileInput;
exports.calcHash = calcHash;
exports.connectToPeer = connectToPeer;
exports.deserializeCBOR = deserializeCBOR;
exports.getDAGNode = getDAGNode;
exports.getFile = getFile;
exports.isMultihash = isMultihash;
exports.newPBLinks = newPBLinks;
exports.newPBNode = newPBNode;
exports.putDAGNode = putDAGNode;
exports.serializeCBOR = serializeCBOR;
exports.startPeer = startPeer;
