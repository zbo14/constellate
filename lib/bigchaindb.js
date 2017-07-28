'use strict'

const base58 = require('bs58')
const cc = require('five-bells-condition')
const CID = require('cids')
const driver = require('bigchaindb-driver')
const multihash = require('multihashes')
const request = require('xhr-request')
const sha3_256 = require('js-sha3').sha3_256

const {
    // makeCreateTransaction,
    makeEd25519Condition,
    makeOutput,
    makeThresholdCondition,
    // makeTransferTransaction,
    // serializeTransactionIntoCanonicalString,
    // signTransaction
} = driver.Transaction

const {
    cloneObject,
    isArray,
    isObject,
    isString,
    order,
    orderStringify,
    transform
} = require('../lib/util.js')

//      

/**
 * @module constellate/src/bigchaindb
 */

const BigchainDB = {}

const codec = 'bigchaindb-transaction'
const version = 1

const pathFromCID = (cid) => {
    return multihash.decode(cid.multihash).digest.toString('hex')
}

const hashTx = (tx) => {
    tx = cloneObject(tx)
    delete tx.id
    for (let i = 0; i < tx.inputs.length; i++) {
        tx.inputs[i].fulfillment = null
    }
    const data = orderStringify(tx)
    return Buffer.from(sha3_256.create().update(data).buffer())
}

BigchainDB.Tx = {

    codec,

    version,

    cid: (tx, tasks, t, i) => {
        try {
            const mh = multihash.encode(hashTx(tx), 'sha3-256')
            const cid = new CID(version, codec, mh)
            tasks.run(t, cid, i)
        } catch (err) {
            tasks.error(err)
        }
    },

    resolve: (tx, path, tasks, t, i) => {
        if (!path || path === '/') {
            return tasks.run(t, tx, '', i)
        }
        const parts = path.split('/')
        const first = parts.shift()
        try {
            switch (first) {
                case 'asset':
                    if (tx[first].data) {
                        return tasks.run(t, tx[first].data, '', i)
                    }
                    if (tx[first]['/']) {
                        return tasks.run(t, tx[first], 'asset', i)
                    }
                    return tasks.error('no asset data or link')
                case 'issuers':
                    let issuers = tx.inputs.map(input => input.owners_before)
                    if (parts.length) {
                        issuers = issuers[Number(parts[0])]
                    }
                    return tasks.run(t, issuers, '', i)
                case 'owners':
                    let owners = tx.outputs.map(output => {
                        return {
                            amount: output.amount,
                            publicKeys: output.public_keys
                        }
                    })
                    if (parts.length) {
                        owners = owners[Number(parts[0])]
                    }
                    return tasks.run(t, owners, '', i)
                case 'inputs':
                case 'outputs':
                    if (parts.length) {
                        return tx[first][Number(parts[0])]
                    }
                    return tx[first]
                case 'id':
                case 'metadata':
                case 'operation':
                case 'version':
                    return tasks.run(t, tx[first], '', i)
                default:
                    tasks.error(`path="${path}" not found`)
            }
        } catch (err) {
            tasks.error(err)
        }
    }
}

const VERSION = '1.0'

const newCreateTx = (data, issuer, metadata, owners, tasks, t, i) => {
    const inputs = [{
        fulfillment: null,
        fulfills: null,
        owners_before: [issuer.publicKey]
    }]
    const outputs = new Array(owners.length)
    let condition, publicKeys
    for (let j = 0; j < owners.length; j++) {
        publicKeys = owners[j].publicKeys
        if (!Array.isArray(publicKeys)) {
            condition = makeEd25519Condition(publicKeys)
        } else if (publicKeys.length === 1) {
            condition = makeEd25519Condition(publicKeys[0])
        } else {
            condition = makeThresholdCondition(owners[j].threshold, publicKeys.map(publicKey => {
                return makeEd25519Condition(publicKey, false)
            }))
        }
        outputs[j] = makeOutput(condition, owners[j].amount)
    }
    data = data || null
    const tx = {
        asset: {
            data
        },
        inputs,
        metadata,
        operation: 'CREATE',
        outputs,
        version: VERSION
    }
    tx.id = hashTx(tx).toString('hex')
    tasks.run(t, order(tx), i)
}

