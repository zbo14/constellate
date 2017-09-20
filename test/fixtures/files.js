'use strict'

const fs = require('fs')

const content = fs.readFileSync(__dirname + '/track.mp3')

module.exports = [{
  content,
  name: 'track.mp3',
  type: 'audio/mp3'
}]
