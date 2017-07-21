'use strict'

const CID = require('cids')
const EthBlockHeader = require('ethereumjs-block/header')
const multihash = require('multihashes')

const getValue = (blockHeader: Object, path: string): any => {
    switch (path) {
        case 'authorAddress':
            return blockHeader.coinbase
        case 'ommerHash':
            return blockHeader.uncleHash
        case 'ommers':
        case 'parent':
        case 'state':
        case 'transactions':
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

function EthBlock() {

    this.codec = 'eth-block'

    this.version = 1

    this.deserialize = (data: Buffer, t: Object, id ? : number | string) => {
        try {
            const blockHeader = new EthBlockHeader(data)
            t.run(blockHeader, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.serialize = (blockHeader: Object, t: Object, id ? : number | string) => {
        try {
            const data = blockHeader.serialize()
            t.run(data, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.cid = (blockHeader: Object, t: Object, id ? : number | string) => {
        try {
            const mh = multihash.encode(blockHeader.hash(), 'keccak-256')
            const cid = new CID(this.version, this.codec, mh)
            t.run(cid, id)
        } catch (err) {
            t.error(err)
        }
    }

    this.hash = (blockHeader: Object, t: Object, id ? : number | string) => {
        try {
            const mh = multihash.encode(blockHeader.hash(), 'keccak-256')
            const cid = new CID(this.version, this.codec, mh)
            t.run(cid.toBaseEncodedString(), id)
        } catch (err) {
            t.error(err)
        }
    }

    this.resolve = (block: Object, path: string, t: Object, id ? : number | string) => {
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