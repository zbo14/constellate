'use strict'

const base58 = require('bs58')
const cc = require('five-bells-condition')
const CID = require('cids')
const multihash = require('multihashes')
const request = require('xhr-request')
const sha3_256 = require('js-sha3').sha3_256
const dagCBOR = require('../../lib/dag-cbor')

const {
    Tasks,
    clone,
    errInvalidElement,
    errPathNotFound,
    errUnexpectedCID,
    isMerkleLink,
    isElement,
    isNumber,
    order,
    orderStringify,
    transform
} = require('../../lib/util.js')

//

/**
 * @module constellate/src/bigchaindb
 */

const ErrMultipleInputs = new Error('tx with multiple inputs not supported')
const ErrMultipleOwnersBefore = new Error('tx input with multiple owners_before not supported')
const ErrMultiplePublicKeys = new Error('tx output with multiple public_keys not supported')

const errInvalidOwnerBefore = (ownerBefore) => new Error('invalid owner_before: ' + ownerBefore)
const errUnexpectedOperation = (operation) => new Error('unexpected operation: ' + operation)

const codec = 'bigchaindb-transaction'
const version = 1

const hashTx = (tx) => {
    tx = clone(tx)
    delete tx.id
    for (let i = 0; i < tx.inputs.length; i++) {
        tx.inputs[i].fulfillment = null
    }
    const data = orderStringify(tx)
    return Buffer.from(sha3_256.create().update(data).buffer())
}

const Tx = {

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
        switch (first) {
            case 'data':
                if (tx.asset.data) {
                    return dagCBOR.resolve(tx.asset.data, parts.join('/'), tasks, t, i)
                }
                if (tx.asset.id) {
                    return tasks.run(t, {
                        '/': tx.asset.id
                    }, path, i)
                }
            case 'sender':
                if (tx.inputs.length > 1) {
                    return tasks.error(ErrMultipleInputs)
                }
                const publicKey = tx.inputs[0].owners_before[0]
                if (!parts[0]) {
                    return tasks.run(t, {
                        publicKey
                    }, '', i)
                }
                if (parts[0] === 'publicKey') {
                    return tasks.run(t, publicKey, '', i)
                }
            case 'recipient':
                const recipient = order(tx.outputs.map(output => {
                    if (output.public_keys.length > 1) {
                        return tasks.error(ErrMultiplePublicKeys)
                    }
                    return {
                        amount: Number(output.amount),
                        publicKey: output.public_keys[0]
                    }
                }))
                if (!parts[0]) {
                    return tasks.run(t, recipient, '', i)
                }
                const idx = Number(parts[0])
                if (!parts[1]) {
                    return tasks.run(t, recipient[idx], '', i)
                }
                if (parts[1] === 'amount') {
                    return tasks.run(t, Number(recipient[idx].amount), '', i)
                }
                if (parts[1] === 'publicKey') {
                    return tasks.run(t, recipient[idx].publicKey, '', i)
                }
            default:
                tasks.error(errPathNotFound(path))
        }
    }
}

/*

  The following code is adapted from..
    > https://github.com/bigchaindb/js-bigchaindb-driver/tree/master/src/transaction

  ---------------------------------------------------------------------------

  Copyright 2017 BigchainDB GmbH

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.

  Modifications Copyright 2017 Zachary Balder

*/

const VERSION = '1.0'

const newEd25519Condition = (publicKey) => {
    const buf = base58.decode(publicKey)
    const condition = new cc.Ed25519Sha256()
    condition.setPublicKey(buf)
    return condition
}

const newThresholdCondition = (subconditions, threshold) => {
    const condition = new cc.ThresholdSha256()
    for (let i = 0; i < subconditions.length; i++) {
        condition.addSubfulfillment(subconditions[i])
    }
    condition.threshold = threshold
    return condition
}

const conditionObject = (condition) => {
    const typeId = condition.getTypeId()
    const uri = condition.getConditionUri()
    const details = {}
    if (typeId === 2) {
        details.type = 'threshold-sha-256'
        details.subconditions = condition.subconditions.map(subcondition => {
            return conditionObject(subcondition.body).details
        })
        details.threshold = condition.threshold
    }
    if (typeId === 4) {
        details.type = 'ed25519-sha-256'
        details.public_key = base58.encode(condition.publicKey)
    }
    return {
        details,
        uri
    }
}

