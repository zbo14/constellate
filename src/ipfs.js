'use strict'

const Block = require('ipfs-block')
const CID = require('cids')
const dagCBOR = require('../lib/dag-cbor')
const DAGNode = require('ipld-dag-pb').DAGNode
const FilesAPI = require('ipfs-api/src/files')
const IPFS = require('ipfs')
const isIpfs = require('is-ipfs')
const moduleConfig = require('ipfs-api/src/utils/module-config')
const Repo = require('ipfs-repo')
const streamToValue = require('ipfs-api/src/utils/stream-to-value')
const UnixFS = require('ipfs-unixfs')
const multiaddr = require('multiaddr')
// const wrtc = require('wrtc')
// const WStar = require('libp2p-webrtc-star')

const {
    errInvalidElement,
    errPathNotFound,
    errUnexpectedCID,
    isArray,
    isElement,
    isMerkleLink,
    isObject,
    order,
    transform
} = require('../lib/util')

// @flow

/**
 * @module constellate/src/ipfs
 */

/*

The following code is adapted from..
  > https://github.com/ipfs/js-ipfs-api/tree/master/src/block

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2016 Protocol Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

function BlockAPI(addr: string) {
  this._send = moduleConfig(addr)
}

BlockAPI.prototype.get = function (cid: Object, cb: Function) {
  const request = {
    path: 'block/get',
    args: cid.toBaseEncodedString()
  }
  const transform = (response, cb) => {
    if (Buffer.isBuffer(response)) {
      cb(null, new Block(response, cid))
    } else {
      streamToValue(response, (err, data) => {
        if (err) {
          return cb(err)
        }
        cb(null, new Block(data, cid))
      })
    }
  }
  this._send.andTransform(request, transform, cb)
}

BlockAPI.prototype.put = function (data: Buffer, cb: Function) {
  const request = {
    path: 'block/put',
    files: data,
    qs: {
      format: 'cbor'
    }
  }
  const transform = (info, cb) => {
    cb(null, new Block(data, new CID(info.Key)))
  }
  this._send.andTransform(request, transform, cb)
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

// const wstar = new WStar({ wrtc })

const Ipfs = {}

function ContentService (addr: string) {
  const maddr = multiaddr(addr)
  this.host = maddr.nodeAddress().address
  this.port = maddr.nodeAddress().port
  this._files = FilesAPI(addr)
}

ContentService.prototype.pathToURL = function (path: string): string {
  return `http://${this.host}:${this.port}/api/v0/get?arg=` + path
}

// ContentService.prototype.isValidHash = isIpfs.multihash

ContentService.prototype.hash = function (content: Buffer, tasks: Object, t: number, i?: number) {
  const file = new UnixFS('file', content)
  DAGNode.create(file.marshal(), (err, dagNode) => {
    if (err) {
      return tasks.error(err)
    }
    const mh = dagNode.toJSON().multihash
    tasks.run(t, mh, i)
  })
}

ContentService.prototype.get = function (path: string, tasks: Object, t: number, i?: number) {
  this._files.get(path, (err, stream) => {
    if (err) {
      return tasks.error(err)
    }
    stream.on('data', file => {
      const chunks = []
      file.content.on('data', chunk => {
        chunks.push(chunk)
      })
      file.content.once('end', () => {
        tasks.run(t, Buffer.concat(chunks), i)
      })
      file.content.resume()
    })
    stream.resume()
  })
}

ContentService.prototype.put = function (contents: Buffer[], tasks: Object, t: number, i?: number) {
  this._files.add(contents, (err, results) => {
    if (err) {
      return tasks.error(err)
    }
    const hashes = results.map(result => result.hash)
    tasks.run(t, hashes, i)
  })
}

function MetadataService (addr: string) {
  const maddr = multiaddr(addr)
  this.host = maddr.nodeAddress().address
  this.port = maddr.nodeAddress().port

  this._blocks = new BlockAPI(addr)
}

const isValidCID = (cid: Object): boolean => {
  return cid.codec === dagCBOR.codec && cid.version === dagCBOR.version
}

MetadataService.prototype.pathToURL = function (path: string): string {
  return `http://${this.host}:${this.port}/api/v0/dag/get?arg=` + path
}

MetadataService.prototype.pathToCID = (path: string): Object => {
  const parts = path.split('/')
  const cid = new CID(parts.shift())
  const remPath = parts.join('/')
  return { cid, remPath }
}

MetadataService.prototype.hash = (elem: Object, tasks: Object, t: number, i?: number) => {
  if (!isElement(elem)) {
    return tasks.error(errInvalidElement(elem))
  }
  const t1 = tasks.add(cid => {
    tasks.run(t, cid.toBaseEncodedString(), i)
  })
  dagCBOR.cid(elem.data, tasks, t1)
}

MetadataService.prototype.toElement = (data: Object, path: string, tasks: Object, t: number, i?: number) => {
  if (path) {
    tasks.run(t, order(data), i)
  } else {
    tasks.run(t, { data }, i)
  }
}

/*

MetadataService.prototype.isValidHash = (hash: string): boolean => {
  try {
    const cid = new CID(hash)
    return this.isValidCID(cid)
  } catch (err) {
    return false
  }
}

*/

