'use strict'

const assert = require('chai').assert

const exec = require('child_process').exec
const fs = require('fs')
const Swarm = require('../lib/swarm.js')
const Tasks = require('../lib/util.js').Tasks

const filepath = '../demo/proj1/content/audio.mp3'

const content = fs.readFileSync(filepath)
const service = new Swarm.ContentService('http://swarm-gateways.net')
const tasks = new Tasks()

let hash, t = 0

tasks.init()

tasks.add(result => {
  exec(`swarm hash ${filepath}`, (err, stdout) => {
    if (err) {
      return tasks.error(err)
    }
    hash = stdout.slice(0, -1)
    assert.equal(hash, result, 'hashes are not equal')
    service.put({ content }, tasks, t++)
  })
})

tasks.add(result => {
  assert.equal(hash, result, 'upload hash does not equal original hash')
  service.get(hash, tasks, t++)
})

tasks.add(obj => {
  if (!content.equals(obj.content)) {
    return tasks.error('query result does not equal content')
  }
  console.log('Done')
  process.exit()
})

service.hash({ content }, tasks, t++)
