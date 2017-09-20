'use strict'

const base58 = require('bs58')
const nacl = require('tweetnacl')

const keypair = nacl.sign.keyPair()
const privateKey = base58.encode(keypair.secretKey.slice(0, 32))
const publicKey = base58.encode(keypair.publicKey)

module.exports = {
  privateKey,
  publicKey
}
