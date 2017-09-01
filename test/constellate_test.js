'use strict'

const describe = require('mocha').describe
const expect = require('chai').expect
const account = require('./fixtures/account')
const endpoints = require('./fixtures/endpoints')
const test = require('./fixtures/test')

const bigchaindb = {
  account: account.object,
  name: 'bigchaindb',
  path: endpoints.bigchaindb
}

const ipfs = {
  name: 'ipfs',
  path: endpoints.ipfs
}

const swarm = {
  name: 'swarm',
  path: endpoints.swarm
}

const encryptionPassword = 'incrypt'
const publicKey = account.object.publicKey

const sender = {
  publicKey
}

const recipient = [{
  amount: 1,
  publicKey
}]

describe('Constellate', () => {

  describe('IPFS x BigchainDB', () => {
    test.constellate({
      accountPassword: account.password,
      contentService: ipfs,
      encryptionPassword,
      metadataService: bigchaindb,
      sender,
      recipient
    })
  })

  describe('IPFS x IPFS', () => {
    test.constellate({
      encryptionPassword,
      contentService: ipfs,
      metadataService: ipfs
    })
  })

  describe('Swarm x BigchainDB', () => {
    test.constellate({
      accountPassword: account.password,
      contentService: swarm,
      metadataService: bigchaindb,
      sender,
      recipient
    })
  })

  describe('Swarm x IPFS', () => {
    test.constellate({
      contentService: swarm,
      metadataService: ipfs
    })
  })
})
