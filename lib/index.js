'use strict'

const aes = require('aes-js')
const base58 = require('bs58')
const crypto = require('crypto')
const nacl = require('tweetnacl')
const request = require('xhr-request')
const scrypt = require('scrypt-async')

const BigchainDB = require('../lib/bigchaindb')
// const Fingerprint = require('../lib/fingerprint')
const Ipfs = require('../lib/ipfs')
const Resolver = require('../lib/resolver')
const Swarm = require('../lib/swarm')

const {
    Tasks,
    assign,
    capitalize,
    clone,
    errUnexpectedType,
    isRecipient,
    isSender,
    isString,
    order,
    readFileAs,
    transform,
    traverse
} = require('../lib/util')

//      

/**
 * @module constellate/src/constellate
 */

const ErrNoAccount = new Error('no account')
const ErrNoCallback = new Error('no callback')
const ErrNoDecryption = new Error('no decryption')
const ErrNoLinkedData = new Error('no elements')
const ErrNoHashes = new Error('no hashes')

const errUnexpectedHash = (actual, expected) => {
    return new Error(`expected hash="${expected}", got "${actual}"`)
}

const errInvalidPassword = (password) => {
    return new Error('invalid password: ' + password)
}

const errUnsupportedService = (name) => {
    return new Error(`"${name}" is not supported`)
}

const keyLength = 32
const saltLength = 20

const options = {
    N: 16384,
    r: 8,
    p: 1,
    dkLen: keyLength,
    encoding: 'hex'
}

const scrypt2x = (password, salt, tasks, t, i) => {
    scrypt(password, salt, options, result => {
        const dkey = Buffer.from(result, 'hex')
        scrypt(dkey, salt, options, hash => {
            tasks.run(t, dkey, hash, i)
        })
    })
}

function MetadataService({
    account,
    name,
    path
}) {

    this._account = account

    if (name === 'bigchaindb') {
        this._service = new BigchainDB.MetadataService(path)
    } else if (name === 'ipfs') {
        this._service = new Ipfs.MetadataService(path)
    } else {
        throw errUnsupportedService(name)
    }

    this._resolver = new Resolver(this._service)
}

MetadataService.prototype._resolveMetadata = function(metadata, tasks, t, i) {
    const hashes = []
    const idxs = []
    const resolver = this._resolver
    const service = this._service
    let j
    for (j = 0; j < metadata.length; j++) {
        if (isString(metadata[j]['#'])) {
            hashes.push(metadata[j]['#'])
            idxs.push(j)
        }
    }
    if (!hashes.length) {
        return tasks.run(t, metadata, i)
    }
    let count = 0
    const t1 = tasks.add((elem, j) => {
        elem.data['#'] = hashes[j]
        metadata[idxs[j]] = elem.data
        if (++count !== hashes.length) return
        tasks.run(t, metadata, i)
    })
    let val
    for (j = 0; j < hashes.length; j++) {
        try {
            val = service.pathToCID(hashes[j])
            resolver.get(val.cid, val.remPath, tasks, t1, j)
        } catch (err) {
            tasks.error(err)
        }
    }
}

const orderMetadata = (resolved, tasks, t, i) => {
    const ordered = []
    let next, obj, queue = [],
        stop = false
    while (resolved.length) {
        if (next) {
            const idx = resolved.findIndex(obj => obj.name === next)
            if (idx < 0) {
                return tasks.error(`could not find "${next}"`)
            }
            obj = resolved.splice(idx, 1)[0]
        } else {
            obj = resolved.shift()
        }
        if (!obj.name) {
            return tasks.error('no metadata name')
        }
        next = ''
        traverse(obj, (_, val) => {
            if (isString(val) && val[0] === '@') {
                val = val.slice(1)
                if (!next && ordered.every(obj => obj.name !== val)) {
                    if (queue.includes(val)) {
                        stop = true
                        return tasks.error(`circular reference between ${val} and ${obj.name}`)
                    }
                    resolved.push(obj)
                    next = val
                    queue.push(obj.name)
                }
            }
        })
        if (stop) return
        if (next) continue
        ordered.push(obj)
        queue = []
    }
    tasks.run(t, ordered, i)
}

