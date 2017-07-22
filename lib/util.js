'use strict'

const EventEmitter = require('events')
const fileType = require('file-type')
const fs = require('fs')

//      

/**
 * @module constellate/src/util
 */

const assign = (...objs) => {
    return Object.assign({}, ...objs)
}

const bufferToArrayBuffer = (buf) => {
    // from https://stackoverflow.com/a/31394257
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
}

const bufferToFile = (buf, name, t, id) => {
    const ab = bufferToArrayBuffer(buf)
    let type = fileType(buf.slice(0, 4100))
    if (!type) {
        return t.error('could not get file type')
    }
    type = type.mime.split('/')[0] + '/' + type.ext // e.g. audio/mpeg -> audio/mp3
    t.run(new File([ab], name, {
        type
    }), id)
}

const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1)
}

const clone = (obj) => {
    return JSON.parse(JSON.stringify(obj))
}

const fileToAnchor = (file, type) => {
    const a = document.createElement('a')
    a.setAttribute('href', URL.createObjectURL(file))
    a.setAttribute('download', file.name)
    a.innerText = file.name
    return a
}

const isArray = (arr, isType) => {
    return Array.isArray(arr) && arr.length && (!isType || arr.every(isType))
}

const isBoolean = (bool) => {
    return typeof bool === 'boolean'
}

const isMerkleLink = (link) => {
    // isString(link['/'])
    return link && link.constructor === Object && link['/'] && Object.keys(link).length === 1
}

const isNumber = (num) => {
    return typeof num === 'number' && num !== NaN
}

const isObject = (obj) => {
    return obj && obj.constructor === Object && !!Object.keys(obj).length
}

const isString = (str) => {
    return typeof str === 'string' && str.length
}

const newArray = (_default, length) => {
    return (Array).apply(null, {
        length
    }).map(() => _default)
}

// adapted from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

const orderStringify = (x, space) => {
    const keys = []
    JSON.stringify(x, (k, v) => {
        keys.push(k)
        if (isArray(v)) {
            v.sort((x, y) => {
                if (isObject(x) && isObject(y)) {
                    const xkeys = Object.keys(x).sort()
                    const ykeys = Object.keys(y).sort()
                    let i
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
            })
        }
        return v
    })
    return JSON.stringify(x, keys.sort(), space)
}

const order = (x) => {
    return JSON.parse(orderStringify(x))
}

const readFileAs = (file, readAs, t, id) => {
    const reader = new FileReader()
    reader.onload = () => t.run(reader.result, id)
    if (readAs === 'arraybuffer') {
        reader.readAsArrayBuffer(file)
    } else if (readAs === 'text') {
        reader.readAsText(file)
    } else {
        t.error(new Error('unexpected readAs: ' + readAs))
    }
}

const splice = (arr, start, deleteCount, ...items) => {
    return arr.slice(0, start).concat(items).concat(arr.slice(start + 1 + deleteCount))
}

const transform = (obj, fn) => {
    const _transform = (x) => {
        x = fn(x)
        if (isArray(x)) {
            return x.map(_transform)
        } else if (isObject(x)) {
            return Object.keys(x).reduce((result, k) => {
                result[k] = _transform(x[k])
                return result
            }, {})
        }
        return x
    }
    return _transform(obj)
}

const traverse = (val, fn) => {
    const _traverse = (trail, val, fn) => {
        if (trail) fn(trail, val)
        let i
        if (isArray(val)) {
            for (i = 0; i < val.length; i++) {
                _traverse(trail, val[i], fn)
            }
        } else if (isObject(val)) {
            let fullPath
            const keys = Object.keys(val)
            for (i = 0; i < keys.length; i++) {
                _traverse(!trail ? keys[i] : trail + '.' + keys[i],
                    val[keys[i]], fn
                )
            }
        }
    }
    _traverse('', val, fn)
}

function Tasks() {
    let cb, done, e, t
    this.init = (_cb) => {
        cb = _cb
        done = false
        e = new EventEmitter()
        t = 0
    }
    this.add = (onRun) => {
        if (done) return -1
        e.on('run-task' + t, onRun)
        return t++
    }
    this.run = (t, ...args) => {
        if (done) return
        if (t < 0) {
            cb(null, ...args)
            done = true
            return
        }
        e.emit('run-task' + t, ...args)
    }
    this.error = (err) => {
        if (done) return
        if (isString(err)) {
            err = new Error(err)
        }
        if (!cb) throw err
        cb(err)
    }
}

module.exports = {
    Tasks,
    assign,
    bufferToArrayBuffer,
    bufferToFile,
    capitalize,
    clone,
    fileToAnchor,
    isArray,
    isBoolean,
    isMerkleLink,
    isNumber,
    isObject,
    isString,
    newArray,
    order,
    orderStringify,
    readFileAs,
    splice,
    transform,
    traverse
}