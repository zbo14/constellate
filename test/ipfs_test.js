'use strict'

const describe = require('mocha').describe
const Ipfs = require('../lib/ipfs.js')
const endpoint = require('./fixtures/endpoints').ipfs
const test = require('./fixtures/test')

const contentService = new Ipfs.ContentService(endpoint)
const metadataService = new Ipfs.MetadataService(endpoint)

describe('IPFS', () => {
  test.contentService(contentService)
  test.metadataService(metadataService, null, null)
})
