'use strict'

const assert = require('assert')
const BigchainDB = require('../lib/bigchaindb')
const driver = require('bigchaindb-driver')
const Resolver = require('../lib/resolver')

const {
  Tasks,
  errInvalidElement,
  errPathNotFound,
  assign,
  order
} = require('../lib/util')

const API = // ...

const service = new BigchainDB.MetadataService(API)
const resolver = new Resolver(service)

const tasks = new Tasks()

const sender = new driver.Ed25519Keypair()
const recipient1 = new driver.Ed25519Keypair()
const recipient2 = new driver.Ed25519Keypair()
const recipient3 = new driver.Ed25519Keypair()

const data = { this: 'is some data' }

let elem = order({
  data,
  sender: {
    publicKey: sender.publicKey
  },
  recipient: [
    {
      amount: 10,
      publicKey: recipient1.publicKey
    },
    {
      amount: 5,
      publicKey: recipient2.publicKey
    },
    {
      amount: 5,
      publicKey: recipient3.publicKey
    }
  ]
})

let cid, expanded, tx

tasks.add(_cid => {
  cid = _cid
  setTimeout(() => service.get(cid, tasks, 1), 3000)
})

tasks.add(_tx => {
  tx = _tx
  resolver.get(cid, '', tasks, 2)
})

tasks.add(el => {
  assert.deepEqual(el, elem)
  resolver.get(cid, 'data', tasks, 3)
})

tasks.add(result => {
  assert.deepEqual(result, data)
  resolver.get(cid, 'sender', tasks, 4)
})

tasks.add(result => {
  assert.deepEqual(result, elem.sender)
  resolver.get(cid, 'recipient/1', tasks, 5)
})

tasks.add(result => {
  assert.deepEqual(result, elem.recipient[1])
  elem = order({
    data: {
      '/': service.hashFromCID(cid) + '/data'
    },
    sender: {
      publicKey: recipient1.publicKey
    },
    recipient: [
      {
        amount: 5,
        publicKey: recipient1.publicKey
      },
      {
        amount: 5,
        publicKey: recipient2.publicKey
      }
    ]
  })
  service.put(assign(elem, { sender: recipient1 }), tasks, 6)
})

tasks.add(_cid => {
  cid = _cid
  setTimeout(() => resolver.get(cid, 'data/this', tasks, 7), 3000)
})

tasks.add(result => {
  assert.deepEqual(result, data.this)
  resolver.get(cid, '', tasks, 8)
})

tasks.add(el => {
  expanded = el
  expanded.data = data
  resolver.expand(el, tasks, 9)
})

tasks.add(result => {
  assert.deepEqual(result, expanded)
  tasks.callback(err => {
    assert.equal(err.message, errInvalidElement({}).message, '')
    tasks.run(10)
  })
  service.put({}, tasks, 10)
})

tasks.add(() => {
  tasks.callback(err => {
    assert.equal(err.message, errPathNotFound('badpath').message, '')
    tasks.run(11)
  })
  resolver.get(cid, 'badpath', tasks, 11)
})

// TODO: test more errors

tasks.add(() => {
  console.log('Finished BigchainDB test')
  process.exit()
})

service.put(assign(elem, { sender }), tasks, 0)
