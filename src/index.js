'use strict'

const aes = require('aes-js')
const base58 = require('bs58')
const crypto = require('crypto')
const nacl = require('tweetnacl')
const scrypt = require('scrypt-async')

const BigchainDB = require('../lib/bigchaindb')
const Ipfs = require('../lib/ipfs')
const Resolver = require('../lib/resolver')
const Swarm = require('../lib/swarm')

const {
  Person,
  AudioObject,
  ImageObject,
  VideoObject
} = require('path/to/js-coalaip')

const {
  Tasks,
  assign,
  clone,
  errUnexpectedType,
  isRecipient,
  isString
} = require('../lib/util')

// @flow

/**
 * @module constellate/src
 */

const errInvalidPassword = (password: string) => {
  return new Error('invalid password: ' + password)
}

const errUnexpectedHash = (actual: string, expected: string) => {
  return new Error(`expected hash="${expected}", got "${actual}"`)
}

const errUnsupportedService = (name: string) => {
  return new Error(`"${name}" is not supported`)
}

const keyLength = 32
const saltLength = 20

const options = {
  N: 16384,
  r: 8,
  p: 1,
  dkLen: keyLength,
  encoding: 'hex'
}

const scrypt2x = (password: string, salt: Buffer, tasks: Object, t: number, i?: number) => {
  scrypt(password, salt, options, result => {
    const dkey = Buffer.from(result, 'hex')
    scrypt(dkey, salt, options, hash => {
      tasks.run(t, dkey, hash, i)
    })
  })
}

const _newAccount = (password: string, tasks: Object, t: number, i?: number) => {
  const keypair = nacl.sign.keyPair()
  const salt = crypto.randomBytes(saltLength)
  const t1 = tasks.add((dkey, hash) => {
    const aesCtr = new aes.ModeOfOperation.ctr(dkey)
    const encryptedPrivateKey = Buffer.from(
      aesCtr.encrypt(keypair.secretKey.slice(0, 32)).buffer
    ).toString('hex')
    const data = {
      encryptedPrivateKey,
      hash,
      publicKey: base58.encode(keypair.publicKey),
      salt: salt.toString('hex')
    }
    tasks.run(t, data, i)
  })
  scrypt2x(password, salt, tasks, t1)
}

const newAccount = (password: string, cb: Function) => {
  const tasks = new Tasks(cb)
  _newAccount(password, tasks, -1)
}

function ContentService({ name, path, service }: Object) {
  this._hashes = {}
  if (name === 'ipfs') {
    this._service = new Ipfs.ContentService(path)
  } else if (name === 'node') {
    this._service = service
  } else if (name === 'swarm') {
    this._service = new Swarm.ContentService(path)
  } else {
    throw errUnsupportedService(name)
  }
}

ContentService.prototype.get = function (path: string, decrypt: Object, cb: Function) {
  if (typeof decrypt === 'function') {
    [cb, decrypt] = [decrypt, {}]
  }
  const tasks = new Tasks(cb)
  this._get(path, decrypt, tasks, -1)
}

ContentService.prototype.import = function (files: Object[], password: string, cb: Function) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  const tasks = new Tasks(cb)
  this._import(files,password, tasks, -1)
}

ContentService.prototype.put = function (cb: Function) {
  const tasks = new Tasks(cb)
  this._put(tasks, -1)
}

ContentService.prototype._encryptFiles = function (password: string, tasks: Object, t: number, i?: number) {
  const files = new Array(this._files.length)
  const salt = crypto.randomBytes(saltLength)
  const t1 = tasks.add((dkey, hash) => {
    const decryption = {
      hash,
      keys: {},
      salt: salt.toString('hex')
    }
    const aesCtrDkey = new aes.ModeOfOperation.ctr(dkey)
    let aesCtrKey, file, key
    for (let j = 0; j < files.length; j++) {
      file = this._files[j]
      key = crypto.randomBytes(keyLength)
      aesCtrKey = new aes.ModeOfOperation.ctr(key)
      files[j] = {
        content: Buffer.from(aesCtrKey.encrypt(file.content).buffer),
        name: file.name,
        type: file.type
      }
      key = Buffer.from(aesCtrDkey.encrypt(key).buffer)
      decryption.keys[file.name] = key.toString('hex')
    }
    this.decryption = decryption
    this._files = files
    tasks.run(t, i)
  })
  scrypt2x(password, salt, tasks, t1)
}