MetadataService.prototype._generateLinkedData = function(ordered, sender, recipient, tasks, t, i) {
    const hashes = this._hashes
    const ld = []
    const names = []
    const service = this._service
    const parties = {}
    if (isSender(sender)) {
        parties.sender = sender
    }
    if (isRecipient(recipient)) {
        parties.recipient = recipient
    }
    let count = 0,
        data, elem, t1, t2
    t1 = tasks.add(() => {
        if (ordered[count]['#']) {
            return tasks.run(t2, ordered[count]['#'])
        }
        data = clone(ordered[count])
        names.push(data.name)
        data.name = data.name.match(/^(.+?)\s*(?:\s*?\(.*?\))?$/)[1]
        data = order(transform(data, val => {
            if (isString(val)) {
                if (val[0] === '@') {
                    return {
                        '/': hashes[val.slice(1)]
                    }
                }
                if (val[0] === '#') {
                    return {
                        '/': val.slice(1)
                    }
                }
            }
            return val
        }))
        elem = Object.assign({
            data
        }, parties)
        ld.push(elem)
        service.hash(elem, tasks, t2)
    })
    t2 = tasks.add(hash => {
        hashes[ordered[count].name] = hash
        if (++count === ordered.length) {
            this._ld = ld
            this._names = names
            return tasks.run(t, i)
        }
        tasks.run(t1)
    })
    tasks.run(t1)
}

MetadataService.prototype._import = function(metadata, sender, recipient, tasks, t, i) {
    this._hashes = {}
    metadata = clone(metadata)
    let t1, t2
    t1 = tasks.add(resolved => {
        orderMetadata(resolved, tasks, t2)
    })
    t2 = tasks.add(ordered => {
        this._generateLinkedData(ordered, sender, recipient, tasks, t, i)
    })
    this._resolveMetadata(metadata, tasks, t1)
}

MetadataService.prototype._put = function(sender, tasks, t, i) {
    const hashes = this._hashes
    const names = this._names
    const ld = this._ld
    const service = this._service
    if (!ld || !ld.length) {
        return tasks.error(ErrNoLinkedData)
    }
    let count = 0,
        hash
    const t1 = tasks.add((cid, j) => {
        hash = service.hashFromCID(cid)
        if (hash !== hashes[names[j]]) {
            return tasks.error(errUnexpectedHash(hash, hashes[names[j]]))
        }
        if (++count !== ld.length) return
        tasks.run(t, i)
    })
    const useSender = isSender(sender)
    for (let j = 0; j < ld.length; j++) {
        if (useSender) {
            service.put(assign(ld[j], {
                sender
            }), tasks, t1, j)
        } else {
            service.put(ld[j], tasks, t1, j)
        }
    }
}

MetadataService.prototype._get = function(path, expand, tasks, t, i) {
    const hashes = this._hashes
    const parts = path.split('/')
    const first = parts.shift()
    const resolver = this._resolver
    const service = this._service
    if (hashes[first]) {
        path = hashes[first]
        if (parts.length) {
            path += '/' + parts.join('/')
        }
    }
    const t1 = tasks.add(result => {
        if (expand) {
            return resolver.expand(result, tasks, t)
        }
        tasks.run(t, result)
    })
    try {
        const {
            cid,
            remPath
        } = service.pathToCID(path)
        resolver.get(cid, remPath, tasks, t1)
    } catch (err) {
        tasks.error(err)
    }
}

MetadataService.prototype.get = function(path, expand, cb) {
    const tasks = new Tasks(cb)
    this._get(path, expand, tasks, -1)
}

MetadataService.prototype._transfer = function(path, recipient, password, tasks, t, i) {
    const account = this._account
    const hashes = this._hashes
    const service = this._service
    if (!account) {
        return tasks.error(ErrNoAccount)
    }
    const parts = path.split('/')
    const first = parts.shift()
    if (hashes[first]) {
        path = hashes[first]
        if (parts.length) {
            path += '/' + parts.join('/')
        }
    }
    let t1, t2
    t1 = tasks.add(privateKey => {
        const publicKey = account.publicKey()
        service.put({
            data: {
                '/': path
            },
            sender: {
                privateKey,
                publicKey
            },
            recipient
        }, tasks, t2)
    })
    t2 = tasks.add(cid => {
        tasks.run(t, service.hashFromCID(cid), i)
    })
    account._decrypt(password, tasks, t1)
}

MetadataService.prototype.transfer = function(path, recipient, password, cb) {
    const tasks = new Tasks(cb)
    this._transfer(path, recipient, password, tasks, -1)
}

MetadataService.prototype._exportHashes = function() {
    return this._hashes || {}
}

MetadataService.prototype.importHashes = function(hashes) {
    this._hashes = hashes
}

MetadataService.prototype._exportLinkedData = function() {
    return this._ld || []
}

MetadataService.prototype.importLinkedData = function(ld) {
    this._ld = ld
}

function ContentService({
    name,
    path
}) {
    if (name === 'ipfs') {
        this._service = new Ipfs.ContentService(path)
    } else if (name === 'swarm') {
        this._service = new Swarm.ContentService(path)
    } else {
        throw errUnsupportedService(name)
    }
}

