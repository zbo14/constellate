'use strict'

const constellate = require('../lib')
const parse = require('/path/to/js-coalaip')

const {
  Tasks,
  bufferToFile,
  errUnexpectedType,
  isString,
  prettyJSON,
  readFileAs
} = require('../lib/util')

// @flow

/**
 * @module constellate/src/browser
 */

const readFilesAs = (files: File[], readAs: string, tasks: Object, t: number, i?: number) => {
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

function ContentService (params: Object) {
  constellate.ContentService.call(this, params)
}

ContentService.prototype = Object.create(constellate.ContentService.prototype)

ContentService.prototype.get = function (path: string, decrypt: Object, cb: Function) {
  if (typeof decrypt === 'function') {
    [cb, decrypt] = [decrypt, {}]
  }
  const tasks = new Tasks(cb)
  tasks.add(content => {
    bufferToFile(content, path, tasks, -1)
  })
  this._get(path, decrypt, tasks, 0)
}

ContentService.prototype.import = function (files: File[], password: string, cb: Function) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  const tasks = new Tasks(cb)
  tasks.add(files => {
    this._import(files, password, tasks, -1)
  })
  readFilesAs(files, 'arraybuffer', tasks, 0)
}

function MetadataService (params: Object) {
  constellate.MetadataService.call(this, params)
}

MetadataService.prototype = Object.create(constellate.MetadataService.prototype)

MetadataService.prototype.import = function (file: File, recipient: Object|Object[], cb: Function) {
  if (typeof recipient === 'function') {
    [cb, recipient] = [recipient, []]
  }
  if (file.type !== 'application/json') {
    return cb(errUnexpectedType(file.type, 'application/json'))
  }
  const tasks = new Tasks(cb)
  tasks.add(text => {
    try {
      const metadata = parse(JSON.parse(text)).tree()
      this._import(metadata, recipient, tasks, -1)
    } catch (err) {
      tasks.error(err)
    }
  })
  readFileAs(file, 'text', tasks, 0)
}

module.exports = {
  ContentService,
  MetadataService
}
