'use strict'

const CID = require('cids')
const EthBlockHeader = require('ethereumjs-block/header')
const multihash = require('multihashes')

/*

  The following code is adapted from..
    > https://github.com/ipld/js-ipld-eth-block/blob/master/src/common.js
    > https://github.com/ipld/js-ipld-eth-block/blob/master/src/resolver.js
    > https://github.com/ipld/js-ipld-eth-block/blob/master/src/util.js

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

const getValue = (blockHeader: Object, path: string): any => {
  switch (path) {
    case 'authorAddress':
      return blockHeader.coinbase
    case 'ommerHash':
      return blockHeader.uncleHash
    case 'ommers':
      return //..
    case 'parent':
      return //..
    case 'state':
      return //..
    case 'transactions':
      return //..
    case 'transactionReceipts':
      return //..
    case 'transactionReceiptTrieRoot':
      return blockHeader.receiptTrie
    case 'transactionTrieRoot':
      return blockHeader.transactionsTrie
    case 'bloom':
    case 'difficulty':
    case 'extraData':
    case 'gasLimit':
    case 'gasUsed':
    case 'mixHash':
    case 'nonce':
    case 'number':
    case 'parentHash':
    case 'stateRoot':
    case 'timestamp':
      return blockHeader[path]
    default:
      return null
  }
}

function EthBlock () {

  this.codec = 'eth-block'

  this.version = 1

  this.deserialize = (data: Buffer, t: Object, id?: number|string) => {
    try {
      const blockHeader = new EthBlockHeader(data)
      t.run(blockHeader, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.serialize = (blockHeader: Object, t: Object, id?: number|string) => {
    try {
      const data = blockHeader.serialize()
      t.run(data, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.cid = (blockHeader: Object, t: Object, id?: number|string) => {
    try {
      const mh = multihash.encode(blockHeader.hash(), 'keccak-256')
      const cid = new CID(this.version, this.codec, mh)
      t.run(cid, id)
    } catch(err) {
      t.error(err)
    }
  }

  this.hash = (blockHeader: Object, t: Object, id?: number|string) => {
    try {
      const mh = multihash.encode(blockHeader.hash(), 'keccak-256')
      const cid = new CID(this.version, this.codec, mh)
      t.run(cid.toBaseEncodedString(), id)
    } catch(err) {
      t.error(err)
    }
  }

  this.resolve = (block: Object, path: string, t: Object, id?: number|string) => {
    if (!path || path === '/') {
      t.task(blockHeader => {
        t.next()
        t.run(blockHeader, '', id)
      })
    } else {
      t.task(blockHeader => {
        const parts = path.split('/')
        const first = parts.shift()
        const val = getValue(blockHeader, first)
        if (!val) return t.error(`path="${path}" not found`)
        t.next()
        t.run(val, parts.join('/'), id)
      })
    }
    this.deserialize(block.data, t)
  }
}

module.exports = new EthBlock()
