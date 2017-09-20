'use strict'

const fs = require('fs')
const path = require('path')

const content = fs.readFileSync(path.join(__dirname, 'track.mp3'))

module.exports = [{
  content,
  name: 'track.mp3',
  type: 'audio/mp3'
}]