ContentService.prototype._get = function (path: string, decrypt: Object|string, tasks: Object, t: number, i?: number) {
    const hashes = this.hashes
    const parts = path.split('/')
    const first = parts.shift()
    if (hashes[first]) {
      path = hashes[first]
      if (parts.length) {
        path += '/' + parts.join('/')
      }
    }
    let t1 = t
    if (decrypt && (isString(decrypt) || decrypt.password)) {
        const decryption = this.decryption
        if (!decryption) {
          return tasks.error('no decryption')
        }
        let content, key, password, t2
        t1 = tasks.add(_content => {
            content = _content
            const name = String(decrypt.name || first)
            key = decryption.keys[name]
            if (!key) {
                return tasks.error('no decryption key for name: ' + name)
            }
            password = String(decrypt.password || decrypt)
            const salt = Buffer.from(decryption.salt, 'hex')
            scrypt2x(password, salt, tasks, t2)
        })
        t2 = tasks.add((dkey, hash) => {
            if (decryption.hash !== hash) {
                return tasks.error(errInvalidPassword(password))
            }
            try {
                let aesCtr = new aes.ModeOfOperation.ctr(dkey)
                key = Buffer.from(aesCtr.decrypt(Buffer.from(key, 'hex')).buffer)
                aesCtr = new aes.ModeOfOperation.ctr(key)
                content = Buffer.from(aesCtr.decrypt(content).buffer)
                tasks.run(t, content, i)
            } catch (err) {
                tasks.error(err)
            }
        })
    }
    this._service._get(path, tasks, t1, i)
}

ContentService.prototype._import = function (files: Object[], password: string, tasks: Object, t: number, i?: number) {
  this._files = files
  const hashes = {}
  const metadata = new Array(files.length)
  const service = this._service
  let count = 0, type, t1, t2
  t1 = tasks.add(() => {
    for (let j = 0; j < files.length; j++) {
      service._hash(this._files[j].content, tasks, t2, j)
    }
  })
  t2 = tasks.add((hash, j) => {
    hashes[files[j].name] = hash
    type = files[j].type.split('/')[0]
    if (type === 'audio') {
      metadata[j] = new AudioObject()
    } else if (type === 'image') {
      metadata[j] = new ImageObject()
    } else if (type === 'video') {
      metadata[j] = new VideoObject()
    } else {
      throw errUnexpectedType(type, 'audio|image|video')
    }
    metadata[j].setContentUrl(service.pathToURL(hash))
    metadata[j].setEncodingFormat(files[j].type)
    metadata[j].setName(files[j].name)
    if (++count !== files.length) return
    this.hashes = hashes
    tasks.run(t, metadata, i)
  })
  if (password) {
    return this._encryptFiles(password, tasks, t1)
  }
  tasks.run(t1)
}

ContentService.prototype._put = function (tasks: Object, t: number, i?: number) {
    const files = this._files
    const hashes = this.hashes
    if (!files.length) {
      return tasks.error('no files')
    }
    let count = 0
    const t1 = tasks.add(results => {
        for (let j = 0; j < files.length; j++) {
          if (results[j] !== hashes[files[j].name]) {
            return tasks.error(errUnexpectedHash(results[j], hashes[files[j].name]))
          }
        }
        tasks.run(t, i)
    })
    const contents = files.map(file => file.content)
    this._service._put(contents, tasks, t1)
}

function MetadataService({ account, name, path, service }: Object) {
  this._account = account
  this._hashes = {}
  if (name === 'bigchaindb') {
    this._service = new BigchainDB.MetadataService(path)
  } else if (name === 'ipfs') {
    this._service = new Ipfs.MetadataService(path)
  } else if (name === 'node') {
    this._service = service
  } else {
    throw errUnsupportedService(name)
  }

  this._resolver = new Resolver(this._service)
}

MetadataService.prototype.get = function (path: string, expand: boolean, cb: Function) {
  const tasks = new Tasks(cb)
  this._get(path, expand, tasks, -1)
}

MetadataService.prototype.import = function (metadata: Object, recipient: Object|Object[], cb: Function) {
  if (typeof recipient === 'function') {
    [cb, recipient] = [recipient, []]
  }
  const tasks = new Tasks(cb)
  this._import(metadata, recipient, tasks, -1)
}

MetadataService.prototype.put = function (password: string, cb: Function) {
  if (typeof password === 'function') {
    [cb, password] = [password, '']
  }
  const tasks = new Tasks(cb)
  this._put(password, tasks, -1)
}

// MetadataService.prototype.transfer = function (path: string, recipient: Object|Object[], password: string, cb: Function) {
//   const tasks = new Tasks(cb)
//   this._transfer(path, recipient, password, tasks, -1)
// }

