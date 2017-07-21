'use strict'

const CID = require('cids')
const Tx = require('ethereumjs-tx')
const multihash = require('multihashes')

// @flow

/**
 * @module constellate/src/eth-tx
 */

 /*

   The following code is adapted from..
     > https://github.com/ipld/js-ipld-eth-tx/blob/master/src/common.js
     > https://github.com/ipld/js-ipld-eth-tx/blob/master/src/resolver.js
     > https://github.com/ipld/js-ipld-eth-tx/blob/master/src/util.js

   ------------------------------- LICENSE -------------------------------

   MIT License

   Copyright (c) 2016 Protocol Labs Inc.

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

const getValue = (tx: Object, path: string): any => {
  switch (path) {
    case 'fromAddress':
      return tx.from
    case 'isContractPublish':
      return tx.toCreationAddress()
    case 'signature':
      return [tx.v, tx.r, tx.s]
    case 'toAddress':
      return tx.to
    case 'data':
    case 'gasLimit':
    case 'gasPrice':
    case 'nonce':
    case 'r':
    case 's':
    case 'v':
    case 'value':
      return tx[path]
    default:
      return null
  }
}

function EthTx () {

  this.codec = 'eth-tx'

  this.version = 1

  this.deserialize = (data: Buffer, t: Object, id?: number|string) => {
    try {
      const tx = new Tx(data)
      t.run(tx, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.serialize = (tx: Object, t: Object, id?: number|string) => {
    try {
      const data = tx.serialize()
      t.run(data, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.cid = (tx: Object, t: Object, id?: number|string) => {
    try {
      const mh = multihash.encode(tx.hash(), 'keccak-256')
      const cid = new CID(this.version, this.codec, mh)
      t.run(cid, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.hash = (tx: Object, t: Object, id?: number|string) => {
    try {
      const mh = multihash.encode(tx.hash(), 'keccak-256')
      const cid = new CID(this.version, this.codec, mh)
      t.run(cid.toBaseEncodedString(), id)
    } catch(err) {
      t.error(err)
    }
  }

  this.resolve = (block: Object, path: string, t: Object, id?: number|string) => {
    if (!path || path === '/') {
      t.task(tx => {
        t.next()
        t.run(tx, '', id)
      })
    } else {
      t.task(tx => {
        const parts = path.split('/')
        const first = parts.shift()
        const val = getValue(tx, first)
        if (!val) return t.error('path not found')
        t.next()
        t.run(val, parts.join('/'), id)
      })
    }
    this.deserialize(block.data, t)
  }
}

module.exports = new EthTx()
