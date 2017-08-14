'use strict'

const EventEmitter = require('events')
const fileType = require('file-type')
const fs = require('fs')

//      

/**
 * @module constellate/src/util
 */

exports.assign = (...objs) => {
    return Object.assign({}, ...objs)
}

exports.bufferToArrayBuffer = (buf) => {
    // from https://stackoverflow.com/a/31394257
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
}

exports.bufferToFile = (buf, name, tasks, t, i) => {
    const ab = exports.bufferToArrayBuffer(buf)
    let type = fileType(buf.slice(0, 4100))
    if (!type) {
        return tasks.error('could not get file type')
    }
    type = type.mime.split('/')[0] + '/' + type.ext // e.g. audio/mpeg -> audio/mp3
    const file = new File([ab], name, {
        type
    })
    tasks.run(t, file, i)
}

exports.capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

exports.clone = (x) => {
    return JSON.parse(JSON.stringify(x))
}

exports.errInvalidElement = (elem) => {
    return new Error('invalid element: ' + JSON.stringify(elem))
}

exports.errPathNotFound = (path) => {
    return new Error('path not found: ' + path)
}

exports.errUnexpectedCID = (cid) => {
    return new Error('unexpected cid: ' + cid.toJSON())
}

exports.errUnexpectedType = (actual, expected) => {
    return new Error(`expected type="${expected}", got "${actual}"`)
}

exports.fileToAnchor = (file, type) => {
    const a = document.createElement('a')
    a.setAttribute('href', URL.createObjectURL(file))
    a.setAttribute('download', file.name)
    a.innerText = file.name
    return a
}

// from https://toddmotto.com/understanding-javascript-types-and-reliable-type-checking/

exports.getType = (x) => {
    if (x.constructor) {
        return x.constructor.name
    }
    return Object.prototype.toString.call(x).slice(8, -1)
}

const isArray = (x, isType) => {
    return x instanceof Array && (!isType || x.every(isType))
}

exports.isArray = isArray

exports.isBoolean = (x) => {
    return typeof x === 'boolean'
}

exports.isFunction = (x) => {
    return typeof x === 'function'
}

exports.isNumber = (x) => {
    return typeof x === 'number'
}

const isObject = (x) => {
    return x && x.constructor === Object
}

exports.isObject = isObject

const isString = (x) => {
    return typeof x === 'string'
}

exports.isString = isString

exports.isMerkleLink = (x) => {
    return x && x['/'] && Object.keys(x).length === 1
}

exports.isSender = (sender) => {
    return sender && sender.publicKey && isString(sender.publicKey)
}

exports.isRecipient = (recipient) => {
    if (isObject(recipient)) {
        return recipient.amount && exports.isNumber(recipient.amount) &&
            recipient.publicKey && isString(recipient.publicKey)
    }
    if (isArray(recipient, isObject)) {
        return recipient.every(recipient => {
            return recipient.amount && exports.isNumber(recipient.amount) &&
                recipient.publicKey && isString(recipient.publicKey)
        })
    }
    return false
}

exports.isElement = (x) => {
    return isObject(x.data) &&
        (!x.sender || exports.isSender(x.sender)) &&
        (!x.recipient || exports.isRecipient(x.recipient))
}

exports.newArray = (_default, length) => {
    return (Array).apply(null, {
        length
    }).map(() => _default)
}

exports.sort = (x, y) => {
    let i
    if (isArray(x) && isArray(y)) {
        x.sort(exports.sort)
        y.sort(exports.sort)
        let result
        for (i = 0; i < x.length && i < y.length; i++) {
            result = exports.sort(x[i], y[i])
            if (result) return result
        }
        return 0
    }
    if (isObject(x) && isObject(y)) {
        const xkeys = Object.keys(x).sort()
        const ykeys = Object.keys(y).sort()
        for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
            if (xkeys[i] < ykeys[i]) return -1
            if (xkeys[i] > ykeys[i]) return 1
        }
        if (xkeys.length < ykeys.length) return -1
        if (xkeys.length > ykeys.length) return 1
        for (i = 0; i < xkeys.length && i < ykeys.length; i++) {
            if (x[xkeys[i]] < y[ykeys[i]]) return -1
            if (x[xkeys[i]] > y[ykeys[i]]) return 1
        }
        return 0
    }
    if (x < y) return -1
    if (x > y) return 1
    return 0
}

// adapted from https://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

exports.orderStringify = (x, space) => {
    const keys = []
    JSON.stringify(x, (k, v) => {
        keys.push(k)
        if (isArray(v)) {
            v.sort(exports.sort)
        }
        return v
    })
    return JSON.stringify(x, keys.sort(), space)
}

exports.order = (x) => {
    return JSON.parse(exports.orderStringify(x))
}

exports.prettyJSON = (x) => {
    return JSON.stringify(x, null, 2)
}

exports.readFileAs = (file, readAs, tasks, t, i) => {
    const reader = new FileReader()
    reader.onload = () => {
        tasks.run(t, reader.result, i)
    }
    if (readAs === 'arraybuffer') {
        reader.readAsArrayBuffer(file)
    } else if (readAs === 'text') {
        reader.readAsText(file)
    } else {
        tasks.error('unexpected readAs: ' + readAs)
    }
}

exports.transform = (obj, fn) => {
    const transform = (x) => {
        x = fn(x)
        if (isArray(x)) {
            return x.map(transform)
        } else if (isObject(x)) {
            return Object.keys(x).reduce((result, k) => {
                result[k] = transform(x[k])
                return result
            }, {})
        }
        return x
    }
    return transform(obj)
}

exports.traverse = (val, fn) => {
    const traverse = (trail, val, fn) => {
        if (trail) fn(trail, val)
        let i
        if (isArray(val)) {
            for (i = 0; i < val.length; i++) {
                traverse(trail + '.' + i, val[i], fn)
            }
        } else if (isObject(val)) {
            let fullPath
            const keys = Object.keys(val)
            for (i = 0; i < keys.length; i++) {
                traverse(!trail ? keys[i] : trail + '.' + keys[i],
                    val[keys[i]], fn
                )
            }
        }
    }
    traverse('', val, fn)
}

function Tasks(cb) {
    const e = new EventEmitter()
    let done = false,
        t = 0
    this.add = (onRun) => {
        if (done) {
            return -1
        }
        e.on('run-task' + t, onRun)
        return t++
    }
    this.callback = (_cb) => {
        cb = _cb
    }
    this.run = (t, ...args) => {
        if (done) return
        if (t < 0) {
            done = true
            if (cb) {
                cb(null, ...args)
            }
            return
        }
        e.emit('run-task' + t, ...args)
    }
    this.error = (err) => {
        if (done) return
        if (isString(err)) {
            err = new Error(err)
        }
        if (!cb) {
            throw err
        }
        cb(err)
    }
}

exports.Tasks = Tasks