MetadataService.prototype._decrypt = function (password: string, tasks: Object, t: number, i?: number) {
  const account = this._account
  const t1 = tasks.add((dkey, hash) => {
    if (account.hash !== hash) {
      return tasks.error(errInvalidPassword(password))
    }
    const aesCtr = new aes.ModeOfOperation.ctr(dkey)
    const encryptedPrivateKey = Buffer.from(account.encryptedPrivateKey, 'hex')
    const privateKey = base58.encode(Buffer.from(aesCtr.decrypt(encryptedPrivateKey).buffer))
    tasks.run(t, privateKey, i)
  })
  try {
    const salt = Buffer.from(account.salt, 'hex')
    return scrypt2x(password, salt, tasks, t1)
  } catch (err) {
    tasks.error(err)
  }
}

MetadataService.prototype._get = function (path: string, expand: boolean, tasks: Object, t: number, i?: number) {
  const hashes = this.hashes
  const parts = path.split('/')
  const first = parts.shift()
  const resolver = this._resolver
  const service = this._service
  if (hashes[first]) {
    path = hashes[first]
    if (parts.length) {
      path += '/' + parts.join('/')
    }
  }
  try {
    const { cid, remPath } = service.pathToCID(path)
    resolver._get(cid, remPath, expand, tasks, t, i)
  } catch(err) {
    tasks.error(err)
  }
}

MetadataService.prototype._import = function (metadata: Object[], recipient: Object|Object[], tasks: Object, t: number, i?: number) {
  const account = this._account
  const elems = []
  const hashes = {}
  const parties : Object = {}
  const paths = []
  const publicKey = account ? account.publicKey : ''
  if (publicKey) {
    parties.sender = {
      publicKey
    }
  }
  if (isRecipient(recipient)) {
    parties.recipient = recipient
  }
  let count = 0, elem, meta, name, t1, t2
  t1 = tasks.add(() => {
    meta = metadata[count]
    if (meta.path) {
      if (++count !== metadata.length) {
        return tasks.run(t1)
      }
      this._elems = elems
      this.hashes = hashes
      this._paths = paths
      return tasks.run(t, i)
    }
    elem = Object.assign({
      data: meta.data('ipld')
    }, parties)
    elems.push(elem)
    this._service._hash(elem, tasks, t2)
  })
  t2 = tasks.add(hash => {
    paths.push(hash)
    if (meta instanceof Person) {
      name = meta.getGivenName() + ' ' + meta.getFamilyName()
    } else {
      name = meta.getName()
    }
    hashes[name || hash] = meta.path = hash
    if (++count !== metadata.length) {
      return tasks.run(t1)
    }
    this._elems = elems
    this.hashes = hashes
    this._paths = paths
    tasks.run(t, i)
  })
  tasks.run(t1)
}

MetadataService.prototype._put = function (password: string, tasks: Object, t: number, i?: number) {
  const account = this._account
  const elems = this._elems
  const paths = this._paths
  const publicKey = account ? account.publicKey : ''
  const service = this._service
  let count = 0, hash, j, t1, t2
  t2 = tasks.add((cid, j) => {
      hash = service.hashFromCID(cid)
      if (hash !== paths[j]) {
          return tasks.error(errUnexpectedHash(hash, paths[j]))
      }
      if (++count !== elems.length) return
      tasks.run(t, i)
  })
  if (password && publicKey) {
    t1 = tasks.add(privateKey => {
      const sender = {
        privateKey,
        publicKey
      }
      for (j = 0; j < elems.length; j++) {
        service._put(assign(elems[j], { sender }), tasks, t2, j)
      }
    })
    this._decrypt(password, tasks, t1)
  } else {
    for (j = 0; j < elems.length; j++) {
      service._put(elems[j], tasks, t2, j)
    }
  }
}

MetadataService.prototype._transfer = function (path: string, recipient: Object|Object[], password: string, tasks: Object, t: number, i?: number) {
  const account = this._account
  const hashes = this.hashes
  const service = this._service
  if (!account) {
    return tasks.error('no account')
  }
  const parts = path.split('/')
  const first = parts.shift()
  if (hashes[first]) {
    path = hashes[first]
    if (parts.length) {
      path += '/' + parts.join('/')
    }
  }
  let t1, t2
  t1 = tasks.add(privateKey => {
    service._put({
      data: {
        '/': path
      },
      sender: {
        privateKey,
        publicKey: account.publicKey
      },
      recipient
    }, tasks, t2)
  })
  t2 = tasks.add(cid => {
    tasks.run(t, service.hashFromCID(cid), i)
  })
  account._decrypt(password, tasks, t1)
}

module.exports = {
  ContentService,
  MetadataService,
  newAccount,
  errInvalidPassword,
  errUnexpectedHash,
  errUnsupportedService
}
