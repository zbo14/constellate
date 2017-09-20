'use strict'

const FilesAPI = require('ipfs-api/src/files')
const multiaddr = require('multiaddr')
const UnixFS = require('ipfs-unixfs')

const {
  DAGNode,
  DAGLink
} = require('ipld-dag-pb')

const CHUNK_LENGTH = 262144

function ContentService(addr) {
  const maddr = multiaddr(addr)
  this.host = maddr.nodeAddress().address
  this.port = maddr.nodeAddress().port
  this.files = FilesAPI(addr)
}

ContentService.prototype.pathToURL = function (path) {
  return `http://${this.host}:${this.port}/api/v0/get?arg=` + path
}

ContentService.prototype.put = function (contents, cb) {
  this.files.add(contents, (err, results) => {
    if (err) {
      return cb(err)
    }
    const hashes = results.map(result => result.hash)
    cb(null, hashes)
  })
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

ContentService.prototype.get = function (path, cb) {
  this.files.get(path, (err, stream) => {
    if (err) {
      return cb(err)
    }
    stream.on('data', file => {
      const chunks = []
      file.content.on('data', chunk => {
        chunks.push(chunk)
      })
      file.content.once('end', () => {
        cb(null, Buffer.concat(chunks))
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

ContentService.prototype.hash = function (content, cb) {
  const numChunks = Math.ceil(content.length / CHUNK_LENGTH)
  if (numChunks === 1) {
    const file = new UnixFS('file', content)
    return DAGNode.create(file.marshal(), (err, dagNode) => {
      if (err) {
        return cb(err)
      }
      const mh = dagNode.toJSON().multihash
      cb(null, mh)
    })
  }
  const dagNodes = []
  const files = []
  const links = []
  let count = 0, chunk
  const fn = i => {
    DAGNode.create(files[i].marshal(), (err, dagNode) => {
      if (err) {
        return cb(err)
      }
      dagNodes[i] = dagNode
      if (++count === numChunks) {
        const file = new UnixFS('file')
        for (i = 0; i < numChunks; i++) {
          dagNode = dagNodes[i]
          file.addBlockSize(files[i].fileSize())
          links[i] = new DAGLink('', dagNode.size, dagNode.multihash)
        }
        DAGNode.create(file.marshal(), links, (err, dagNode) => {
          if (err) {
            return cb(err)
          }
          const mh = dagNode.toJSON().multihash
          cb(null, mh)
        })
      }
    })
  }
  for (let i = 0; i < numChunks; i++) {
    chunk = content.slice(i*CHUNK_LENGTH, (i+1)*CHUNK_LENGTH)
    files[i] = new UnixFS('file', chunk)
    fn(i)
  }
}

module.exports = ContentService
