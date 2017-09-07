'use strict'

const Block = require('ipfs-block')
const CID = require('cids')
const dagCBOR = require('../lib/dag-cbor')
const FilesAPI = require('ipfs-api/src/files')
const moduleConfig = require('ipfs-api/src/utils/module-config')
const streamToValue = require('ipfs-api/src/utils/stream-to-value')
const UnixFS = require('ipfs-unixfs')
const multiaddr = require('multiaddr')

const {
    DAGNode,
    DAGLink
} = require('ipld-dag-pb')

const {
    Tasks,
    errInvalidElement,
    errPathNotFound,
    errUnexpectedCID,
    isElement,
    isMerkleLink,
    order,
    transform
} = require('../lib/util')

//

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
of this software and associated documentation files (the 'Software'), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

function BlockAPI(addr) {
    this._send = moduleConfig(addr)
}

BlockAPI.prototype.get = function(cid, cb) {
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

BlockAPI.prototype.put = function(data, cb) {
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

const Ipfs = {}

const CHUNK_LENGTH = 262144

function ContentService(addr) {
    const maddr = multiaddr(addr)
    this.host = maddr.nodeAddress().address
    this.port = maddr.nodeAddress().port
    this._files = FilesAPI(addr)
}

ContentService.prototype.get = function(path, cb) {
    const tasks = new Tasks(cb)
    this._get(path, tasks, -1)
}

ContentService.prototype.hash = function(content, cb) {
    const tasks = new Tasks(cb)
    this._hash(content, tasks, -1)
}

ContentService.prototype.pathToURL = function(path) {
    return `http://${this.host}:${this.port}/api/v0/get?arg=` + path
}

ContentService.prototype.put = function(contents, cb) {
    const tasks = new Tasks(cb)
    this._put(contents, tasks, -1)
}

/*

The following code is adapted from https://github.com/ipfs/js-ipfs/blob/master/examples/transfer-files/public/js/app.js

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2014 Juan Batiz-Benet

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the 'Software'), to deal
in the Software withtask restriction, including withtask limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

ContentService.prototype._get = function(path, tasks, t, i) {
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

/*

The following code is adapted from https://github.com/ipfs/js-ipfs-unixfs-engine/tree/master/src/builder

------------------------------- LICENSE -------------------------------

The MIT License (MIT)

Copyright (c) 2016 David Dias

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

ContentService.prototype._hash = function(content, tasks, t, i) {
    const dagNodes = []
    const files = []
    const links = []
    const numChunks = Math.ceil(content.length / CHUNK_LENGTH)
    let file
    const t2 = tasks.add(() => {
        return DAGNode.create(file.marshal(), links, (err, dagNode) => {
            if (err) {
                return tasks.error(err)
            }
            const mh = dagNode.toJSON().multihash
            tasks.run(t, mh, i)
        })
    })
    if (numChunks === 1) {
        file = new UnixFS('file', content)
        return tasks.run(t2)
    }
    let chunk, count = 0
    const t1 = tasks.add((dagNode, j) => {
        dagNodes[j] = dagNode
        if (++count !== numChunks) return
        file = new UnixFS('file')
        for (j = 0; j < numChunks; j++) {
            dagNode = dagNodes[j]
            file.addBlockSize(files[j].fileSize())
            links[j] = new DAGLink('', dagNode.size, dagNode.multihash)
        }
        tasks.run(t2)
    })
    for (let j = 0; j < numChunks; j++) {
        chunk = content.slice(j * CHUNK_LENGTH, (j + 1) * CHUNK_LENGTH)
        files.push(new UnixFS('file', chunk))
        const idx = j
        DAGNode.create(files[j].marshal(), (err, dagNode) => {
            if (err) {
                return tasks.error(err)
            }
            tasks.run(t1, dagNode, idx)
        })
    }
}

ContentService.prototype._put = function(contents, tasks, t, i) {
    this._files.add(contents, (err, results) => {
        if (err) {
            return tasks.error(err)
        }
        const hashes = results.map(result => result.hash)
        tasks.run(t, hashes, i)
    })
}

function MetadataService(addr) {
    const maddr = multiaddr(addr)
    this.host = maddr.nodeAddress().address
    this.port = maddr.nodeAddress().port
    this._blocks = new BlockAPI(addr)
}

const isValidCID = (cid) => {
    return cid.codec === dagCBOR.codec && cid.version === dagCBOR.version
}

MetadataService.prototype.get = function(cid, cb) {
    const tasks = new Tasks(cb)
    this._get(cid, tasks, -1)
}

MetadataService.prototype.hashFromCID = function(cid) {
    if (!isValidCID(cid)) {
        throw errUnexpectedCID(cid)
    }
    return cid.toBaseEncodedString()
}

MetadataService.prototype.pathToCID = (path) => {
    const parts = path.split('/')
    const cid = new CID(parts.shift())
    const remPath = parts.join('/')
    return {
        cid,
        remPath
    }
}

MetadataService.prototype.pathToURL = function(path) {
    return `http://${this.host}:${this.port}/api/v0/dag/get?arg=` + path
}

MetadataService.prototype.put = function(elem, cb) {
    const tasks = new Tasks(cb)
    this._put(elem, tasks, -1)
}

MetadataService.prototype._get = function(cid, tasks, t, i) {
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

MetadataService.prototype._hash = (elem, tasks, t, i) => {
    if (!isElement(elem)) {
        return tasks.error(errInvalidElement(elem))
    }
    const t1 = tasks.add(cid => {
        tasks.run(t, cid.toBaseEncodedString(), i)
    })
    dagCBOR.cid(elem.data, tasks, t1)
}

MetadataService.prototype._put = function(elem, tasks, t, i) {
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

MetadataService.prototype._resolve = (obj, path, tasks, t, i) => {
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

MetadataService.prototype._toElement = (data, path, tasks, t, i) => {
    if (path) {
        tasks.run(t, order(data), i)
    } else {
        tasks.run(t, {
            data
        }, i)
    }
}

module.exports = {
    ContentService,
    MetadataService
}
