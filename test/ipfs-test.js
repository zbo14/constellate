'use strict'

const describe = require('mocha').describe
const endpoint = require('./fixtures/endpoints').ipfs
const test = require('./fixtures/test')

const {
  ContentService,
  MetadataService
} = require('../src/ipfs')

const contentService = new ContentService(endpoint)
const metadataService = new MetadataService(endpoint)

describe('IPFS', () => {
  test.contentService(contentService)
  test.metadataService(metadataService, null, null)
})
