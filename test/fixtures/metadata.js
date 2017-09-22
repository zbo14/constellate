'use strict'

const Person = require('js-coalaip/src/core').Person

const {
  MusicComposition,
  MusicGroup,
  MusicRecording
} = require('js-coalaip/src/music')

const me = new Person()
me.setFamilyName('b')
me.setGivenName('zach')

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

const newRecording = new MusicRecording()

module.exports = {
  me,
  person,
  musicGroup,
  composition,
  recording
}
