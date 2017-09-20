'use strict'

const describe = require('mocha').describe
const endpoints = require('./fixtures/endpoints')
const test = require('./fixtures/test')

const ipfs = {
  name: 'ipfs',
  path: endpoints.ipfs
}

describe('Constellate', () => {
  describe('IPFS x IPFS', () => {
    test.constellate({
      encryptionPassword: 'incrypt',
      contentService: ipfs,
      metadataService: ipfs
    })
  })
})
