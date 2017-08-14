'use strict'

const assert = require('assert')
const exec = require('child_process').exec
const fs = require('fs')
const Swarm = require('../lib/swarm.js')
const Tasks = require('../lib/util.js').Tasks

const filepath = 'proj1/track1.mp3'

const content = fs.readFileSync(filepath)
const service = new Swarm.ContentService('http://swarm-gateways.net')

const tasks = new Tasks()

let hash

tasks.add(result => {
  exec('swarm hash ' + filepath, (err, stdout) => {
    if (err) {
      return tasks.error(err)
    }
    hash = stdout.slice(0, -1)
    assert.equal(hash, result)
    service.put([content], tasks, 1)
  })
})

tasks.add(result => {
  assert.equal(hash, result)
  service.get(hash, tasks, 2)
})

tasks.add(result => {
  if (!result.equals(content)) {
    return tasks.error('content does not match')
  }
  console.log('Finished swarm test')
  process.exit()
})

service.hash(content, tasks, 0)
