'use strict'

const ContentService = require('./')
const fileType = require('file-type')

const bufferToFile = (buf, name, cb) => {
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)
  let type = fileType(buf.slice(0, 4100))
  if (!type) {
    return cb(new Error('could not get file type'))
  }
  type = type.mime.split('/')[0] + '/' + type.ext // e.g. audio/mpeg -> audio/mp3
  const file = new File([ab], name, { type })
  cb(null, file)
}

const readFiles = (files, cb) => {
  const results = []
  let count = 0, reader
  files = [].concat(files)
  files.forEach((file, i) => {
    reader = new FileReader()
    reader.onload = evt => {
      results[i] = {
        content: Buffer.from(evt.target.result),
        name: file.name,
        type: file.type
      }
      if (++count === files.length) {
        cb(results)
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

function BrowserContentService (params) {
  ContentService.call(this, params)
}

BrowserContentService.prototype = Object.create(ContentService.prototype)
BrowserContentService.constructor = BrowserContentService

BrowserContentService.prototype.get = function (path, password, cb) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  ContentService.prototype.get.call(this, path, password, (err, content) => {
    if (err) {
      return cb(err)
    }
    const name = path.split('/')[0]
    bufferToFile(content, name, cb)
  })
}

BrowserContentService.prototype.import = function (files, password, cb) {
  readFiles(files, results => {
    ContentService.prototype.import.call(this, results, password, cb)
  })
}

module.exports = BrowserContentService
