'use strict'

const EventEmitter = require('events')
const fileType = require('file-type')
const fs = require('fs')

// @flow

/**
 * @module constellate/src/util
 */

function Tasks() {
    let cb, done = [], todo = [];
    this.callback = (_cb: Function) => {
      cb = _cb
    }
    this.task = (onRun: Function) => {
        const e = new EventEmitter()
        e.on('run', onRun)
        todo.push(e)
    }
    this.todo = () => todo.length
    this.run = (...args: any[]) => {
        if (!todo.length) {
          if (!cb) {
            throw new Error('no more tasks')
          }
          done = []
          cb(null, ...args)
          return cb = null
        }
        todo[todo.length-1].emit('run', ...args)

    }
    this.next = () => {
        if (!todo.length) {
          throw new Error('no more tasks')
        }
        done.push(todo.pop())
    }
    this.move = (i: number) => {
        if (!todo.length) {
          throw new Error('no more tasks')
        }
        if (todo.length-i <= 0) {
          throw new Error('not that many tasks')
        }
        if (i > 0) {
          done.push(...todo.splice(todo.length-i, i).reverse())
        }
        if (i < 0) {
          todo.push(...done.splice(done.length+i, -i).reverse())
        }
    }
    this.error = (err: Error|string) => {
      if (isString(err)) {
        err = new Error(err)
      }
      done = todo = []
      if (cb) return cb(err)
      throw err
    }
}

const assign = (...objs: Object[]): Object => {
  return Object.assign({}, ...objs)
}

const bufferToArrayBuffer = (buf: Buffer): ArrayBuffer => {
  // from https://stackoverflow.com/a/31394257
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
}

const bufferToFile = (buf: Buffer, name: string, t: Object, id?: number|string) => {
  const ab = bufferToArrayBuffer(buf)
  let type = fileType(buf.slice(0, 4100))
  if (!type) {
    return t.error('could not get file type')
  }
  type = type.mime.split('/')[0] + '/' + type.ext // e.g. audio/mpeg -> audio/mp3
  t.run(new File([ab], name, { type }), id)
}

const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const clone = (obj: Object): Object => {
  return JSON.parse(JSON.stringify(obj))
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
  // isString(link['/'])
  return link && link.constructor === Object && link['/'] && Object.keys(link).length === 1
}

const isNumber = (num: any): boolean => {
  return typeof num === 'number' &&  num !== NaN
}

const isObject = (obj: any): boolean => {
  return obj && obj.constructor === Object && !!Object.keys(obj).length
}

const isString = (str: any): boolean => {
  return typeof str === 'string' && str.length
}

const newArray = (_default: any, length: number): any[] => {
  return (Array : any).apply(null, { length }).map(() => _default)
}

// adapted from http://stackoverflow.com/questions/16167581/sort-object-properties-and-json-stringify#comment73545624_40646557

const orderStringify = (x: any[]|Object, space?: number): string => {
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

const order = (x: any[]|Object): Object => {
  return JSON.parse(orderStringify(x))
}

const readFileAs = (file: File, readAs: string, t: Object, id: number|string) => {
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

const splice = (arr: any[], start: number, deleteCount: number, ...items: any[]): any[] => {
  return arr.slice(0, start).concat(items).concat(arr.slice(start+1+deleteCount))
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
        _traverse(trail, val[i], fn)
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