ContentService.prototype._encryptFiles = function(password, tasks, t, i) {
    const files = this._files
    const salt = crypto.randomBytes(saltLength)
    const t1 = tasks.add((dkey, hash) => {
        const decryption = {
            hash,
            keys: {},
            salt: salt.toString('hex')
        }
        const aesCtrDkey = new aes.ModeOfOperation.ctr(dkey)
        let aesCtrKey, key
        for (let j = 0; j < files.length; j++) {
            key = crypto.randomBytes(keyLength)
            aesCtrKey = new aes.ModeOfOperation.ctr(key)
            files[j] = {
                content: Buffer.from(aesCtrKey.encrypt(files[j].content).buffer),
                name: files[j].name,
                type: files[j].type
            }
            key = Buffer.from(aesCtrDkey.encrypt(key).buffer)
            decryption.keys[files[j].name] = key.toString('hex')
        }
        this._decryption = decryption
        tasks.run(t, i)
    })
    scrypt2x(password, salt, tasks, t1)
}

ContentService.prototype._import = function(files, password, tasks, t, i) {
    this._files = files
    const hashes = {}
    const metadata = new Array(files.length)
    const service = this._service
    let count = 0,
        t1, t2
    t1 = tasks.add(() => {
        for (let j = 0; j < files.length; j++) {
            service.hash(files[j].content, tasks, t2, j)
        }
    })
    t2 = tasks.add((hash, j) => {
        hashes[files[j].name] = hash
        metadata[j] = {
            contentUrl: service.pathToURL(hash),
            name: files[j].name,
            type: capitalize(files[j].type.split('/')[0]) + 'Object'
        }
        if (++count !== files.length) return
        this._hashes = hashes
        tasks.run(t, metadata, i)
    })
    if (password) {
        return this._encryptFiles(password, tasks, t1)
    }
    tasks.run(t1)
}

ContentService.prototype._get = function(path, decrypt, tasks, t, i) {
    const decryption = this._decryption
    const hashes = this._hashes
    const parts = path.split('/')
    const first = parts.shift()
    if (hashes[first]) {
        path = hashes[first]
        if (parts.length) {
            path += '/' + parts.join('/')
        }
    }
    let t1 = t
    if (decrypt && decrypt.password) {
        let content, key, t2
        t1 = tasks.add(_content => {
            content = _content
            decrypt.name = decrypt.name || first
            key = decryption.keys[decrypt.name]
            if (!key) {
                return tasks.error('no decryption key for name: ' + decrypt.name)
            }
            const salt = Buffer.from(decryption.salt, 'hex')
            scrypt2x(decrypt.password, salt, tasks, t2)
        })
        t2 = tasks.add((dkey, hash) => {
            if (decryption.hash !== hash) {
                return tasks.error(errInvalidPassword(decrypt.password))
            }
            try {
                let aesCtr = new aes.ModeOfOperation.ctr(dkey)
                key = Buffer.from(aesCtr.decrypt(Buffer.from(key, 'hex')).buffer)
                aesCtr = new aes.ModeOfOperation.ctr(key)
                content = Buffer.from(aesCtr.decrypt(content).buffer)
                tasks.run(t, content, i)
            } catch (err) {
                tasks.error(err)
            }
        })
    }
    this._service.get(path, tasks, t1, i)
}

ContentService.prototype._put = function(tasks, t, i) {
    const files = this._files
    const hashes = this._hashes
    if (!files.length) {
        return tasks.error('no files')
    }
    let count = 0
    const t1 = tasks.add(results => {
        for (let j = 0; j < files.length; j++) {
            if (results[j] !== hashes[files[j].name]) {
                return tasks.error(errUnexpectedHash(results[j], hashes[files[j].name]))
            }
        }
        tasks.run(t, i)
    })
    const contents = files.map(file => file.content)
    this._service.put(contents, tasks, t1)
}

ContentService.prototype._exportDecryption = function() {
    return this._decryption || {}
}

ContentService.prototype.importDecryption = function(decryption) {
    this._decryption = decryption
}

ContentService.prototype._exportHashes = function() {
    return this._hashes || {}
}

ContentService.prototype.importHashes = function(hashes) {
    this._hashes = hashes
}

ContentService.prototype.get = function(path, decrypt, cb) {
    if (typeof decrypt === 'function') {
        [cb, decrypt] = [decrypt, {}]
    } else if (!cb) {
        throw ErrNoCallback
    }
    const tasks = new Tasks(cb)
    this._get(path, decrypt, tasks, -1)
}

function Account() {}

Account.prototype.publicKey = function() {
    return this._data.publicKey || ''
}

