'use strict'

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

const recording = {
  '@context': 'http://schema.org/',
  '@type': 'MusicRecording',
  name: 'version title'
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

let actual, count = 0, expected, i, resolver, service,
    t1, t2, t3, t4, t5, t6

t1 = tasks.add(ipfs => {
  service = new Ipfs.MetadataService(ipfs._blockService)
  // TODO: content service
  resolver = new Resolver(service)
  composition.composer = new Array(2)
  service.put(composer1, tasks, t2, 0)
  service.put(composer2, tasks, t2, 1)
  service.put(publisher, tasks, t2, 2)
})

t2 = tasks.add((cid, j) => {
  if (j === 2) {
    composition.publisher = { '/': cid.toBaseEncodedString() }
  } else {
    composition.composer[j] = { '/': cid.toBaseEncodedString() }
  }
  if (++count !== 3) return
  service.put(composition, tasks, t3)
})

t3 = tasks.add(cid => {
  recording.recordingOf = { '/': cid.toBaseEncodedString() }
  resolver.get(cid, '', tasks, t4)
})

t4 = tasks.add(obj => {
  actual = JSON.stringify(obj)
  expected = JSON.stringify(order(composition))
  if (expected !== actual) {
    return tasks.error('EXPECTED ' + expected + '\nGOT ' + actual)
  }
  resolver.expand(obj, tasks, t5)
})

t5 = tasks.add(obj => {
  actual = JSON.stringify(obj)
  expected = JSON.stringify(order(expanded))
  if (expected !== actual) {
    return tasks.error('EXPECTED ' + expected + '\nGOT ' + actual)
  }
  ipfs.stop(tasks, t6)
})

t6 = tasks.add(() => {
  console.log('Done')
  process.exit()
})

ipfs.start('/tmp/test', tasks, t1)

setTimeout(() => {}, 3000)
