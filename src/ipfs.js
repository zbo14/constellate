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

  const send = moduleConfig(addr)

  this.get = (cid: Object, cb: Function) => {
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
    send.andTransform(request, transform, cb)
  }

  this.put = (data: Buffer, cb: Function) => {
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
    send.andTransform(request, transform, cb)
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

Ipfs.ContentService = function (addr: string) {

  const maddr = multiaddr(addr)
  const host = maddr.nodeAddress().address
  const port = maddr.nodeAddress().port

  const filesAPI = FilesAPI(addr)

  this.pathToIRI = (path: string): string => {
    return `http://${host}:${port}/api/v0/get?arg=` + path
  }

  this.isValidHash = isIpfs.multihash

  this.hash = (content: Buffer, tasks: Object, t: number, i?: number) => {
    const file = new UnixFS('file', content)
    DAGNode.create(file.marshal(), (err, dagNode) => {
      if (err) {
        return tasks.error(err)
      }
      const mh = dagNode.toJSON().multihash
      tasks.run(t, mh, i)
    })
  }

  this.get = (path: string, tasks: Object, t: number, i?: number) => {
    filesAPI.get(path, (err, stream) => {
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

  this.put = (contents: Buffer[], tasks: Object, t: number, i?: number) => {
    filesAPI.add(contents, (err, results) => {
      if (err) {
        return tasks.error(err)
      }
      const hashes = results.map(result => result.hash)
      tasks.run(t, hashes, i)
    })
  }
}

Ipfs.MetadataService = function (addr: string) {

  const maddr = multiaddr(addr)
  const host = maddr.nodeAddress().address
  const port = maddr.nodeAddress().port

  const blockAPI = new BlockAPI(addr)

  this.pathToIRI = (path: string): string => {
    return `http://${host}:${port}/api/v0/dag/get?arg=` + path
  }

  this.pathToCID = (path: string): Object => {
    const parts = path.split('/')
    const cid = new CID(parts.shift())
    const remPath = parts.join('/')
    return { cid, remPath }
  }

  this.hash = (elem: Object, tasks: Object, t: number, i?: number) => {
    if (!isElement(elem)) {
      return tasks.error(errInvalidElement(elem))
    }
    const t1 = tasks.add(cid => {
      tasks.run(t, cid.toBaseEncodedString(), i)
    })
    dagCBOR.cid(elem.data, tasks, t1)
  }

  this.isValidCID = (cid: Object): boolean => {
    return cid.codec === dagCBOR.codec && cid.version === dagCBOR.version
  }

  this.toElement = (data: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (path) {
      tasks.run(t, order(data), i)
    } else {
      tasks.run(t, { data }, i)
    }
  }

  this.isValidHash = (hash: string): boolean => {
    try {
      const cid = new CID(hash)
      return this.isValidCID(cid)
    } catch (err) {
      return false
    }
  }

  this.hashFromCID = (cid: Object): string => {
    if (!this.isValidCID) {
      throw errUnexpectedCID(cid)
    }
    return cid.toBaseEncodedString()
  }

  this.resolve = (obj: Object, path: string, tasks: Object, t: number, i?: number) => {
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

  this.get = (cid: Object, tasks: Object, t: number, i?: number) => {
    if (!this.isValidCID(cid)) {
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
    blockAPI.get(cid, (err, block) => {
      if (err) {
        return tasks.error(err)
      }
      dagCBOR.deserialize(block.data, tasks, t1)
    })
  }

  this.put = (elem: Object, tasks: Object, t: number, i?: number) => {
    if (!isElement(elem)) {
      return tasks.error(errInvalidElement(elem))
    }
    const t1 = tasks.add(data => {
      blockAPI.put(data, (err, block) => {
        if (err) {
          return tasks.error(err)
        }
        tasks.run(t, block.cid, i)
      })
    })
    dagCBOR.serialize(elem.data, tasks, t1)
  }
}

Ipfs.Node = function() {

    let intervalId, ipfs

    this.start = (repo: Object|string, tasks: Object, t: number, i?: number) => {

      ipfs = new IPFS({
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

      ipfs.on('error', err => {
        tasks.error(err)
      })

      ipfs.on('ready', () => {
        intervalId = setInterval(ipfs.swarm.peers, 3000)
        console.log('IPFS Node is ready')
        tasks.run(t, ipfs, i)
      })
    }

    this.stop = (tasks: Object, t: number, i?: number) => {
      ipfs.stop(() => {
        clearInterval(intervalId)
        console.log('Stopped IPFS Node')
        tasks.run(t, i)
      })
    }
}

module.exports = Ipfs