Account.prototype._decrypt = function(password, tasks, t, i) {
    const data = this._data
    const t1 = tasks.add((dkey, hash) => {
        if (data.hash !== hash) {
            return tasks.error(errInvalidPassword(password))
        }
        const aesCtr = new aes.ModeOfOperation.ctr(dkey)
        const encryptedPrivateKey = Buffer.from(data.encryptedPrivateKey, 'hex')
        const privateKey = base58.encode(Buffer.from(aesCtr.decrypt(encryptedPrivateKey).buffer))
        tasks.run(t, privateKey, i)
    })
    try {
        const salt = Buffer.from(data.salt, 'hex')
        return scrypt2x(password, salt, tasks, t1)
    } catch (err) {
        tasks.error(err)
    }
}

Account.prototype._import = function(data, password, tasks, t, i) {
    const t1 = tasks.add((dkey, hash) => {
        if (data.hash !== hash) {
            return tasks.error(errInvalidPassword(password))
        }
        this._data = data
        tasks.run(t, i)
    })
    const salt = Buffer.from(data.salt, 'hex')
    scrypt2x(password, salt, tasks, t1)
}

Account.prototype._generate = function(password, tasks, t, i) {
    const keypair = nacl.sign.keyPair()
    const salt = crypto.randomBytes(saltLength)
    const t1 = tasks.add((dkey, hash) => {
        const aesCtr = new aes.ModeOfOperation.ctr(dkey)
        const encryptedPrivateKey = Buffer.from(
            aesCtr.encrypt(keypair.secretKey.slice(0, 32)).buffer
        ).toString('hex')
        this._data = {
            encryptedPrivateKey,
            hash,
            publicKey: base58.encode(keypair.publicKey),
            salt: salt.toString('hex')
        }
        tasks.run(t, clone(this._data), i)
    })
    scrypt2x(password, salt, tasks, t1)
}

Account.prototype.generate = function(password, cb) {
    const tasks = new Tasks(cb)
    this._generate(password, tasks, -1)
}

Account.prototype.import = function(account, password, cb) {
    const tasks = new Tasks(cb)
    this._import(account, password, tasks, -1)
}

function Project({
    account,
    contentService,
    metadataService,
    title
}) {

    this._account = account

    this._contentService = new ContentService({
        name: contentService.name,
        path: contentService.path
    })

    this._metadataService = new MetadataService({
        name: metadataService.name,
        path: metadataService.path
    })

    this._title = title
}

Project.prototype._import = function(content, metadata, password, tasks, t, i) {
    const account = this._account
    const contentService = this._contentService
    const metadataService = this._metadataService
    const publicKey = account ? account.publicKey() : ''
    const t1 = tasks.add(meta => {
        metadataService._import(metadata.concat(meta), {
            publicKey
        }, {
            amount: 1,
            publicKey
        }, tasks, t, i)
    })
    contentService._import(content, password, tasks, t1)
}

Project.prototype._upload = function(password, tasks, t, i) {
    const account = this._account
    const contentService = this._contentService
    const metadataService = this._metadataService
    let t1, t2
    t2 = tasks.add(() => {
        contentService._put(tasks, t, i)
    })
    const publicKey = account ? account.publicKey() : ''
    if (!publicKey) {
        return metadataService._put({}, tasks, t2)
    }
    t1 = tasks.add(privateKey => {
        metadataService._put({
            privateKey,
            publicKey
        }, tasks, t2)
    })
    account._decrypt(password, tasks, t1)
}

Project.prototype._export = function(name) {
    const contentService = this._contentService
    const metadataService = this._metadataService
    switch (name) {
        case 'content_decryption':
            return contentService._exportDecryption()
        case 'content_hashes':
            return contentService._exportHashes()
        case 'linked_data':
            return metadataService._exportLinkedData()
        case 'metadata_hashes':
            return metadataService._exportHashes()
        default:
            throw new Error('unexpected export: ' + name)
    }
}

Project.prototype.upload = function(password, cb) {
    if (typeof password === 'function') {
        [cb, password] = [password, '']
    } else if (!cb) {
        throw ErrNoCallback
    }
    const tasks = new Tasks(cb)
    this._upload(password, tasks, -1)
}

Project.prototype.export = Project.prototype._export

Project.prototype.import = function(content, metadata, password, cb) {
    if (typeof password === 'function') {
        [cb, password] = [password, '']
    } else if (!cb) {
        throw ErrNoCallback
    }
    const tasks = new Tasks(cb)
    this._import(content, metadata, password, tasks, -1)
}

module.exports = {
    Account,
    ContentService,
    MetadataService,
    Project,
    ErrNoAccount,
    ErrNoCallback,
    ErrNoDecryption,
    ErrNoLinkedData,
    ErrNoHashes,
    errInvalidPassword,
    errUnexpectedHash,
    errUnsupportedService
}