'use strict'

const cbor = require('borc')
const crypto = require('crypto')
const CID = require('cids')
const multihash = require('multihashes')

const {
  errPathNotFound,
  isArray,
  isObject,
  isString,
  orderStringify,
  transform
} = require('../lib/util')

// @flow

/**
 * @module constellate/src/dag-cbor
 */

/*

  The following code is adapted from..
    > https://github.com/ipld/js-ipld-dag-cbor/blob/master/src/resolver.js
    > https://github.com/ipld/js-ipld-dag-cbor/blob/master/src/util.js

  ------------------------------- LICENSE -------------------------------

  The MIT License (MIT)

  Copyright (c) 2015 David Dias

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

const codec = 'dag-cbor'
const version = 1

const CID_CBOR_TAG = 42

const decoder = new cbor.Decoder({
  tags: {
    [CID_CBOR_TAG]: val => {
      return { '/': val.slice(1) }
    }
  }
})

const serialize = (elem: Object, tasks: Object, t: number, i?: number) => {
  const seen = []
  let cid
  const tagged = transform(elem, val => {
    if (!isObject(val)) {
      return val
    }
    if (seen.some(obj => orderStringify(obj) === orderStringify(val))) {
      return tasks.error('the object passed has circular references')
    }
    seen.push(val)
    if (!(cid = val['/'])) {
      return val
    }
    if (isString(cid)) {
      cid = new CID(cid.split('/')[0]).buffer
    }
    return new cbor.Tagged(CID_CBOR_TAG, Buffer.concat([
      Buffer.from('00', 'hex'), cid
    ]))
  })
  try {
    const data = cbor.encode(tagged)
    tasks.run(t, data, i)
  } catch(err) {
    tasks.error(err)
  }
}

const sha2_256 = (data: Buffer): Buffer => {
  return crypto.createHash('sha256').update(data).digest()
}

module.exports = {

  codec,

  version,

  serialize,

  deserialize: (data: Buffer, tasks: Object, t: number, i?: number) => {
    try {
      const elem = decoder.decodeFirst(data)
      tasks.run(t, elem, i)
    } catch(err) {
      tasks.error(err)
    }
  },

  cid: (elem: Object, tasks: Object, t: number, i?: number) => {
    const t1 = tasks.add(data => {
      try {
        const mh = multihash.encode(sha2_256(data), 'sha2-256')
        const cid = new CID(version, codec, mh)
        tasks.run(t, cid, data, i)
      } catch(err) {
        tasks.error(err)
      }
    })
    serialize(elem, tasks, t1)
  },

  resolve: (elem: Object, path: string, tasks: Object, t: number, i?: number) => {
    if (!path || path === '/') {
      return tasks.run(t, elem, '', i)
    }
    const parts = path.split('/')
    let remPath = '', val = elem
    for (let j = 0; j < parts.length; j++) {
      if (isArray(val) && !Buffer.isBuffer(val)) {
        val = val[Number(parts[j])]
      } else if (val[parts[j]]) {
        val = val[parts[j]]
      } else {
        if (!val) {
          return tasks.error(errPathNotFound(path))
        }
        remPath = parts.slice(j).join('/')
        break
      }
    }
    tasks.run(t, val, remPath, i)
  }
}
