'use strict'

const describe = require('mocha').describe
const BigchainDB = require('../lib/bigchaindb')
const endpoint = require('./fixtures/endpoints').bigchaindb
const keypair = require('./fixtures/keypair')
const test = require('./fixtures/test')

const service = new BigchainDB.MetadataService(endpoint)

const recipient = [{
  amount: 1,
  publicKey: keypair.publicKey
}]

describe('BigchainDB', () => {
  test.metadataService(service, keypair, recipient)
})
