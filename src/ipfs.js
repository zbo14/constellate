'use strict'

const CID = require('cids')
const { DAGNode } = require('ipld-dag-pb')
const IPFS = require('ipfs')
const isIPFS = require('is-ipfs')
const Repo = require('ipfs-repo')
const Resolver = require('../lib/resolver.js')
const Unixfs = require('ipfs-unixfs')
const wrtc = require('wrtc')
const WStar = require('libp2p-webrtc-star')

const dagCBOR = require('../lib/dag-cbor')

const {
    isArray,
    isMerkleLink,
    isObject,
    order,
    transform
} = require('../lib/util.js')

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

const wstar = new WStar({
    wrtc
})

module.exports = function() {

    let intervalId, ipfs, resolver

    this.addFile = (content: Buffer, path: string, tasks: Object, t: number, i?: number) => {
        if (!ipfs.isOnline()) {
          return tasks.error('IPFS Node is offline, cannot add file')
        }
        ipfs.files.add({ content, path }), (err, results) => {
          if (err) return tasks.error(err)
          tasks.run(t, results[0].hash, i)
        })
    }

    this.addObject = (obj: Object, tasks: Object, t: number, i?: number) => {
        if (!ipfs.isOnline()) {
            return tasks.error('IPFS Node is offline, cannot add object')
        }
        resolver.put(obj, dagCBOR.codec, tasks, t, i)
    }

    this.get = (query: string, expand: boolean, tasks: Object, t: number, i?: number) => {
        if (!ipfs.isOnline()) {
          return tasks.error('IPFS Node is offline, cannot get')
        }
        const parts = query.split('/')
        let cid
        try {
          cid = new CID(parts.shift())
        } catch(err) {
          tasks.error(err)
        }
        const t1 = tasks.add(val => {
          if (expand) {
            return resolver.expand(val, tasks, t, i)
          }
          if (isArray(val) || isObject(val)) {
            val = transform(val, v => {
              if (!isMerkleLink(v)) return v
              return {
                '/': new CID(v['/']).toBaseEncodedString()
              }
            })
          }
          tasks.run(t, order(val), i)
        })
        resolver.get(cid, parts.join('/'), tasks, t1)
    }

    this.getFile = (query: string, tasks: Object, t: number, i?: number) => {
        if (!ipfs.isOnline()) {
            return tasks.error('IPFS Node is offline, cannot get file')
        }
        ipfs.files.get(query, (err, stream) => {
            if (err) {
              return tasks.error(err)
            }
            stream.on('data', file => {
                if (!file.content) {
                    return tasks.error('No file content')
                }
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

    this.hashObject = dagCBOR.hash;

    this.contentUrl = (hash: string, path?: string): string => {
      let str = '/ipfs/' + hash
      if (path) str += '/' + path
      return str
    }

    // https://github.com/ipfs/faq/issues/208
    this.hashFile = (data: Buffer, tasks: Object, t: number, i?: number) => {
        const file = new Unixfs('file', data)
        DAGNode.create(file.marshal(), (err, node) => {
            if (err) return tasks.error(err)
            tasks.run(t, node.toJSON().multihash, i)
        })
    }

    this.isFileHash = isIPFS.multihash

    this.isObjectHash = (hash: string): boolean => {
        try {
            const cid = new CID(hash)
            return cid.codec === dagCBOR.codec && cid.version === dagCBOR.version
        } catch (err) {
            return false
        }
    }

    const refreshPeers = () => {
        if (!ipfs.isOnline()) {
            throw new Error('IPFS Node is offline, cannot refresh peers')
        }
        ipfs.swarm.peers().then(peers => {
            // console.log('Refreshed peers:', peers)
        })
    }

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
          intervalId = setInterval(refreshPeers, 3000)
          resolver = new Resolver(ipfs._blockService)
          resolver.addSupport(dagCBOR)
          console.log('IPFS Node is ready')
          tasks.run(t, i)
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
