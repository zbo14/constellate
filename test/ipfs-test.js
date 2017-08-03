'use strict'

const assert = require('chai').assert

const Ipfs = require('../lib/ipfs.js')
const Resolver = require('../lib/resolver.js')

const {
  order,
  Tasks
} = require('../lib/util.js')

const composer1 = {
  '@context': 'http://schema.org/',
  '@type': 'Person',
  name: 'composer1'
}

const composer2 = {
  '@context': 'http://schema.org/',
  '@type': 'Person',
  name: 'composer2'
}

const publisher = {
  '@context': 'http://schema.org/',
  '@type': 'Organization',
  name: 'publisher'
}

const composition = {
  '@context': 'http://schema.org/',
  '@type': 'MusicComposition',
  name: 'song'
}

const expanded = {
  '@context': 'http://schema.org/',
  '@type': 'MusicComposition',
  composer: [
    composer1,
    composer2
  ],
  name: 'song',
  publisher
}

const ipfs = new Ipfs.Node()

const tasks = new Tasks()

tasks.init()

let count = 0, resolver, service, t = 0

tasks.add(ipfs => {
  service = new Ipfs.MetadataService(ipfs._blockService)
  // TODO: content service
  resolver = new Resolver(service)
  composition.composer = new Array(2)
  service.put({ data: composer1 }, tasks, t, 0)
  service.put({ data: composer2 }, tasks, t, 1)
  service.put({ data: publisher }, tasks, t++, 2)
})

tasks.add((cid, j) => {
  if (j === 2) {
    composition.publisher = {
      '/': cid.toBaseEncodedString()
    }
  } else {
    composition.composer[j] = {
      '/': cid.toBaseEncodedString()
    }
  }
  if (++count !== 3) return
  service.put({ data: composition }, tasks, t++)
})

tasks.add(cid => {
  resolver.get(cid, '', tasks, t++)
})

tasks.add(result => {
  assert.deepEqual(result, order(composition), 'query result does not equal composition')
  resolver.expand(result, tasks, t++)
})

tasks.add(result => {
  assert.deepEqual(result, order(expanded), 'query result does not equal expanded composition')
  ipfs.stop(tasks, t++)
})

tasks.add(() => {
  console.log('Done')
  process.exit()
})

ipfs.start('/tmp/ipfs-test', tasks, t++)
