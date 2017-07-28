'use strict'

const BigchainDB = require('../lib/bigchaindb.js')
const driver = require('bigchaindb-driver')
const Resolver = require('../lib/resolver.js')
const { Tasks } = require('../lib/util.js')

const API = 'http://192.168.99.100:9984/api/v1'

const service = new BigchainDB.MetadataService(API)
const resolver = new Resolver(service)

const tasks = new Tasks()

let issuer = new driver.Ed25519Keypair()
const holder1 = new driver.Ed25519Keypair()
const holder2 = new driver.Ed25519Keypair()
const holder3 = new driver.Ed25519Keypair()

const data = { this: 'is some data' }
const metadata = { this: 'is some metadata' }

let node = {
  data,
  issuer,
  metadata,
  owners: [
    {
      amount: '10',
      publicKeys: holder1.publicKey
    },
    {
      amount: '20',
      publicKeys: [ holder2.publicKey, holder3.publicKey ],
      threshold: 2
    }
  ]
}

let actual, cid, expected, t = 0

tasks.init()

tasks.add(cid => {
  const id = pathFromCID(cid)
  if (tx.id !== id) {
    return tasks.error('EXPECTED ' + tx.id + '\nGOT ' + id)
  }
  setTimeout(() => resolver.get(cid, '', tasks, t++), 3000)
})

tasks.add(result => {
  if (tx.id !== result.id) {
    return tasks.error('EXPECTED ' + tx.id + '\nGOT ' + result.id)
  }
  BigchainDB.Tx.cid(result, tasks, t++)
})

tasks.add(_cid => {
  cid = _cid
  resolver.get(cid, 'asset', tasks, t++)
})

tasks.add(result => {
  expected = JSON.stringify(asset)
  actual = JSON.stringify(result)
  if (expected !== actual) {
    return tasks.error('EXPECTED ' + expected + '\nGOT ' + actual)
  }
  resolver.get(cid, 'metadata', tasks, t++)
})

tasks.add(result => {
  expected = JSON.stringify(metadata)
  actual = JSON.stringify(result)
  if (expected !== actual) {
    return tasks.error('EXPECTED ' + expected + '\nGOT ' + actual)
  }
  resolver.get(cid, 'issuers/0', tasks, t++)
})

tasks.add(result => {
  if (issuer.publicKey !== result[0]) {
    return tasks.error('EXPECTED ' + issuer.publicKey + '\nGOT ' + result[0])
  }
  resolver.get(cid, 'holders/1', tasks, t++)
})

tasks.add(result => {
  if (!result.publicKeys.includes(holder2.publicKey)) {
    return tasks.error('public keys should include ' + holder2.publicKey)
  }
  if (!result.publicKeys.includes(holder3.publicKey)) {
    return tasks.error('public keys should include ' + holder3.publicKey)
  }
  node = {
    id: tx.id,
    issuer: holder1,
    metadata: { this: 'is some more metadata' },
    owners: [
      {
        amount: '5',
        holder1.publicKey
      },
      {
        amount: '5',
        holder2.publicKey
      }
    ]
  }
  service.put(node, tasks, t++)
})

tasks.add(cid => {
  setTimeout(() => resolver.get(cid, 'asset', tasks, t++), 3000)
})

tasks.add(result => {
  expected = JSON.stringify(asset)
  actual = JSON.stringify(result)
  if (expected !== actual) {
    return tasks.error('EXPECTED ' + expected + '\nGOT ' + actual)
  }
  console.log('Done')
  process.exit()
})

service.put(node, tasks, t++)
