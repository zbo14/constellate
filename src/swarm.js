'use strict'

const CID = require('cids')
const Keccak = require('keccakjs')
const multihash = require('multihashes')
const request = require('xhr-request')

// @flow

/**
 * @module/constellate/src/swarm
 */

  /*

  The following code is from https://github.com/axic/swarmhash/blob/master/index.js

  -------------------------------- LICENSE --------------------------------

  The MIT License (MIT)

  Copyright (c) 2016 Alex Beregszaszi

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

  const hashChunk = (chunk: Buffer, size: number, tasks: Object, t: number, i?: number) => {
    const hash = new Keccak(256)
    const tmp = Buffer.alloc(8)
    tmp.writeUIntLE(size, 0, 6)
    hash.update(tmp)
    hash.update(chunk)
    tasks.run(t, Buffer.from(hash.digest(), 'binary'), i)
  }

 /*

 The following code is adapted from https://github.com/ethereum/go-ethereum/blob/master/swarm/storage/chunker.go

 ---------------------------- LICENSE ----------------------------
 Copyright 2016 The go-ethereum Authors
 This file is part of the go-ethereum library.

 The go-ethereum library is free software: you can redistribute it and/or modify
 it under the terms of the GNU Lesser General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 The go-ethereum library is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 GNU Lesser General Public License for more details.

 You should have received a copy of the GNU Lesser General Public License
 along with the go-ethereum library. If not, see <http:www.gnu.org/licenses/>.

 */

const swarmHash = (data: Buffer, tasks: Object, t: number, i?: number) => {
   let depth = 0, treeSize
   for (treeSize = 4096; treeSize < data.length; treeSize *= 128) depth++
   split(data, depth, data.length, treeSize/128, tasks, t, i)
 }

 const split = (chunk: Buffer, depth: number, size: number, treeSize: number, tasks: Object, t: number, i?: number) => {
   while (depth && size < treeSize) {
     treeSize /= 128
     depth--
   }
   if (!depth) {
     return hashChunk(chunk, size, tasks, t, i)
   }
   let chunks, count, secSize
   const t1 = tasks.add((chunk, j) => {
     chunks[j] = chunk
     if (--count) return
     hashChunk(Buffer.concat(chunks), tasks, t, i)
   })
   count = Math.round(treeSize/size)
   if (treeSize % size) {
     count++
   }
   chunks = new Array(count)
   for (let j = 0; j < chunks.length; j++) {
     if (size - j < treeSize) {
       secSize = size - j
     } else {
       secSize = treeSize
     }
     split(chunk.slice(j, j+secSize), depth-1, secSize, treeSize/128, tasks, t1, j)
   }
 }


/*

The following code is adapted from https://github.com/axic/swarmgw/blob/master/index.js

-------------------------------- LICENSE --------------------------------

The MIT License (MIT)

Copyright (c) 2016 Alex Beregszaszi

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

const Swarm = {}

const codec = 'swarm'
const version = 1

Swarm.Util = {

  codec,

  version,

  cid: (node: Buffer, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add(data => {
      try {
        const mh = multihash.encode(data, 'keccak-256')
        const cid = new CID(version, codec, mh)
        tasks.run(t, cid, i)
      } catch(err) {
        tasks.error(err)
      }
    })
    swarmHash(node, tasks, t1)
  }
}

Swarm.ContentService = function (url: string = 'http://swarm-gateways.net/') {
  this.name = 'swarm-content-service'
  this.hash = (node: Object, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add(cid => {
      tasks.run(t, cid.toBaseEncodedString(), i)
    })
    Swarm.util.cid(node, tasks, t1)
  }
  this.isValidHash = (hash: string): boolean => {
    return /^[a-f0-9]{64}$/.test(hash)
  }
  this.pathToIRI = (path: string): string => {
    return url + 'bzzr://' + path
  }
  this.resolve = (node: Object, path: string, tasks: Object, t: number, i?: number) => {
    node.path += '/' + path
    tasks.run(t, node, '', i)
  }
  this.get = (cid: Object, tasks: Object, t: number, i?: number) => {
    if (cid.codec !== codec) {
      return tasks.error(`expected codec="${codec}", got ` + cid.codec)
    }
    if (cid.version !== version) {
      return tasks.error(`expected version=${version}, got ` + cid.version)
    }
    const hash = multihash.decode(cid.multihash).toString('hex')
    request(
      this.pathToIRI(hash),
      { responseType: 'arraybuffer' },
      (err, data, res) => {
        if (err) {
          return tasks.error(err)
        }
        if (res.statusCode !== 200) {
          return tasks.error(err)
        }
        tasks.run(t, Buffer.from(data), i)
      }
    )
  }
  this.put = (node: Buffer, tasks: Object, t: number, i?: number) => {
    const body = node.toString('binary')
    request(url + 'bzzr:/', { method: 'POST', body }, (err, data, res) => {
      if (err) {
        return tasks.error(err)
      }
      if (res.statusCode !== 200) {
        return tasks.error(data)
      }
      if (!this.isValidHash(data)) {
        return tasks.error('invalid hash: ' + data)
      }
      const mh = multihash.encode(Buffer.from(data, 'hex'), 'keccak-256')
      const cid = new CID(version, codec, mh)
      tasks.run(t, cid, i)
    })
  }
}