const newTransferTx = (issuer, metadata, owners, tx, tasks, t, i) => {
    const outputs = new Array(owners.length)
    let condition, publicKeys
    let j
    for (j = 0; j < owners.length; j++) {
        publicKeys = owners[j].publicKeys
        if (!Array.isArray(publicKeys)) {
            condition = makeEd25519Condition(publicKeys)
        } else if (publicKeys.length === 1) {
            condition = makeEd25519Condition(publicKeys[0])
        } else {
            condition = makeThresholdCondition(owners[j].threshold, publicKeys.map(publicKey => {
                return makeEd25519Condition(publicKey, false)
            }))
        }
        outputs[j] = makeOutput(condition, owners[j].amount)
    }
    let id
    if (tx.operation === 'CREATE') {
        id = tx.id
    } else if (tx.operation === 'TRANSFER') {
        id = tx.asset.id
    } else {
        return tasks.error('unexpected operation: ' + tx.operation)
    }
    let inputs
    for (j = 0; j < tx.outputs.length; j++) {
        publicKeys = tx.outputs[j].public_keys
        if (publicKeys.length !== 1) {
            continue
        }
        if (issuer.publicKey !== publicKeys[0]) {
            continue
        }
        inputs = [{
            fulfillment: null,
            fulfills: {
                output_index: j,
                transaction_id: tx.id
            },
            owners_before: [issuer.publicKey]
        }]
        break
    }
    if (!inputs) {
        return tasks.error('invalid issuer public key: ' + issuer.publicKey)
    }
    tx: Object = {
        asset: {
            id
        },
        inputs,
        metadata,
        operation: 'TRANSFER',
        outputs,
        version: VERSION
    }
    tx.id = hashTx(tx).toString('hex')
    tasks.run(t, order(tx), i)
}

const transformTx = (tx) => {
    return order(transform(tx, val => {
        if (isObject(val)) {
            if (val.id) {
                return {
                    '/': val.id
                }
            }
            if (val.output_index && val.transaction_id) {
                return {
                    '/': val.transaction_id + '/outputs/' + val.output_index
                }
            }
        }
        return val
    }))
}

const signTx = (issuer, tx, tasks, t, i) => {
    tx = cloneObject(tx)
    let ownersBefore
    for (let j = 0; j < tx.inputs; j++) {
        ownersBefore = tx.inputs[j].owners_before
        if (ownersBefore.length !== 1) {
            continue
        }
        if (issuer.publicKey !== ownersBefore[0]) {
            continue
        }
        const data = orderStringify(tx)
        const fulfillment = new cc.Ed25519Sha256()
        fulfillment.sign(Buffer.from(data, 'utf8'), base58.decode(issuer.privateKey))
        tx.inputs[j].fulfillment = fulfillment.serializeUri()
        tasks.run(t, tx, i)
    }
    tasks.error('could not find issuer')
}

BigchainDB.MetadataService = function(url) {

    this.name = 'bigchaindb-metadata-service'

    this.isValidHash = (hash) => {
        return /^[a-f0-9]{64}$/.test(hash)
    }

    this.pathFromCID = pathFromCID

    this.pathToCID = (path) => {
        const parts = path.split('/')
        const mh = multihash.encode(Buffer.from(parts.shift(), 'hex'), 'sha3-256')
        const cid = new CID(version, codec, mh)
        const remPath = parts.join('/')
        return {
            cid,
            remPath
        }
    }

    this.newTx = (node, tasks, t, i) => {
        if (node.data) {
            newCreateTx(node.data, node.issuer, node.metadata, node.owners, tasks, t, i)
        } else if (node.id) {
            const t1 = tasks.add(tx => {
                newTransferTx(node.issuer, node.metadata, node.owners, tx, tasks, t, i)
            })
            try {
                const mh = multihash.encode(Buffer.from(node.id, 'hex'), 'sha3-256')
                const cid = new CID(version, codec, mh)
                this.get(cid, tasks, t1)
            } catch (err) {
                tasks.error(err)
            }
        } else {
            return tasks.error('no data or tx_id')
        }
    }

    this.hash = (node, tasks, t, i) => {
        let t1, t2
        t1 = tasks.add(tx => {
            BigchainDB.Tx.cid(tx, tasks, t2)
        })
        t2 = tasks.add(cid => {
            tasks.run(t, pathFromCID(cid), i)
        })
        this.newTx(node, tasks, t1)
    }

    this.pathToIRI = (path) => {
        return url + '/transactions/' + path
    }

    this.resolve = BigchainDB.Tx.resolve

    this.get = (cid, tasks, t, i) => {
        if (cid.codec !== codec) {
            return tasks.error(`expected codec=${codec}, got ` + cid.codec)
        }
        if (cid.version !== version) {
            return tasks.error(`expected version=${version}, got ` + cid.version)
        }
        request(this.pathToIRI(pathFromCID(cid)), {
            json: true
        }, (err, json, res) => {
            if (err) {
                return tasks.error(err)
            }
            if (res.statusCode !== 200) {
                return tasks.error(JSON.stringify(json))
            }
            tasks.run(t, transformTx(json), i)
        })
    }

    this.put = (node, tasks, t, i) => {
        let t1, t2
        t1 = tasks.add(tx => {
            signTx(node.issuer, tx, tasks, t2)
        })
        t2 = tasks.add(tx => {
            request(url + '/transactions', {
                method: 'POST',
                json: true,
                body: tx
            }, (err, json, res) => {
                if (err) {
                    return tasks.error(err)
                }
                if (res.statusCode !== 200 && res.statusCode !== 202) {
                    return tasks.error(JSON.stringify(json))
                }
                BigchainDB.Tx.cid(json, tasks, t, i)
            })
        })
        this.newTx(node, tasks, t1)
    }
}

module.exports = BigchainDB