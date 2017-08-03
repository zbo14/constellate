'use strict'

const Block = require('ipfs-block')
const CID = require('cids')
const dagCBOR = require('../lib/dag-cbor')
const DAGNode = require('ipld-dag-pb').DAGNode
const IPFS = require('ipfs')
const isIpfs = require('is-ipfs')
const Repo = require('ipfs-repo')
const UnixFS = require('ipfs-unixfs')
const wrtc = require('wrtc')
const WStar = require('libp2p-webrtc-star')

const {
    isArray,
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

const wstar = new WStar({ wrtc })

const Ipfs = {}

Ipfs.ContentService = function (files: Object) {

  this.name = 'ipfs-content-service'

  this.pathToIRI = (path: string): string => {
    return '/ipfs/' + path
  }

  this.isValidHash = isIpfs.multihash

  this.hash = (node: Object, tasks: Object, t: number, i?: number) => {
    const file = new UnixFS('file', node.content)
    DAGNode.create(file.marshal(), (err, dagNode) => {
      if (err) {
        return tasks.error(err)
      }
      const mh = dagNode.toJSON().multihash
      tasks.run(t, mh, i)
    })
  }

  this.get = (path: string, tasks: Object, t: number, i?: number) => {
    files.get(path, (err, stream) => {
      if (err) {
        return tasks.error(err)
      }
      stream.on('data', node => {
        const chunks = []
        node.content.on('data', chunk => {
          chunks.push(chunk)
        })
        node.content.once('end', () => {
          node.content = Buffer.concat(chunks)
          tasks.run(t, node, i)
        })
        node.content.resume()
      })
      stream.resume()
    })
  }

  this.put = (node: Object, tasks: Object, t: number, i?: number) => {
    files.add(node, (err, results) => {
      if (err) {
        return tasks.error(err)
      }
      tasks.run(t, results[0].hash, i)
    })
  }
}

Ipfs.MetadataService = function (blockService: Object) {

  this.name = 'ipfs-metadata-service'

  this.pathToIRI = (path: string): string => {
    return '/ipfs/dag/' + path
  }

  this.pathToCID = (path: string): Object => {
    const parts = path.split('/')
    const cid = new CID(parts.shift())
    const remPath = parts.join('/')
    return { cid, remPath }
  }

  this.hash = (node: Object, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add(cid => {
      tasks.run(t, cid.toBaseEncodedString(), i)
    })
    dagCBOR.cid(node.data, tasks, t1)
  }

  this.isValidHash = (hash: string): boolean => {
    try {
      const cid = new CID(hash)
      return cid.codec === dagCBOR.codec && cid.version === dagCBOR.version
    } catch (err) {
      return false
    }
  }

  this.resolve = dagCBOR.resolve

  this.get = (cid: Object, tasks: Object, t: number, i?: number) => {
    if (cid.codec !== dagCBOR.codec) {
      return tasks.error(`expected codec="${dagCBOR.codec}", got "${cid.codec}"`)
    }
    if (cid.version !== dagCBOR.version) {
      return tasks.error(`expected version=${dagCBOR.version}, got ${cid.version}`)
    }
    const t1 = tasks.add(obj => {
      obj = order(transform(obj, val => {
        if (!isMerkleLink(val)) {
          return val
        }
        return {
          '/': new CID(val['/']).toBaseEncodedString()
        }
      }))
      tasks.run(t, obj, i)
    })
    blockService.get(cid, (err, block) => {
      if (err) return tasks.error(err)
      dagCBOR.deserialize(block.data, tasks, t1)
    })
  }

  this.put = (node: Object, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add((cid, data) => {
      blockService.put(new Block(data, cid), err => {
        if (err) {
          return tasks.error(err)
        }
        tasks.run(t, cid, i)
      })
    })
    dagCBOR.cid(node.data, tasks, t1)
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
        },
        libp2p: {
          modules: {
            transport: [wstar],
            discovery: [wstar.discovery]
          }
        }
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
