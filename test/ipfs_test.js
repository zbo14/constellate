'use strict'

const assert = require('assert')
const fs = require('fs')
const Ipfs = require('../lib/ipfs.js')
const Resolver = require('../lib/resolver.js')

const {
  Tasks,
  errInvalidElement,
  errPathNotFound,
  order
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

const addr = // ...

const contentService = new Ipfs.ContentService(addr)
const metadataService = new Ipfs.MetadataService(addr)

const resolver = new Resolver(metadataService)

const content1 = fs.readFileSync('proj1/track1.mp3')
const content2 = fs.readFileSync('proj2/track2.mp3')

const tasks = new Tasks()

let cid, count = 0, hashes

tasks.add((_cid, j) => {
  cid = _cid
  if (j === 2) {
    composition.publisher = {
      '/': metadataService.hashFromCID(cid) + '/data'
    }
  } else {
    composition.composer[j] = {
      '/': metadataService.hashFromCID(cid) + '/data'
    }
  }
  if (++count !== 3) return
  metadataService.put({ data: composition }, tasks, 1)
})

tasks.add(cid => {
  resolver.get(cid, '', tasks, 2)
})

tasks.add(result => {
  assert.deepEqual(result, { data: order(composition) })
  resolver.expand(result, tasks, 3)
})

tasks.add(result => {
  assert.deepEqual(result, { data: order(expanded) })
  contentService.put([content1, content2], tasks, 4)
})

tasks.add(_hashes => {
  hashes = _hashes
  contentService.get(hashes[0], tasks, 5)
})

tasks.add(content => {
  if (!content.equals(content1)) {
    return tasks.error('content does not match')
  }
  contentService.get(hashes[1], tasks, 6)
})

tasks.add(content => {
  if (!content.equals(content2)) {
    return tasks.error('content does not match')
  }
  tasks.run(7)
})

tasks.add(elem => {
  tasks.callback(err => {
    assert.equal(err.message, errInvalidElement({}).message)
    tasks.run(8)
  })
  metadataService.put({}, tasks, 8)
})

tasks.add(() => {
  tasks.callback(err => {
    assert.equal(err.message, errPathNotFound('badpath').message)
    tasks.run(9)
  })
  resolver.get(cid, 'badpath', tasks, 9)
})

// TODO: test more errors

tasks.add(() => {
  console.log('Finished IPFS test')
  process.exit()
})

composition.composer = new Array(2)
metadataService.put({ data: composer1 }, tasks, 0, 0)
metadataService.put({ data: composer2 }, tasks, 0, 1)
metadataService.put({ data: publisher }, tasks, 0, 2)
