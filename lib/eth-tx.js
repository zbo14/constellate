'use strict'

const CID = require('cids')
const Tx = require('ethereumjs-tx')
const multihash = require('multihashes')

//      

/**
 * @module constellate/src/eth-tx
 */

const getValue = (tx, path) => {
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

function EthTx() {

    this.codec = 'eth-tx'

    this.version = 1

    this.deserialize = (data, t, id) => {
        try {
            const tx = new Tx(data)
            t.run(tx, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.serialize = (tx, t, id) => {
        try {
            const data = tx.serialize()
            t.run(data, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.cid = (tx, t, id) => {
        try {
            const mh = multihash.encode(tx.hash(), 'keccak-256')
            const cid = new CID(this.version, this.codec, mh)
            t.run(cid, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.hash = (tx, t, id) => {
        try {
            const mh = multihash.encode(tx.hash(), 'keccak-256')
            const cid = new CID(this.version, this.codec, mh)
            t.run(cid.toBaseEncodedString(), id)
        } catch (err) {
            t.error(err)
        }
    }

    this.resolve = (block, path, t, id) => {
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