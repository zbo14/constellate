'use strict'

const assert = require('assert')
const fs = require('fs')

const {
  Account,
  ContentService,
  MetadataService,
  Project,
  ErrNoService,
  errInvalidPassword,
  errUnsupportedService
} = require('../lib/constellate')

const {
  Tasks,
  order
} = require('../lib/util')

const tasks = new Tasks()

let content1 = fs.readFileSync('./proj1/track1.mp3'),
    content2 = fs.readFileSync('./proj2/track2.mp3')

const file1 = {
  content: Buffer.from(content1),
  name: 'track1.mp3',
  type: 'audio/mp3'
}

const file2 = {
  content: Buffer.from(content2),
  name: 'track2.mp3',
  type: 'audio/mp3'
}

const metadata1 = JSON.parse(fs.readFileSync('./proj1/metadata.json', 'utf8'))
const metadata2 = JSON.parse(fs.readFileSync('./proj2/metadata.json', 'utf8'))

const account = new Account()

const accountObject = {
  encryptedPrivateKey: '27cc505f80060c48504d12aef9f0aa6f0dd6f16327a773da327d57ef0aecc7f8',
  hash: 'a4b1d4f0a45c4d6c0b6afadcc87ceae2f7a20a82f41b812a7894702d39c1ad43',
  publicKey: '6YoBAfpKWhgB7jn37kYWb5tn8H3LEEfxooktxA7kpDtG',
  salt: '43fb2c46b972b93292780559b1b8d2041e5b5b3d'
}

const accountPassword = 'passwerd'
const encryptPassword = 'incrypt'

const bigchaindb = {
  name: 'bigchaindb',
  path: // ...
}

const ipfs = {
  name: 'ipfs',
  path: // ...
}

const swarm = {
  name: 'swarm',
  path: // ...
}

let contentService,
    metadataService,
    project = new Project({
      account,
      contentService: ipfs,
      metadataService: bigchaindb,
      title: 'untitled'
    })

tasks.add(() => {
  project._import([file1], metadata1, encryptPassword, tasks, 1)
})

tasks.add(() => {
  project._upload(accountPassword, tasks, 2)
})

tasks.add(result => {
  metadataService = new MetadataService(bigchaindb)
  metadataService.Hashes.import(project.export('metadata_hashes'))
  setTimeout(() => metadataService._get('Band/data', true, tasks, 3), 3000)
})

tasks.add(result => {
  assert.deepEqual(order(result), {
    member: [
      {
        name: 'Bassist'
      },
      {
        name: 'Drummer'
      },
      {
        name: 'Guitarist'
      },
      {
        name: 'Singer'
      }
    ],
    name: 'Band',
  })
  metadataService._get('Band/sender', false, tasks, 4)
})

tasks.add(result => {
  assert.deepEqual(result, {
    publicKey: account.publicKey()
  })
  metadataService._get('Band/recipient/0', false, tasks, 5)
})

tasks.add(result => {
  assert.deepEqual(result, {
    amount: 1,
    publicKey: account.publicKey()
  })
  contentService = new ContentService(ipfs)
  contentService.Decryption.import(project.export('content_decryption'))
  contentService.Hashes.import(project.export('content_hashes'))
  contentService._get('track1.mp3', { password: encryptPassword }, tasks, 6)
})

tasks.add(result => {
  if (!result.equals(content1)) {
    return tasks.error('content does not match')
  }
  project = new Project({
    account,
    contentService: swarm,
    metadataService: bigchaindb,
    title: 'different content service'
  })
  project._import([file2], metadata2, '', tasks, 7)
})

tasks.add(() => {
  project._upload(accountPassword, tasks, 8)
})

tasks.add(() => {
  metadataService.Hashes.import(project.export('metadata_hashes'))
  setTimeout(() => metadataService._get('AnotherRecording/data/recordingOf', true, tasks, 9), 3000)
})

tasks.add(result => {
  assert.deepEqual(result, {
    composer: {
      name: "Singer"
    },
    name: "AnotherComposition"
  })
  metadataService._get('AnotherComposition/sender', false, tasks, 10)
})

tasks.add(result => {
  assert.deepEqual(result, {
    publicKey: account.publicKey()
  })
  metadataService._get('AnotherComposition/recipient/0', false, tasks, 11)
})

tasks.add(result => {
  assert.deepEqual(result, {
    amount: 1,
    publicKey: account.publicKey()
  })
  contentService = new ContentService(swarm)
  contentService.Hashes.import(project.export('content_hashes'))
  contentService._get('track2.mp3', {}, tasks, 12)
})

tasks.add(result => {
  if (!result.equals(content2)) {
    return tasks.error('content does not match')
  }
  project = new Project({
    contentService: swarm,
    metadataService: ipfs,
    title: 'no account, different metadata service'
  })
  project._import([file1], metadata1, '', tasks, 13)
})

tasks.add(() => {
  project._upload('', tasks, 14)
})

tasks.add(() => {
  metadataService = new MetadataService(ipfs)
  metadataService.Hashes.import(project.export('metadata_hashes'))
  metadataService._get('Composition', true, tasks, 15)
})

tasks.add(result => {
  assert.deepEqual(order(result), {
    data: {
      composer: {
        name: 'Singer'
      },
      name: 'Composition'
    }
  })
  contentService.Hashes.import(project.export('content_hashes'))
  contentService._get('track1.mp3', {}, tasks, 16)
})

tasks.add(result => {
  content1 = fs.readFileSync('./proj1/track1.mp3')
  if (!result.equals(content1)) {
    return tasks.error('content does not match')
  }
  try {
    contentService = new ContentService({
      name: 'badservice',
      path: 'path/to/*'
    })
  } catch (err) {
    assert.equal(err.message, errUnsupportedService('badservice').message)
    tasks.run(17)
  }
})

tasks.add(() => {
  tasks.callback(err => {
    assert.equal(err.message, errInvalidPassword('badpassword').message)
    tasks.run(18)
  })
  account._decrypt('badpassword', tasks, 18)
})

// TODO: test more errors

tasks.add(() => {
  console.log('Finished constellate test')
  process.exit()
})

account._import(accountObject, accountPassword, tasks, 0)
// account._generate(accountPassword, tasks, 0)
