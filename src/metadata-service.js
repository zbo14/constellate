'use strict'

const IpfsMetadataService = require('./ipfs/metadata-service')
const isSubType = require('js-coalaip/src/util').isSubType
const Resolver = require('./resolver')

const {
  Person,
  AudioObject,
  ImageObject,
  VideoObject
} = require('js-coalaip/src/core')

const {
  errUnexpectedCID,
  errUnexpectedHash,
  errUnsupportedService
} = require('./errors')

function MetadataService ({ account, name, path }) {
  if (name === 'bigchaindb') {
    this.service = new BigchaindbMetadataService(account, path)
  } else if (name === 'ipfs') {
    this.service = new IpfsMetadataService(path)
  } else {
    throw errUnsupportedService(name)
  }
  this.hashes = {}
  this.resolver = new Resolver(this.service)
}

MetadataService.prototype.get = function (path, expand, id, cb) {
  if (typeof id === 'function') {
    [cb, id] = [id, '']
  }
  const parts = path.split('/')
  const first = parts.shift()
  if (this.hashes[first]) {
    path = this.hashes[first]
    if (parts.length) {
      path += '/' + parts.join('/')
    }
  }
  try {
    const { cid, remPath } = this.service.pathToCID(path)
    this.resolver.get(cid, remPath, id, (err, result) => {
      if (err) {
        return cb(err)
      }
      if (!expand) {
        return cb(null, result)
      }
      this.resolver.expand(result, id, cb)
    })
  } catch (err) {
    cb(err)
  }
}

MetadataService.prototype.import = function (metadata, cb, count = 0, ipld = []) {
  if (count === metadata.length) {
    this.ipld = ipld
    return cb(null)
  }
  const meta = metadata[count]
  if (meta.path) {
    return this.import(metadata, cb, count+1, ipld)
  }
  const obj = meta.ipld()
  ipld.push(obj)
  this.service.hash(obj, (err, hash) => {
    if (err) {
      return cb(err)
    }
    let name
    if (isSubType(meta, new Person())) {
      name = meta.getGivenName() + ' ' + meta.getFamilyName()
    } else {
      name = meta.getName()
    }
    this.hashes[name || hash] = meta.path = hash
    this.import(metadata, cb, count+1, ipld)
  })
}

MetadataService.prototype.put = function (cb) {
  let count = 0
  this.ipld.forEach(obj => {
    this.service.put(obj, (err, cid) => {
      if (err) {
        return cb(err)
      }
      this.service.hashFromCID(cid, (err, hash) => {
        if (err) {
          return cb(err)
        }
        let name
        if (obj.name) {
          name = obj.name
        } else if (obj.familyName && obj.givenName) {
          name = obj.givenName + ' ' + obj.familyName
        } else {
          name = hash
        }
        if (hash !== this.hashes[name]) {
          return cb(errUnexpectedHash(hash, this.hashes[name]))
        }
        if (++count === this.ipld.length) {
          cb(null)
        }
      })
    })
  })
}

module.exports = MetadataService
