'use strict'

const constellate = require('../lib')
const parse = require('/path/to/js-coalaip/src/parse')

const {
    Tasks,
    bufferToFile,
    errUnexpectedType,
    isString,
    prettyJSON,
    readFileAs
} = require('../lib/util')

//      

/**
 * @module constellate/src/browser
 */

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

function Account() {
    constellate.Account.call(this)
}

Account.prototype = Object.create(constellate.Account.prototype)

Account.prototype.generate = function(password, cb) {
    const tasks = new Tasks(cb)
    tasks.add(data => {
        const file = new File(
            [prettyJSON(data)],
            'account.json', {
                type: 'application/json'
            }
        )
        tasks.run(-1, file)
    })
    this._generate(password, tasks, 0)
}

Account.prototype.import = function(file, password, cb) {
    if (file.type !== 'application/json') {
        throw errUnexpectedType(file.type, 'application/json')
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            const data = JSON.parse(text)
            this._import(data, password, tasks, -1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

function ContentService(params) {
    constellate.ContentService.call(this, params)
}

ContentService.prototype = Object.create(constellate.ContentService.prototype)

ContentService.prototype.exportDecryption = function() {
    const decryption = this.decryption
    return new File(
        [prettyJSON(decryption)],
        'decryption.json', {
            type: 'application/json'
        }
    )
}

ContentService.prototype.exportHashes = function() {
    const hashes = this._hashes
    return new File(
        [prettyJSON(hashes)],
        'content_hashes.json', {
            type: 'application/json'
        }
    )
}

ContentService.prototype.get = function(path, decrypt, cb) {
    if (typeof decrypt === 'function') {
        [cb, decrypt] = [decrypt, {}]
    }
    const tasks = new Tasks(cb)
    tasks.add(content => {
        bufferToFile(content, path, tasks, -1)
    })
    this._get(path, decrypt, tasks, 0)
}

ContentService.prototype.importDecryption = function(file, cb) {
    if (file.type !== 'application/json') {
        return cb(errUnexpectedType(file.type, 'application/json'))
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            this._decryption = JSON.parse(text)
            tasks.run(-1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

ContentService.prototype.importHashes = function(file, cb) {
    if (file.type !== 'application/json') {
        return cb(errUnexpectedType(file.type, 'application/json'))
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            this._hashes = JSON.parse(text)
            tasks.run(-1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

function MetadataService(params) {
    constellate.MetadataService.call(this, params)
}

MetadataService.prototype = Object.create(constellate.MetadataService.prototype)

MetadataService.prototype.exportHashes = function() {
    const hashes = this._hashes
    return new File(
        [prettyJSON(hashes)],
        'metadata_hashes.json', {
            type: 'application/json'
        }
    )
}

MetadataService.prototype.import = function(file, recipient, cb) {
    if (file.type !== 'application/json') {
        return cb(errUnexpectedType(file.type, 'application/json'))
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            const metadata = JSON.parse(text).map(data => {
                return parse(data)
            })
            this._import(metadata, recipient, tasks, -1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

MetadataService.prototype.importHashes = function(file, cb) {
    if (file.type !== 'application/json') {
        return cb(errUnexpectedType(file.type, 'application/json'))
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            this._hashes = JSON.parse(text)
            tasks.run(-1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

module.exports = {
    Account,
    ContentService,
    MetadataService
}