MetadataService.prototype.hashFromCID = function (cid: Object): string {
  if (!isValidCID(cid)) {
    throw errUnexpectedCID(cid)
  }
  return cid.toBaseEncodedString()
}

MetadataService.prototype.resolve = (obj: Object, path: string, tasks: Object, t: number, i?: number) => {
  if (!path || path === '/') {
    return tasks.run(t, obj, '', i)
  }
  const parts = path.split('/')
  const first = parts.shift()
  switch (first) {
    case 'data':
      return dagCBOR.resolve(obj, parts.join('/'), tasks, t, i)
    case 'sender':
      return tasks.run(t, null, '', i)
    case 'recipient':
      return tasks.run(t, null, '', i)
    default:
      tasks.error(errPathNotFound(path))
  }
}

MetadataService.prototype.get = function (cid: Object, tasks: Object, t: number, i?: number) {
  if (!isValidCID(cid)) {
    return tasks.error(errUnexpectedCID(cid))
  }
  const t1 = tasks.add(obj => {
    obj = order(transform(obj, val => {
      if (!isMerkleLink(val)) {
        return val
      }
      cid = new CID(val['/'])
      return {
        '/': this.hashFromCID(cid) + '/data'
      }
    }))
    tasks.run(t, obj, i)
  })
  this._blocks.get(cid, (err, block) => {
    if (err) {
      return tasks.error(err)
    }
    dagCBOR.deserialize(block.data, tasks, t1)
  })
}

MetadataService.prototype.put = function (elem: Object, tasks: Object, t: number, i?: number) {
  if (!isElement(elem)) {
    return tasks.error(errInvalidElement(elem))
  }
  const t1 = tasks.add(data => {
    this._blocks.put(data, (err, block) => {
      if (err) {
        return tasks.error(err)
      }
      tasks.run(t, block.cid, i)
    })
  })
  dagCBOR.serialize(elem.data, tasks, t1)
}

function Node() {}

Node.prototype.start = function (repo: Object|string, tasks: Object, t: number, i?: number) {
  this._ipfs = new IPFS({
    init: true,
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
    }
    // libp2p: {
    //  modules: {
    //    transport: [wstar],
    //    discovery: [wstar.discovery]
    //  }
    // }
  })

  this._ipfs.on('error', err => {
    tasks.error(err)
  })

  this._ipfs.on('ready', () => {
    this._intervalId = setInterval(this._ipfs.swarm.peers, 3000)
    console.log('IPFS Node is ready')
    tasks.run(t, this._ipfs, i)
  })
}

Node.prototype.stop = function (tasks: Object, t: number, i?: number) {
  this._ipfs.stop(() => {
    clearInterval(this._intervalId)
    console.log('Stopped IPFS Node')
    tasks.run(t, i)
  })
}

module.exports = {
  ContentService,
  MetadataService,
  Node
}
