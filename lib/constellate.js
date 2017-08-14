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
    bufferToFile,
    capitalize,
    clone,
    errUnexpectedType,
    getType,
    isArray,
    isObject,
    isRecipient,
    isSender,
    isString,
    newArray,
    order,
    prettyJSON,
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

const readFilesAs = (files, readAs, tasks, t, i) => {
    let count = 0
    const t1 = tasks.add((result, j) => {
        files[j] = {
            content: isString(result) ? result : Buffer.from(result),
            name: files[j].name,
            type: files[j].type
        }
        if (++count !== files.length) return
        tasks.run(t, files, j)
    })
    for (let j = 0; j < files.length; j++) {
        readFileAs(files[j], readAs, tasks, t1, j)
    }
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
    browser,
    name,
    path
}) {

    let hashes, ld, names, resolver, service

    if (name === 'bigchaindb') {
        service = new BigchainDB.MetadataService(path)
    } else if (name === 'ipfs') {
        service = new Ipfs.MetadataService(path)
    } else {
        throw errUnsupportedService(name)
    }
    resolver = new Resolver(service)

    this.name = () => name

    this.path = () => path

    const resolveMetadata = (meta, tasks, t, i) => {
        const hashes = []
        const idxs = []
        let j
        for (j = 0; j < meta.length; j++) {
            if (isString(meta[j]['#'])) {
                hashes.push(meta[j]['#'])
                idxs.push(j)
            }
        }
        if (!hashes.length) {
            return tasks.run(t, meta, i)
        }
        const resolver = new Resolver(service)
        let count = 0
        const t1 = tasks.add((elem, j) => {
            elem.data['#'] = hashes[j]
            meta[idxs[j]] = elem.data
            if (++count !== hashes.length) return
            tasks.run(t, meta, i)
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

    const generateLinkedData = (ordered, sender, recipient, tasks, t, i) => {
        ld = [], names = []
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
                return tasks.run(t, i)
            }
            tasks.run(t1)
        })
        tasks.run(t1)
    }

    this._import = (meta, sender, recipient, tasks, t, i) => {
        hashes = {}
        meta = clone(meta)
        let t1, t2
        t1 = tasks.add(resolved => {
            orderMetadata(resolved, tasks, t2)
        })
        t2 = tasks.add(ordered => {
            generateLinkedData(ordered, sender, recipient, tasks, t, i)
        })
        resolveMetadata(meta, tasks, t1)
    }

    this._put = (sender, tasks, t, i) => {
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
        const addSender = isSender(sender)
        for (let j = 0; j < ld.length; j++) {
            if (addSender) {
                service.put(assign(ld[j], {
                    sender
                }), tasks, t1, j)
            } else {
                service.put(ld[j], tasks, t1, j)
            }
        }
    }

    this._get = (path, expand, tasks, t, i) => {
        const parts = path.split('/')
        const first = parts.shift()
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

    this.get = (path, expand, cb) => {
        const tasks = new Tasks(cb)
        this._get(path, expand, tasks, -1)
    }

    this.LinkedData = {}

    this.Hashes = {}

    if (browser) {

        this.Hashes._export = () => {
            if (!hashes) {
                throw ErrNoHashes
            }
            return new File(
                [prettyJSON(hashes)],
                'metadata_hashes.json', {
                    type: 'application/json'
                }
            )
        }

        this.Hashes.import = (file, cb) => {
            if (file.type !== 'application/json') {
                return cb(errUnexpectedType(file.type, 'application/json'))
            }
            const tasks = new Tasks(cb)
            tasks.add(text => {
                try {
                    hashes = JSON.parse(text)
                    tasks.run(-1)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFileAs(file, 'text', tasks, 0)
        }

        this.LinkedData._export = () => {
            if (!ld || !ld.length) {
                throw ErrNoLinkedData
            }
            return new File(
                [prettyJSON(ld)],
                'linked_data.json', {
                    type: 'application/json'
                }
            )
        }

        this.LinkedData._import = (file, cb) => {
            if (file.type !== 'application/json') {
                return cb(errUnexpectedType(file.type, 'application/json'))
            }
            const tasks = new Tasks(cb)
            tasks.add(text => {
                try {
                    ld = JSON.parse(text)
                    tasks.run(-1)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFileAs(file, 'text', tasks, 0)
        }

    } else {

        this.Hashes._export = () => {
            return hashes || {}
        }

        this.Hashes.import = (_hashes) => {
            hashes = _hashes
        }

        this.LinkedData._export = () => {
            return ld || []
        }

        this.LinkedData._import = (_ld) => {
            ld = _ld
        }
    }
}

function ContentService({
    browser,
    name,
    path
}) {

    let decryption, files, hashes, service

    if (name === 'ipfs') {
        service = new Ipfs.ContentService(path)
    } else if (name === 'swarm') {
        service = new Swarm.ContentService(path)
    } else {
        throw errUnsupportedService(name)
    }

    this.name = () => name

    this.path = () => path

    const encryptFiles = (password, tasks, t, i) => {
        const salt = crypto.randomBytes(saltLength)
        const t1 = tasks.add((dkey, hash) => {
            decryption = {
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
            tasks.run(t, i)
        })
        scrypt2x(password, salt, tasks, t1)
    }

    this._import = (_files, password, tasks, t, i) => {
        files = _files
        hashes = {}
        const meta = new Array(files.length)
        let count = 0,
            t1, t2
        t1 = tasks.add(() => {
            for (let j = 0; j < files.length; j++) {
                service.hash(files[j].content, tasks, t2, j)
            }
        })
        t2 = tasks.add((hash, j) => {
            hashes[files[j].name] = hash
            meta[j] = {
                contentUrl: service.pathToIRI(hash),
                name: files[j].name,
                type: capitalize(files[j].type.split('/')[0]) + 'Object'
            }
            if (++count !== files.length) return
            tasks.run(t, meta, i)
        })
        if (password) {
            return encryptFiles(password, tasks, t1)
        }
        tasks.run(t1)
    }

    this._get = (path, decrypt, tasks, t, i) => {
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
        service.get(path, tasks, t1, i)
    }

    this._put = (tasks, t, i) => {
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
        service.put(contents, tasks, t1)
    }

    this.Decryption = {}

    this.Hashes = {}

    if (browser) {

        this.get = (path, decrypt, cb) => {
            if (typeof decrypt === 'function') {
                [cb, decrypt] = [decrypt, {}]
            } else if (!cb) {
                throw ErrNoCallback
            }
            const tasks = new Tasks(cb)
            tasks.add(content => {
                bufferToFile(content, path, tasks, -1)
            })
            this._get(path, decrypt, tasks, 0)
        }

        this.Decryption._export = () => {
            if (!decryption) {
                throw ErrNoDecryption
            }
            return new File(
                [prettyJSON(decryption)],
                'decryption.json', {
                    type: 'application/json'
                }
            )
        }

        this.Decryption.import = (file, cb) => {
            if (file.type !== 'application/json') {
                return cb(errUnexpectedType(file.type, 'application/json'))
            }
            const tasks = new Tasks(cb)
            tasks.add(text => {
                try {
                    decryption = JSON.parse(text)
                    tasks.run(-1)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFileAs(file, 'text', tasks, 0)
        }

        this.Hashes._export = () => {
            if (!hashes) {
                throw ErrNoHashes
            }
            return new File(
                [prettyJSON(hashes)],
                'content_hashes.json', {
                    type: 'application/json'
                }
            )
        }

        this.Hashes.import = (file, cb) => {
            if (file.type !== 'application/json') {
                return cb(errUnexpectedType(file.type, 'application/json'))
            }
            const tasks = new Tasks(cb)
            tasks.add(text => {
                try {
                    hashes = JSON.parse(text)
                    tasks.run(-1)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFileAs(file, 'text', tasks, 0)
        }

    } else {

        this.Decryption._export = () => {
            return decryption || {}
        }

        this.Decryption.import = (_decryption) => {
            decryption = _decryption
        }

        this.Hashes._export = () => {
            return hashes || {}
        }

        this.Hashes.import = (_hashes) => {
            hashes = _hashes
        }

        this.get = (path, decrypt, cb) => {
            if (typeof decrypt === 'function') {
                [cb, decrypt] = [decrypt, {}]
            } else if (!cb) {
                throw ErrNoCallback
            }
            const tasks = new Tasks(cb)
            this._get(path, decrypt, tasks, -1)
        }
    }
}

function Account({
    browser
} = {}) {

    let account = {}

    this.publicKey = () => {
        return account.publicKey || ''
    }

    this._decrypt = (password, tasks, t, i) => {
        const t1 = tasks.add((dkey, hash) => {
            if (account.hash !== hash) {
                return tasks.error(errInvalidPassword(password))
            }
            const aesCtr = new aes.ModeOfOperation.ctr(dkey)
            const encryptedPrivateKey = Buffer.from(account.encryptedPrivateKey, 'hex')
            const privateKey = base58.encode(Buffer.from(aesCtr.decrypt(encryptedPrivateKey).buffer))
            tasks.run(t, privateKey, i)
        })
        try {
            const salt = Buffer.from(account.salt, 'hex')
            return scrypt2x(password, salt, tasks, t1)
        } catch (err) {
            tasks.errror(err)
        }
    }

    this._import = (acc, password, tasks, t, i) => {
        const t1 = tasks.add((dkey, hash) => {
            if (acc.hash !== hash) {
                return tasks.error(errInvalidPassword(password))
            }
            account = acc
            tasks.run(t, i)
        })
        const salt = Buffer.from(acc.salt, 'hex')
        scrypt2x(password, salt, tasks, t1)
    }

    this._generate = (password, tasks, t, i) => {
        const keypair = nacl.sign.keyPair()
        const salt = crypto.randomBytes(saltLength)
        const t1 = tasks.add((dkey, hash) => {
            const aesCtr = new aes.ModeOfOperation.ctr(dkey)
            const encryptedPrivateKey = Buffer.from(
                aesCtr.encrypt(keypair.secretKey.slice(0, 32)).buffer
            ).toString('hex')
            account = {
                encryptedPrivateKey,
                hash,
                publicKey: base58.encode(keypair.publicKey),
                salt: salt.toString('hex')
            }
            tasks.run(t, account, i)
        })
        scrypt2x(password, salt, tasks, t1)
    }

    if (browser) {

        this.generate = (password, cb) => {
            const tasks = new Tasks(cb)
            tasks.add(account => {
                const file = new File(
                    [prettyJSON(account)],
                    'account.json', {
                        type: 'application/json'
                    }
                )
                tasks.run(-1, file)
            })
            this._generate(password, tasks, 0)
        }

        this.import = (file, password, cb) => {
            if (file.type !== 'application/json') {
                throw errUnexpectedType(file.type, 'application/json')
            }
            const tasks = new Tasks(cb)
            tasks.add(text => {
                try {
                    const account = JSON.parse(text)
                    this._import(account, password, tasks, -1)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFileAs(file, 'text', tasks, 0)
        }

    } else {

        this.generate = (password, cb) => {
            const tasks = new Tasks(cb)
            this._generate(password, tasks, -1)
        }

        this.import = (account, password, cb) => {
            const tasks = new Tasks(cb)
            this._import(account, password, tasks, -1)
        }
    }
}

function Project({
    account,
    browser,
    contentService,
    metadataService,
    title
}) {

    contentService = new ContentService({
        name: contentService.name,
        path: contentService.path
    })

    metadataService = new MetadataService({
        name: metadataService.name,
        path: metadataService.path
    })

    this._import = (content, metadata, password, tasks, t, i) => {
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

    this._upload = (password, tasks, t, i) => {
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

    this._export = (name) => {
        switch (name) {
            case 'content_decryption':
                return contentService.Decryption._export()
            case 'content_hashes':
                return contentService.Hashes._export()
            case 'linked_data':
                return metadataService.LinkedData._export()
            case 'metadata_hashes':
                return metadataService.Hashes._export()
            default:
                throw new Error('unexpected export: ' + name)
        }
    }

    this.upload = (password, cb) => {
        if (typeof password === 'function') {
            [cb, password] = [password, '']
        } else if (!cb) {
            throw ErrNoCallback
        }
        const tasks = new Tasks(cb)
        this._upload(password, tasks, -1)
    }

    if (browser) {

        this.export = (name) => {
            return new File(
                [prettyJSON(this._export(name))],
                `${title}_${name}.json`, {
                    type: 'application/json'
                }
            )
        }

        this.import = (content, metadata, password, cb) => {
            if (typeof password === 'function') {
                [cb, password] = [password, '']
            } else if (!cb) {
                throw ErrNoCallback
            }
            const tasks = new Tasks(cb)
            const args = [null, null, password, tasks, -1]
            let count = 0
            tasks.add((result, j) => {
                try {
                    if (!j) {
                        args[0] = result
                    } else {
                        args[1] = JSON.parse(result)
                    }
                    if (++count !== 2) return
                    this._import(...args)
                } catch (err) {
                    tasks.error(err)
                }
            })
            readFilesAs(content, 'arraybuffer', tasks, 0, 0)
            readFileAs(metadata, 'text', tasks, 0, 1)
        }

    } else {

        this.export = this._export

        this.import = (content, metadata, password, cb) => {
            if (typeof password === 'function') {
                [cb, password] = [password, '']
            } else if (!cb) {
                throw ErrNoCallback
            }
            const tasks = new Tasks(cb)
            this._import(content, metadata, password, tasks, -1)
        }
    }
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