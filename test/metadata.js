'use strict'

const {
  AudioObject,
  Person
} = require('/Users/zach/Desktop/js-coalaip/src/core')

const {
  MusicComposition,
  MusicGroup,
  MusicRecording
} = require('/Users/zach/Desktop/js-coalaip/src/music')

const andy = new Person()
andy.setFamilyName('Dwyer')
andy.setGivenName('Andy')

const band = new MusicGroup()
band.setName('Mouse Rat')
band.addMember(andy)

const comp = new MusicComposition()
comp.setName('November')
comp.addComposer(andy)

const audio = new AudioObject

const rec = new MusicRecording()
rec.addByArtist(band)
rec.setRecordingOf(comp)

module.exports = rec.tree()