// const _getPublicKeys = (details: Object): string[] => {
//   if (details.type === 'ed25519-sha-256') {
//     return [details.public_key]
//   }
//   if (details.type === 'threshold-sha-256') {
//     return details.subconditions.reduce((result, subcondition) => {
//       return result.concat(_getPublicKeys(subcondition))
//     }, [])
//   }
//   return []
// }

// const getPublicKeys = (details: Object): string[] => {
//   return Array.from(new Set(_getPublicKeys(details)))
// }

const newOutput = (amount, condition) => {
    if (isNumber(amount)) {
        amount = amount.toString()
    }
    condition = conditionObject(condition)
    // const public_keys = getPublicKeys(condition.details)
    const public_keys = [condition.details.public_key]
    return {
        amount,
        condition,
        public_keys
    }
}

const newCreateTx = (data, sender, metadata, recipient, tasks, t, i) => {
    const inputs = [{
        fulfillment: null,
        fulfills: null,
        owners_before: [sender.publicKey]
    }]
    recipient = [].concat(recipient)
    const outputs = new Array(recipient.length)
    for (let j = 0; j < recipient.length; j++) {
        outputs[j] = newOutput(recipient[j].amount, newEd25519Condition(recipient[j].publicKey))
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

const newTransferTx = (sender, metadata, recipient, tx, tasks, t, i) => {
    let id
    if (tx.operation === 'CREATE') {
        id = tx.id
    } else if (tx.operation === 'TRANSFER') {
        id = tx.asset.id
    } else {
        return tasks.error(errUnexpectedOperation(tx.operation))
    }
    let inputs, j
    for (j = 0; j < tx.outputs.length; j++) {
        if (tx.outputs[j].public_keys.length !== 1) {
            return tasks.error(ErrMultiplePublicKeys)
        }
        if (tx.outputs[j].public_keys[0] !== sender.publicKey) {
            continue
        }
        inputs = [{
            fulfillment: null,
            fulfills: {
                output_index: j,
                transaction_id: tx.id
            },
            owners_before: [sender.publicKey]
        }]
        break
    }
    if (!inputs) {
        return tasks.error(errInvalidOwnerBefore(sender.publicKey))
    }
    recipient = [].concat(recipient)
    let publicKeys
    const outputs = new Array(recipient.length)
    for (j = 0; j < recipient.length; j++) {
        outputs[j] = newOutput(recipient[j].amount, newEd25519Condition(recipient[j].publicKey))
    }
    const newTx = {
        asset: {
            id
        },
        inputs,
        metadata,
        operation: 'TRANSFER',
        outputs,
        version: VERSION
    }
    newTx.id = hashTx(newTx).toString('hex')
    tasks.run(t, order(newTx), i)
}

const signTx = (sender, tx, tasks, t, i) => {
    tx = clone(tx)
    let ownersBefore
    for (let j = 0; j < tx.inputs.length; j++) {
        ownersBefore = tx.inputs[j].owners_before
        if (ownersBefore.length !== 1) {
            return tasks.error(ErrMultiplePublicKeys)
        }
        if (sender.publicKey !== ownersBefore[0]) {
            continue
        }
        const data = Buffer.from(orderStringify(tx), 'utf8')
        const fulfillment = new cc.Ed25519Sha256()
        fulfillment.sign(data, base58.decode(sender.privateKey))
        tx.inputs[j].fulfillment = fulfillment.serializeUri()
        return tasks.run(t, tx, i)
    }
    tasks.error(errInvalidOwnerBefore(sender.publicKey))
}

const isValidCID = (cid) => {
    return cid.codec === codec && cid.version === version
}

function MetadataService(url) {
    this.url = url
}

MetadataService.prototype.get = function(cid, cb) {
    const tasks = new Tasks(cb)
    this._get(cid, tasks, -1)
}

MetadataService.prototype.hashFromCID = (cid) => {
    if (!isValidCID(cid)) {
        throw errUnexpectedCID(cid)
    }
    return multihash.decode(cid.multihash).digest.toString('hex')
}

MetadataService.prototype.pathToCID = (path) => {
    const parts = path.split('/')
    const data = Buffer.from(parts.shift(), 'hex')
    const mh = multihash.encode(data, 'sha3-256')
    const cid = new CID(version, codec, mh)
    const remPath = parts.join('/')
    return {
        cid,
        remPath
    }
}

MetadataService.prototype.pathToURL = function(path) {
    return this.url + '/transactions/' + path
}

MetadataService.prototype.put = function(elem, cb) {
    const tasks = new Tasks(cb)
    this._put(elem, tasks, -1)
}

MetadataService.prototype._fromElement = function(elem, tasks, t, i) {
    if (!isElement(elem)) {
        return tasks.error(errInvalidElement(elem))
    }
    if (elem.data['/']) {
        const t1 = tasks.add(tx => {
            newTransferTx(elem.sender, null, elem.recipient, tx, tasks, t, i)
        })
        try {
            const {
                cid,
                _
            } = this.pathToCID(elem.data['/'])
            return this.get(cid, tasks, t1)
        } catch (err) {
            tasks.error(err)
        }
    }
    const data = transform(elem.data, val => {
        if (isMerkleLink(val)) {
            return {
                '/': val['/'] + '/data'
            }
        }
        return val
    })
    newCreateTx(data, elem.sender, null, elem.recipient, tasks, t, i)
}

MetadataService.prototype._get = function(cid, tasks, t, i) {
    let hash
    try {
        hash = this.hashFromCID(cid)
    } catch (err) {
        tasks.error(err)
    }
    request(this.pathToURL(hash), {
        json: true
    }, (err, tx, res) => {
        if (err) {
            return tasks.error(err)
        }
        if (res.statusCode !== 200) {
            return tasks.error(JSON.stringify(tx))
        }
        tasks.run(t, tx, i)
    })
}

MetadataService.prototype._hash = function(elem, tasks, t, i) {
    let t1, t2
    t1 = tasks.add(tx => {
        Tx.cid(tx, tasks, t2)
    })
    t2 = tasks.add(cid => {
        tasks.run(t, this.hashFromCID(cid), i)
    })
    this._fromElement(elem, tasks, t1)
}

MetadataService.prototype._put = function(elem, tasks, t, i) {
    let t1, t2
    t1 = tasks.add(tx => {
        signTx(elem.sender, tx, tasks, t2)
    })
    t2 = tasks.add(tx => {
        request(this.url + '/transactions', {
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
            Tx.cid(json, tasks, t, i)
        })
    })
    this._fromElement(elem, tasks, t1)
}

MetadataService.prototype._toElement = (tx, path, tasks, t, i) => {
    if (path) {
        return tasks.run(t, order(tx), i)
    }
    const elem = {}
    if (tx.asset.data) {
        elem.data = tx.asset.data
    } else if (tx.asset.id) {
        elem.data = {
            '/': tx.asset.id + '/data'
        }
    }
    if (tx.inputs.length > 1) {
        return tasks.error(ErrMultipleInputs)
    }
    if (tx.inputs[0].owners_before.length > 1) {
        return tasks.error(ErrMultipleOwnersBefore)
    }
    elem.sender = {
        publicKey: tx.inputs[0].owners_before[0]
    }
    elem.recipient = new Array(tx.outputs.length)
    let output
    for (let j = 0; j < tx.outputs.length; j++) {
        output = tx.outputs[j]
        if (output.public_keys.length > 1) {
            return tasks.error(ErrMultiplePublicKeys)
        }
        elem.recipient[j] = {
            amount: Number(output.amount),
            publicKey: output.public_keys[0]
        }
    }
    tasks.run(t, order(elem), i)
}

MetadataService.prototype._resolve = Tx.resolve

module.exports = {
    MetadataService,
    Tx,
    ErrMultipleInputs,
    ErrMultiplePublicKeys,
    ErrMultipleOwnersBefore,
    errInvalidOwnerBefore,
    errUnexpectedOperation
}
