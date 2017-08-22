'use strict'

const assert = require('assert')
const fs = require('fs')
const metadata = require('./metadata')

const Person = require('/path/to/js-coalaip/src/core').Person

const {
  MusicComposition,
  MusicGroup,
  MusicRecording
} = require('/path/to/js-coalaip/src/music')

const {
  Account,
  ContentService,
  MetadataService
} = require('../lib')

const {
  Tasks,
  assign,
  order
} = require('../lib/util')

const tasks = new Tasks()

const account = new Account()

const accountObject = {
  encryptedPrivateKey: '27cc505f80060c48504d12aef9f0aa6f0dd6f16327a773da327d57ef0aecc7f8',
  hash: 'a4b1d4f0a45c4d6c0b6afadcc87ceae2f7a20a82f41b812a7894702d39c1ad43',
  publicKey: '6YoBAfpKWhgB7jn37kYWb5tn8H3LEEfxooktxA7kpDtG',
  salt: '43fb2c46b972b93292780559b1b8d2041e5b5b3d'
}

const accountPassword = 'passwerd'
const encryptPassword = 'incrypt'

const content = fs.readFileSync('./track.mp3')

const file = {
  content,
  name: 'track.mp3',
  type: 'audio/mp3'
}

const bigchaindb = {
  name: 'bigchaindb',
  path: // ...
}

const ipfs = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const swarm = {
  name: 'swarm',
  path: 'http://swarm-gateways.net'
}

let contentService = new ContentService(ipfs),
    metadataService = new MetadataService(ipfs)

tasks.add(() => {
  contentService._import([file], encryptPassword, tasks, 1)
})

tasks.add(meta => {
  const recording = metadata.find(x => x instanceof MusicRecording)
  recording.setAudio(meta[0])
  metadataService._import(metadata, {}, tasks, 2)
})

tasks.add(() => {
  contentService._put(tasks, 3)
})

tasks.add(() => {
  metadataService._put('', tasks, 4)
})

tasks.add(() => {
  contentService._get('track.mp3', encryptPassword, tasks, 5)
})

tasks.add(result => {
  if (!content.equals(result)) {
    return tasks.error('content does not match')
  }
  metadataService._get('November/data', true, tasks, 6)
})

tasks.add(result => {
  const composition = metadata.find(x => x instanceof MusicComposition)
  assert.deepEqual(result, composition.data())
  metadataService._get('November/data/composer', true, tasks, 7)
})

tasks.add(result => {
  const composer = metadata.find(x => x instanceof Person)
  assert.deepEqual(result, [composer.data()])
  metadataService._get('November/sender', false, tasks, 8)
})

tasks.add(result => {
  assert.equal(result, null)
  metadataService._get('November/recipient', false, tasks, 9)
})

tasks.add(result => {
  assert.equal(result, null)
  contentService = new ContentService(swarm)
  metadataService = new MetadataService(assign(bigchaindb, { account }))
  contentService._import([file], '', tasks, 10)
})

tasks.add(() => {
  metadata.forEach(meta => delete meta.path)
  metadataService._import(metadata, {
    amount: 1,
    publicKey: account.publicKey()
  }, tasks, 11)
})

tasks.add(() => {
  contentService._put(tasks, 12)
})

tasks.add(() => {
  metadataService._put(accountPassword, tasks, 13)
})

tasks.add(() => {
  contentService._get('track.mp3', {}, tasks, 14)
})

tasks.add(result => {
  if (!content.equals(result)) {
    return tasks.error('content does not match')
  }
  metadataService._get('Mouse Rat/data', true, tasks, 15)
})

tasks.add(result => {
  const band = metadata.find(x => x instanceof MusicGroup)
  assert.deepEqual(result, band.data())
  metadataService._get('Mouse Rat/data/member', true, tasks, 16)
})

tasks.add(result => {
  const member = metadata.find(x => x instanceof Person)
  assert.deepEqual(result, [member.data()])
  metadataService._get('Mouse Rat/sender', false, tasks, 17)
})

tasks.add(result => {
  assert.deepEqual(result, {
    publicKey: account.publicKey()
  })
  metadataService._get('Mouse Rat/recipient', false, tasks, 18)
})

tasks.add(result => {
  assert.deepEqual(result, [{
    amount: 1,
    publicKey: account.publicKey()
  }])
  console.log('Finished constellate test')
  process.exit()
})

account._import(accountObject, accountPassword, tasks, 0)
