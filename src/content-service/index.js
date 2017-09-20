'use strict'

const aes = require('aes-js')
const IpfsContentService = require('../ipfs/content-service')

const {
  encryptFiles,
  scrypt2x
} = require('../crypto')

const {
  errInvalidPassword,
  errUnexpectedHash,
  errUnexpectedType,
  errUnsupportedService
} = require('../errors')

const {
  AudioObject,
  ImageObject,
  VideoObject
} = require('js-coalaip/src/core')

function ContentService({ name, path }) {
  if (name === 'ipfs') {
    this.service = new IpfsContentService(path)
  } else if (name === 'swarm') {
    // ...
  } else {
    throw errUnsupportedService(name)
  }
  this.hashes = {}
}

ContentService.prototype.get = function (path, password, cb) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  const parts = path.split('/')
  const first = parts.shift()
  if (this.hashes[first]) {
    path = this.hashes[first]
    if (parts.length) {
      path += '/' + parts.join('/')
    }
  }
  this.service.get(path, (err, content) => {
    if (err) {
      return cb(err)
    } else if (!password) {
      return cb(null, content)
    } else if (!this.decryption) {
      return cb(new Error('no decryption'))
    }
    let key = this.decryption.keys[first]
    if (!key) {
      return cb(new Error('no decryption key for name: ' + first))
    }
    const salt = Buffer.from(this.decryption.salt, 'hex')
    scrypt2x(password, salt, (dkey, hash) => {
      if (this.decryption.hash !== hash) {
        return cb(errInvalidPassword(password))
      }
      try {
        let aesCtr = new aes.ModeOfOperation.ctr(dkey)
        key = Buffer.from(aesCtr.decrypt(Buffer.from(key, 'hex')).buffer)
        aesCtr = new aes.ModeOfOperation.ctr(key)
        content = Buffer.from(aesCtr.decrypt(content).buffer)
        cb(null, content)
      } catch (err) {
        cb(err)
      }
    })
  })
}

ContentService.prototype.process = function (files, cb) {
  const metadata = []
  let count = 0
  files.forEach((file, i) => {
    this.service.hash(file.content, (err, hash) => {
      if (err) {
        return cb(err)
      }
      this.hashes[file.name] = hash
      const type = file.type.split('/')[0]
      if (type === 'audio') {
        metadata[i] = new AudioObject()
      } else if (type === 'image') {
        metadata[i] = new ImageObject()
      } else if (type === 'video') {
        metadata[i] = new VideoObject()
      } else {
        return cb(errUnexpectedType(type, 'audio|image|video'))
      }
      metadata[i].setContentUrl(this.service.pathToURL(hash))
      metadata[i].setEncodingFormat(file.type)
      metadata[i].setName(file.name)
      if (++count === files.length) {
        cb(null, metadata)
      }
    })
  })
}

ContentService.prototype.import = function (files, password, cb) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  if (password) {
    encryptFiles(files, password, (files, decryption) => {
      this.process(files, (err, metadata) => {
        if (err) {
          return cb(err)
        }
        this.decryption = decryption
        this.files = files
        cb(null, metadata)
      })
    })
  } else {
    this.process(files, (err, metadata) => {
      if (err) {
        return cb(err)
      }
      this.files = files
      cb(null, metadata)
    })
  }
}

ContentService.prototype.put = function (cb) {
  if (!this.files || !this.files.length) {
    return cb(new Error('no files'))
  }
  const contents = this.files.map(file => file.content)
  let file
  this.service.put(contents, (err, results) => {
    if (err) {
      return cb(err)
    }
    for (let i = 0; i < this.files.length; i++) {
      file = this.files[i]
      if (results[i] !== this.hashes[file.name]) {
        return cb(errUnexpectedHash(results[i], this.hashes[file.name]))
      }
    }
    cb(null)
  })
}

module.exports = ContentService
