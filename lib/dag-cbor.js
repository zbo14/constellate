'use strict'

const cbor = require('borc')
const CID = require('cids')
const crypto = require('crypto')
const multihash = require('multihashes')

const {
    isArray,
    isObject,
    isString,
    orderStringify,
    transform
} = require('../lib/util.js')

//      

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

const CID_CBOR_TAG = 42

const decoder = new cbor.Decoder({
    tags: {
        [CID_CBOR_TAG]: val => {
            return {
                '/': val.slice(1)
            }
        }
    }
})

const sha256 = (data) => {
    return crypto.createHash('sha256').update(data).digest()
}

function DagCBOR() {

    this.codec = 'dag-cbor'

    this.version = 1

    this.deserialize = (data, t, id) => {
        try {
            const obj = decoder.decodeFirst(data)
            t.run(obj, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.serialize = (node, t, id) => {
        const seen = []
        let cid
        const tagged = transform(node, val => {
            if (!isObject(val)) return val
            if (seen.some(obj => orderStringify(obj) === orderStringify(val))) {
                return t.error('The object passed has circular references')
            }
            seen.push(val)
            if (!(cid = val['/'])) return val
            if (isString(cid)) {
                cid = new CID(cid).buffer
            }
            return new cbor.Tagged(CID_CBOR_TAG, Buffer.concat([
                Buffer.from('00', 'hex'), cid
            ]))
        })
        try {
            const data = cbor.encode(tagged)
            t.run(data, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.cid = (node, t, id) => {
        t.task(data => {
            try {
                const mh = multihash.encode(sha256(data), 'sha2-256')
                const cid = new CID(this.version, this.codec, mh)
                t.next()
                t.run(cid, id)
            } catch (err) {
                t.error(err)
            }
        })
        this.serialize(node, t)
    }

    this.hash = (node, t, id) => {
        t.task(data => {
            try {
                const mh = multihash.encode(sha256(data), 'sha2-256')
                const cid = new CID(this.version, this.codec, mh)
                t.next()
                t.run(cid.toBaseEncodedString(), id)
            } catch (err) {
                t.error(err)
            }
        })
        this.serialize(node, t)
    }

    this.resolve = (block, path, t, id) => {
        t.task(val => {
            if (!path || path === '/') {
                t.next()
                return t.run(val, '', id)
            }
            const parts = path.split('/')
            path = ''
            for (let i = 0; i < parts.length; i++) {
                if (isArray(val) && !Buffer.isBuffer(val)) {
                    val = val[Number(parts[i])]
                } else if (val[parts[i]]) {
                    val = val[parts[i]]
                } else {
                    if (!val) {
                        return t.error('path not available at root')
                    }
                    path = parts.slice(i).join('/')
                    break
                }
            }
            t.next()
            t.run(val, path, id)
        })
        this.deserialize(block.data, t)
    }
}

module.exports = new DagCBOR();