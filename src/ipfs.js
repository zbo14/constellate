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
    isString,
    newArray,
    order,
    readFileAs,
    transform,
    traverse
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

    this.addFiles = (datas: Buffer[], paths: string[], t: Object, id?: number|string) => {
        if (!ipfs.isOnline()) {
          return t.error('IPFS Node is offline, cannot add file')
        }
        if (datas.length !== paths.length) {
          return t.error('different number of datas and paths')
        }
        ipfs.files.add(datas.map((data, i) => {
          return { content: data, path: paths[i] }
        }), (err, results) => {
          if (err) return t.error(err)
          t.run(results, id)
        })
    }

    this.addObjects = (objs: Object[], t: Object, id?: number|string) => {
        if (!ipfs.isOnline()) {
            return t.error('IPFS Node is offline, cannot add object')
        }
        t.task(cids => {
          const hashes = cids.map(cid => cid.toBaseEncodedString())
          t.next()
          t.run(hashes, id)
        })
        resolver.put(objs, newArray(dagCBOR.codec, objs.length), t)
    }

    this.get = (queries: string[], expand: boolean, t: Object, id?: number|string) => {
        if (!ipfs.isOnline()) {
          return t.error('IPFS Node is offline, cannot get')
        }
        const paths = new Array(queries.length)
        const vals = new Array(queries.length)
        let count = 0, i, parts
        for (i = 0; i < queries.length; i++) {
          parts = queries[i].split('/')
          try {
            vals[i] = new CID(parts.shift())
          } catch(err) {
            t.error(err)
          }
          paths[i] = parts.join('/')
        }
        t.task((val, i) => {
          vals[i] = val
          if (++count !== vals.length) return
          t.next()
          t.run(vals, id)
        })
        t.task(nodes => {
          t.next()
          if (expand) {
            for (i = 0; i < nodes.length; i++) {
              resolver.expand(nodes[i], t, i)
            }
            return
          }
          for (i = 0; i < nodes.length; i++) {
            if (isArray(nodes[i]) || isObject(nodes[i])) {
              nodes[i] = transform(nodes[i], v => {
                if (!isMerkleLink(v)) return v
                return {
                  '/': new CID(v['/']).toBaseEncodedString()
                }
              })
            }
            t.run(order(nodes[i]), i)
          }
        })
        resolver.get(vals, paths, t)
    }

    this.getFile = (query: string, t: Object, id?: number|string) => {
        if (!ipfs.isOnline()) {
            return t.error('IPFS Node is offline, cannot get file')
        }
        ipfs.files.get(query, (err, stream) => {
            if (err) {
              return t.error(err)
            }
            stream.on('data', file => {
                if (!file.content) {
                    return t.error('No file content')
                }
                const chunks = []
                file.content.on('data', chunk => {
                    chunks.push(chunk)
                })
                file.content.once('end', () => {
                  t.run(Buffer.concat(chunks), id)
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
    this.hashFile = (data: Buffer, t: Object, id?: number|string) => {
        const file = new Unixfs('file', data)
        DAGNode.create(file.marshal(), (err, node) => {
            if (err) return t.error(err)
            t.run(node.toJSON().multihash, id)
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

    this.start = (repo: Object|string, t: Object, id?: number|string) => {

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
          t.error(err)
      })

      ipfs.on('ready', () => {
          intervalId = setInterval(refreshPeers, 3000)
          resolver = new Resolver(ipfs._blockService)
          resolver.addSupport(dagCBOR)
          console.log('IPFS Node is ready')
          t.run(id)
      })
    }

    this.stop = (t: Object, id?: number|string) => {
        ipfs.stop(() => {
            clearInterval(intervalId)
            console.log('Stopped IPFS Node')
            t.run(id)
        })
    }
}
