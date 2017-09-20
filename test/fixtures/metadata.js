'use strict'

const Person = require('js-coalaip/src/core').Person

const {
  MusicComposition,
  MusicGroup,
  MusicRecording
} = require('js-coalaip/src/music')

const person = new Person()
person.setFamilyName('Dwyer')
person.setGivenName('Andy')

const musicGroup = new MusicGroup()
musicGroup.setName('Mouse Rat')
musicGroup.addMember(person)

const composition = new MusicComposition()
composition.setName('November')
composition.addComposer(person)

const recording = new MusicRecording()
recording.addByArtist(musicGroup)
recording.setRecordingOf(composition)

module.exports = {
  person,
  musicGroup,
  composition,
  recording
}
