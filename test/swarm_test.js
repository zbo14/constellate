'use strict'

const describe = require('mocha').describe
const endpoint = require('./fixtures/endpoints').swarm
const Swarm = require('../lib/swarm.js')
const test = require('./fixtures/test')

const service = new Swarm.ContentService(endpoint)

describe('Swarm', () => {
  test.contentService(service)
})
