'use strict'

const aes = require('aes-js')
const base58 = require('bs58')
const crypto = require('crypto')
const errInvalidPassword = require('./errors').errInvalidPassword
const nacl = require('tweetnacl')
const scrypt = require('scrypt-async')

exports.KEY_LENGTH = 32
exports.SALT_LENGTH = 20

const options = {
  N: 16384,
  r: 8,
  p: 1,
  dkLen: exports.KEY_LENGTH,
  encoding: 'hex'
}

exports.decryptAccount = function (account, password, cb) {
  try {
    const salt = Buffer.from(account.salt, 'hex')
    return exports.scrypt2x(password, salt, (dkey, hash) => {
      if (account.hash !== hash) {
        return cb(errInvalidPassword(password))
      }
      const aesCtr = new aes.ModeOfOperation.ctr(dkey)
      const encryptedPrivateKey = Buffer.from(account.encryptedPrivateKey, 'hex')
      const privateKey = base58.encode(Buffer.from(aesCtr.decrypt(encryptedPrivateKey).buffer))
      cb(null, privateKey)
    })
  } catch (err) {
    cb(err)
  }
}

exports.encryptFiles = (files, password, cb) => {
  const _files = []
  const salt = crypto.randomBytes(exports.SALT_LENGTH)
  exports.scrypt2x(password, salt, (dkey, hash) => {
    const decryption = {
      hash,
      keys: {},
      salt: salt.toString('hex')
    }
    const aesCtrDkey = new aes.ModeOfOperation.ctr(dkey)
    let aesCtrKey, file, key
    for (let i = 0; i < files.length; i++) {
      file = files[i]
      key = crypto.randomBytes(exports.KEY_LENGTH)
      aesCtrKey = new aes.ModeOfOperation.ctr(key)
      _files[i] = {
        content: Buffer.from(aesCtrKey.encrypt(file.content).buffer),
        name: file.name,
        type: file.type
      }
      key = Buffer.from(aesCtrDkey.encrypt(key).buffer)
      decryption.keys[file.name] = key.toString('hex')
    }
    cb(_files, decryption)
  })
}

exports.newAccount = (password, cb) => {
  const keypair = nacl.sign.keyPair()
  const salt = crypto.randomBytes(exports.SALT_LENGTH)
  exports.scrypt2x(password, salt, (dkey, hash) => {
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
    cb(data)
  })
}

exports.scrypt2x = (password, salt, cb) => {
  scrypt(password, salt, options, result => {
    const dkey = Buffer.from(result, 'hex')
    scrypt(dkey, salt, options, hash => {
      cb(dkey, hash)
    })
  })
}
