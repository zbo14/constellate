'use strict'

const CID = require('cids')
const Keccak = require('keccakjs')
const multihash = require('multihashes')
const request = require('xhr-request')

const {
    errInvalidElement,
    isContentElement
} = require('../lib/util.js')

//      

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

const hashChunk = (chunk, size, tasks, t, i) => {
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

const swarmHash = (data, tasks, t, i) => {
    let depth = 0,
        treeSize
    for (treeSize = 4096; treeSize < data.length; treeSize *= 128) depth++
        split(data, depth, data.length, treeSize / 128, tasks, t, i)
}

const split = (chunk, depth, size, treeSize, tasks, t, i) => {
    while (depth && size < treeSize) {
        treeSize /= 128
        depth--
    }
    if (!depth) {
        return hashChunk(chunk, size, tasks, t, i)
    }
    let chunks, count = 0,
        secSize
    const t1 = tasks.add((chunk, j) => {
        chunks[j] = chunk
        if (++count !== chunks.length) return
        hashChunk(Buffer.concat(chunks), size, tasks, t, i)
    })
    chunks = new Array(Math.floor((size + treeSize - 1) / treeSize))
    for (let j = 0, s = 0; s < size; j++, s += treeSize) {
        if (size - s < treeSize) {
            secSize = size - s
        } else {
            secSize = treeSize
        }
        split(chunk.slice(s, s + secSize), depth - 1, secSize, treeSize / 128, tasks, t1, j)
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

// const isValidHash = (hash: string): boolean => {
//   return /^[a-f0-9]{64}$/.test(hash)
// }

function ContentService(url) {
    this.url = url
}

ContentService.prototype.hash = (content, tasks, t, i) => {
    const t1 = tasks.add(data => {
        tasks.run(t, data.toString('hex'), i)
    })
    swarmHash(content, tasks, t1)
}

ContentService.prototype.pathToURL = function(path) {
    return this.url + '/bzzr://' + path
}

ContentService.prototype.get = function(path, tasks, t, i) {
    request(
        this.pathToURL(path), {
            responseType: 'arraybuffer'
        },
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

ContentService.prototype.put = function(contents, tasks, t, i) {
    const hashes = new Array(contents.length)
    let count = 0
    for (let j = 0; j < contents.length; j++) {
        request(this.url + '/bzzr:', {
            method: 'POST',
            body: contents[j]
        }, (err, data, res) => {
            if (err) {
                return tasks.error(err)
            }
            if (res.statusCode !== 200) {
                return tasks.error(data)
            }
            // if (!isValidHash(data)) {
            //   return tasks.error('invalid hash: ' + data)
            // }
            hashes[j] = data
            if (++count !== contents.length) return
            tasks.run(t, hashes, i)
        })
    }
}

module.exports = {
    ContentService
}