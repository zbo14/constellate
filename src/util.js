'use strict'

const EventEmitter = require('events')
const fileType = require('file-type')
const fs = require('fs')

// @flow

/**
 * @module constellate/src/util
 */

const assign = (...objs: Object[]): Object => {
  return Object.assign({}, ...objs)
}

const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
  // from https://stackoverflow.com/a/31394257
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
}

const bufferToFile = (buf: Buffer, name: string, tasks: Object, t: number, i?: number) => {
  const ab = bufferToArrayBuffer(buf)
  let type = fileType(buf.slice(0, 4100))
  if (!type) {
    return tasks.error('could not get file type')
  }
  type = type.mime.split('/')[0] + '/' + type.ext // e.g. audio/mpeg -> audio/mp3
  const file = new File([ab], name, { type })
  tasks.run(t, file, i)
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const clone = (x: any): Object => {
  return JSON.parse(JSON.stringify(x))
}

const fileToAnchor = (file: File, type: string): HTMLAnchorElement => {
  const a = document.createElement('a')
  a.setAttribute('href', URL.createObjectURL(file))
  a.setAttribute('download', file.name)
  a.innerText = file.name
  return a
}

const isArray = (arr: any, isType?: Function): boolean => {
  return Array.isArray(arr) && arr.length && (!isType || arr.every(isType))
}

const isBoolean = (bool: any): boolean => {
  return typeof bool === 'boolean'
}

const isMerkleLink = (link: any): boolean => {
  return link && link.constructor === Object && link['/'] && Object.keys(link).length === 1
}

const isNumber = (num: any): boolean => {
  return typeof num === 'number' &&  !isNaN(num)
}

const isObject = (obj: any): boolean => {
  return obj && obj.constructor === Object && !!Object.keys(obj).length
}

const isString = (str: any): boolean => {
  return typeof str === 'string' && !!str.length
}

const newArray = (_default: any, length: number): any[] => {
  return (Array : any).apply(null, { length }).map(() => _default)
}

const sort = (x: any, y: any) => {
  let i
  if (isArray(x) && isArray(y)) {
    x.sort(sort)
    y.sort(sort)
    let result
    for (i = 0; i < x.length && i < y.length; i++) {
      result = sort(x[i], y[i])
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

const orderStringify = (x: any, space?: number): string => {
    const keys = []
    JSON.stringify(x, (k, v) => {
        keys.push(k)
        if (isArray(v)) {
            v.sort(sort)
        }
        return v
    })
    return JSON.stringify(x, keys.sort(), space)
}

const order = (x: any) => {
    return JSON.parse(orderStringify(x))
}

const readFileAs = (file: File, readAs: string, tasks: Object, t: number, i: number) => {
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

const splice = (arr: any[], start: number, deleteCount: number, ...items: any[]): any[] => {
  return arr.slice(0, start).concat(items).concat(arr.slice(start+deleteCount))
}

const transform = (obj: Object, fn: Function) => {
  const _transform = (x: any) => {
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

const traverse = (val: any, fn: Function) => {
  const _traverse = (trail: string, val: any, fn: Function) => {
    if (trail) fn(trail, val)
    let i
    if (isArray(val)) {
      for (i = 0; i < val.length; i++) {
        _traverse(trail + '.' + i, val[i], fn)
      }
    } else if (isObject(val)) {
      let fullPath
      const keys = Object.keys(val)
      for (i = 0; i < keys.length; i++) {
        _traverse(
          !trail ? keys[i] : trail + '.' + keys[i],
          val[keys[i]], fn
        )
      }
    }
  }
  _traverse('', val, fn)
}

function Tasks() {
  let cb, done, e, t
  this.init = (_cb: Function) => {
    cb = _cb
    done = false
    e = new EventEmitter()
    t = 0
  }
  this.add = (onRun: Function): number => {
    if (done) {
      return -1
    }
    e.on('run-task' + t, onRun)
    return t++
  }
  this.run = (t: number, ...args: any[]) => {
    if (done) return
    if (t < 0) {
      done = true
      return cb(null, ...args)
    }
    e.emit('run-task' + t, ...args)
  }
  this.error = (err: Error|string) => {
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
