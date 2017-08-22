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
    Person,
    AudioObject,
    ImageObject,
    VideoObject
} = require('/path/to/js-coalaip/src/core')

const {
    Tasks,
    assign,
    capitalize,
    clone,
    errUnexpectedType,
    isRecipient,
    // isSender,
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

MetadataService.prototype._import = function(metadata, recipient, tasks, t, i) {
    const account = this._account
    const elems = []
    const hashes = {}
    const parties = {}
    const publicKey = account ? account.publicKey() : ''
    if (publicKey) {
        parties.sender = {
            publicKey
        }
    }
    if (isRecipient(recipient)) {
        parties.recipient = recipient
    }
    let count = 0,
        data, elem, meta, name, t1, t2
    t1 = tasks.add(() => {
        meta = metadata[count]
        if (meta.path) {
            return tasks.run(t2, meta.path)
        }
        data = meta.data('ipld')
        elem = Object.assign({
            data
        }, parties)
        elems.push(elem)
        this._service.hash(elem, tasks, t2)
    })
    t2 = tasks.add(hash => {
        if (meta instanceof Person) {
            name = meta.getGivenName() + ' ' + meta.getFamilyName()
        } else {
            name = meta.getName()
        }
        name = name || hash
        hashes[name] = meta.path = hash
        if (++count !== metadata.length) {
            return tasks.run(t1)
        }
        this._elems = elems
        this._hashes = hashes
        this._metadata = metadata
        tasks.run(t, i)
    })
    tasks.run(t1)
}

MetadataService.prototype._put = function(password, tasks, t, i) {
    const account = this._account
    const elems = this._elems
    const metadata = this._metadata
    const publicKey = account ? account.publicKey() : ''
    const service = this._service
    let count = 0,
        hash, j, t1, t2
    t2 = tasks.add((cid, j) => {
        hash = service.hashFromCID(cid)
        if (hash !== metadata[j].path) {
            return tasks.error(errUnexpectedHash(hash, metadata[j].path))
        }
        if (++count !== elems.length) return
        tasks.run(t, i)
    })
    if (password && publicKey) {
        t1 = tasks.add(privateKey => {
            const sender = {
                privateKey,
                publicKey
            }
            for (j = 0; j < elems.length; j++) {
                service.put(assign(elems[j], {
                    sender
                }), tasks, t2, j)
            }
        })
        account._decrypt(password, tasks, t1)
    } else {
        for (j = 0; j < elems.length; j++) {
            service.put(elems[j], tasks, t2, j)
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

MetadataService.prototype.import = function(metadata, recipient, cb) {
    const tasks = new Tasks(cb)
    this._import(metadata, recipient, tasks, -1)
}

MetadataService.prototype.get = function(path, expand, cb) {
    const tasks = new Tasks(cb)
    this._get(path, expand, tasks, -1)
}

MetadataService.prototype.put = function(sender, cb) {
    const tasks = new Tasks(cb)
    this._put(sender, tasks, -1)
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

MetadataService.prototype.exportHashes = function() {
    return this._hashes || {}
}

MetadataService.prototype.importHashes = function(hashes) {
    this._hashes = hashes
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
        type, t1, t2
    t1 = tasks.add(() => {
        for (let j = 0; j < files.length; j++) {
            service.hash(files[j].content, tasks, t2, j)
        }
    })
    t2 = tasks.add((hash, j) => {
        hashes[files[j].name] = hash
        type = files[j].type.split('/')[0]
        if (type === 'audio') {
            metadata[j] = new AudioObject()
        } else if (type === 'image') {
            metadata[j] = new ImageObject()
        } else if (type === 'video') {
            metadata[j] = new VideoObject()
        } else {
            throw errUnexpectedType(type, 'audio|image|video')
        }
        metadata[j].setContentUrl(service.pathToURL(hash))
        metadata[j].setEncodingFormat(files[j].type)
        metadata[j].setName(files[j].name)
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
        const decryption = this._decryption
        if (!decryption) {
            return tasks.error(ErrNoDecryption)
        }
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

ContentService.prototype.exportDecryption = function() {
    return this._decryption || {}
}

ContentService.prototype.importDecryption = function(decryption) {
    this._decryption = decryption
}

ContentService.prototype.exportHashes = function() {
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

ContentService.prototype.put = function(cb) {
    const tasks = new Tasks(cb)
    this._put(tasks, -1)
}

ContentService.prototype.import = function(files, password, cb) {
    if (typeof password === 'function') {
        [cb, password] = [password, '']
    } else if (!cb) {
        throw ErrNoCallback
    }
    const tasks = new Tasks(cb)
    this._import(files, password, tasks, -1)
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

module.exports = {
    Account,
    ContentService,
    MetadataService,
    ErrNoAccount,
    ErrNoCallback,
    ErrNoDecryption,
    errInvalidPassword,
    errUnexpectedHash,
    errUnsupportedService
}