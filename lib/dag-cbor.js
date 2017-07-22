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

    this.deserialize = (data, tasks, t, i) => {
        try {
            const obj = decoder.decodeFirst(data)
            tasks.run(t, obj, i)
        } catch (err) {
            tasks.error(err)
        }
    }

    this.serialize = (node, tasks, t, i) => {
        const seen = []
        let cid
        const tagged = transform(node, val => {
            if (!isObject(val)) return val
            if (seen.some(obj => orderStringify(obj) === orderStringify(val))) {
                return tasks.error('The object passed has circular references')
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
            tasks.run(t, data, i)
        } catch (err) {
            tasks.error(err)
        }
    }

    this.cid = (node, tasks, t, i) => {
        const t1 = tasks.add(data => {
            try {
                const mh = multihash.encode(sha256(data), 'sha2-256')
                const cid = new CID(this.version, this.codec, mh)
                tasks.run(t, cid, i)
            } catch (err) {
                tasks.error(err)
            }
        })
        this.serialize(node, tasks, t1)
    }

    this.hash = (node, tasks, t, i) => {
        const t1 = tasks.task(data => {
            try {
                const mh = multihash.encode(sha256(data), 'sha2-256')
                const cid = new CID(this.version, this.codec, mh)
                tasks.run(t, cid.toBaseEncodedString(), i)
            } catch (err) {
                tasks.error(err)
            }
        })
        this.serialize(node, tasks, t1)
    }

    this.resolve = (block, path, tasks, t, i) => {
        const t1 = tasks.task(val => {
            if (!path || path === '/') {
                return tasks.run(t, val, '', i)
            }
            const parts = path.split('/')
            path = ''
            for (let j = 0; j < parts.length; j++) {
                if (isArray(val) && !Buffer.isBuffer(val)) {
                    val = val[Number(parts[j])]
                } else if (val[parts[j]]) {
                    val = val[parts[j]]
                } else {
                    if (!val) {
                        return tasks.error('path not available at root')
                    }
                    path = parts.slice(j).join('/')
                    break
                }
            }
            tasks.run(t, val, path, i)
        })
        this.deserialize(block.data, tasks, t1)
    }
}

module.exports = new DagCBOR();