'use strict'

const constellate = require('../lib')

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
 * @module constellate/src/constellate-browser
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

ContentService.prototype.get = function(path, decrypt, cb) {
    if (typeof decrypt === 'function') {
        [cb, decrypt] = [decrypt, {}]
    } else if (!cb) {
        throw constellate.ErrNoCallback
    }
    const tasks = new Tasks(cb)
    tasks.add(content => {
        bufferToFile(content, path, tasks, -1)
    })
    this._get(path, decrypt, tasks, 0)
}

ContentService.prototype._exportDecryption = function() {
    const decryption = this._decryption
    if (!decryption) {
        throw constellate.ErrNoDecryption
    }
    return new File(
        [prettyJSON(decryption)],
        'decryption.json', {
            type: 'application/json'
        }
    )
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

ContentService.prototype._exportHashes = function() {
    const hashes = this._hashes
    if (!hashes) {
        throw constellate.ErrNoHashes
    }
    return new File(
        [prettyJSON(hashes)],
        'content_hashes.json', {
            type: 'application/json'
        }
    )
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

MetadataService.prototype._exportHashes = function() {
    const hashes = this._hashes
    if (!hashes) {
        throw constellate.ErrNoHashes
    }
    return new File(
        [prettyJSON(hashes)],
        'metadata_hashes.json', {
            type: 'application/json'
        }
    )
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

MetadataService.prototype._exportLinkedData = function() {
    const ld = this._ld
    if (!ld || !ld.length) {
        throw constellate.ErrNoLinkedData
    }
    return new File(
        [prettyJSON(ld)],
        'linked_data.json', {
            type: 'application/json'
        }
    )
}

MetadataService.prototype.importLinkedData = function(file, cb) {
    if (file.type !== 'application/json') {
        return cb(errUnexpectedType(file.type, 'application/json'))
    }
    const tasks = new Tasks(cb)
    tasks.add(text => {
        try {
            this._ld = JSON.parse(text)
            tasks.run(-1)
        } catch (err) {
            tasks.error(err)
        }
    })
    readFileAs(file, 'text', tasks, 0)
}

function Project(params) {
    constellate.Project.call(this, params)
}

Project.prototype = Object.create(constellate.Project.prototype)

Project.prototype.export = function(name) {
    return new File(
        [prettyJSON(this._export(name))],
        `${this._title}_${name}.json`, {
            type: 'application/json'
        }
    )
}

Project.prototype.import = function(content, metadata, password, cb) {
    if (typeof password === 'function') {
        [cb, password] = [password, '']
    } else if (!cb) {
        throw constellate.ErrNoCallback
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

module.exports = {
    Account,
    ContentService,
    MetadataService,
    Project
}