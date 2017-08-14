'use strict'

const bodyParser = require('body-parser')
const express = require('express')
const fs = require('fs')
const fileType = require('file-type')

const Fingerprint = require('./lib/fingerprint')
const Tasks = require('./lib/util').Tasks

const app = express()
const fp = new Fingerprint()
const tasks = new Tasks()

app.use(bodyParser.text())

app.use(express.static(__dirname + '/public'))

app.post('/fingerprint', (req, res) => {
  res.setHeader('Content-Type', 'text/plain')
  tasks.init((err, result) => {
    if (err) {
      res.writeHead(500)
      return res.end(JSON.stringify(err))
    }
    res.writeHead(200)
    res.end(result)
  })
  try {
    const data = Buffer.from(req.body, 'binary')
    const { ext, _ } = fileType(data)
    const filepath = '/tmp/' + Date.now() / 1000 + '.' + ext
  } catch(err) {
    tasks.error(err)
  }
  fs.writeFile(filepath, data, err => {
    if (err) {
      return tasks.error(err)
    }
    fp.calc(filepath, tasks, -1)
  })
})

app.listen(8888, '127.0.0.1')
