'use strict'

const assert = require('assert')
const ContentService = require('../../src/content-service')
const errPathNotFound = require('../../src/errors').errPathNotFound
const expect = require('chai').expect
const it = require('mocha').it
const files = require('./files')
const MetadataService = require('../../src/metadata-service')
const MusicRecording = require('js-coalaip/src/music').MusicRecording
const Resolver = require('../../src/resolver')

const {
  me,
  person,
  musicGroup,
  composition,
  recording
} = require('./metadata')

const MAX_TIMEOUT = 5000

exports.constellate = params => {

  const contentService = new ContentService(params.contentService)
  const metadataService = new MetadataService(params.metadataService)

  it('imports content', done => {
    contentService.import(files, params.encryptionPassword, (err, metadata) => {
      expect(err).to.be.null
      recording.addAudio(metadata[0])
      done()
    })
  })

  it('imports metadata', done => {
    recording.subInstances().forEach(instance => {
      delete instance.path
    })
    metadataService.import(recording.subInstances(), err => {
      expect(err).to.be.null
      done()
    })
  })

  it('puts content', done => {
    contentService.put(err => {
      expect(err).to.be.null
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('puts metadata', done => {
    metadataService.put(err => {
      expect(err).to.be.null
      setTimeout(done, 2000)
    })
  }).timeout(MAX_TIMEOUT)

  it('gets content', done => {
    contentService.get('track.mp3', params.encryptionPassword, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(files[0].content)
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets recording ipld', done => {
    metadataService.get(recording.path, false, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(recording.ipld())
      done()
    })
  })

  it('gets expanded recording metadata', done => {
    metadataService.get(recording.path, true, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(recording.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded recording metadata with id', done => {
    metadataService.get(recording.path, true, '@id', (err, result) => {
      expect(err).to.be.null
      recording.subInstances().forEach(instance => {
        instance.set('@id', instance.path)
      })
      expect(result).to.deep.equal(recording.data())
      recording.subInstances().forEach(instance => {
        instance.rm('@id')
      })
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded composition metadata', done => {
    metadataService.get(recording.path + '/recordingOf', true, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(composition.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded music group metadata', done => {
    metadataService.get(recording.path + '/byArtist/0', true, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(musicGroup.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded person metadata', done => {
    metadataService.get('Andy Dwyer', true, (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(person.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('imports linked metadata', done => {
    delete recording.path
    metadataService.import(recording.subInstances(), err => {
      expect(err).to.be.null
      done()
    })
  })

  it('puts linked metadata', done => {
    metadataService.put(err => {
      expect(err).to.be.null
      done()
    })
  })

  it('gets nonexistent path', done => {
    metadataService.get(recording.path + '/badpath', true, err => {
      expect(err.message).to.equal(errPathNotFound('badpath').message)
      done()
    })
  })
}

exports.contentService = service => {

  const contents = files.map(file => file.content)

  let hashes

  it('puts content', done => {
    service.put(contents, (err, result) => {
      expect(err).to.be.null
      hashes = result
      done()
    })
  })

  it('gets content', done => {
    service.get(hashes[0], (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(contents[0])
      done()
    })
  })
}

exports.metadataService = service => {

  const resolver = new Resolver(service)

  it('puts my metadata', done => {
    service.put(me.ipld(), (err, result) => {
      expect(err).to.be.null
      service.hashFromCID(result, (err, hash) => {
        expect(err).to.be.null
        me.path = hash
      })
      done()
    })
  })

  it('puts person metadata', done => {
    service.put(person.ipld(), (err, result) => {
      expect(err).to.be.null
      service.hashFromCID(result, (err, hash) => {
        expect(err).to.be.null
        person.path = hash
      })
      done()
    })
  })

  // it('puts musicGroup metadata', done => {
  //   service.put(musicGroup.ipld(), (err, result) => {
  //     expect(err).to.be.null
  //     service.hashFromCID(result, (err, hash) => {
  //       expect(err).to.be.null
  //       musicGroup.path = hash
  //     })
  //     done()
  //   })
  // })

  it('adds member to musicGroup, then puts', done => {
    musicGroup.addMember(me)
    service.put(musicGroup.ipld(), (err, result) => {
      expect(err).to.be.null
      service.hashFromCID(result, (err, hash) => {
        expect(err).to.be.null
        musicGroup.path = hash
      })
      done()
    })
  })

  it('puts composition metadata', done => {
    service.put(composition.ipld(), (err, result) => {
      expect(err).to.be.null
      service.hashFromCID(result, (err, hash) => {
        expect(err).to.be.null
        composition.path = hash
      })
      done()
    })
  })

  it('puts recording metadata', done => {
    service.put(recording.ipld(), (err, result) => {
      expect(err).to.be.null
      service.hashFromCID(result, (err, hash) => {
        expect(err).to.be.null
        recording.path = hash
        setTimeout(done, 2000)
      })
    })
  }).timeout(MAX_TIMEOUT)

  it('expands metadata', done => {
    resolver.expand({ '/': recording.path }, '', (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(recording.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('expands metadata with id', done => {
    resolver.expand({ '/': recording.path }, '@id', (err, result) => {
      expect(err).to.be.null
      recording.subInstances().forEach(instance => {
        instance.set('@id', instance.path)
      })
      expect(result).to.deep.equal(recording.data())
      recording.subInstances().forEach(instance => {
        instance.rm('@id')
      })
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('expands first member of musicGroup', done => {
    resolver.expand({ '/': musicGroup.path + '/member/0' }, '', (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(person.data())
      done()
    })
  })

  it('expands second member of musicGroup', done => {
    resolver.expand({ '/': musicGroup.path + '/member/1' }, '', (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(me.data())
      done()
    })
  })

  it('parses ipld of recording and expands', done => {
    const newRecording = new MusicRecording()
    newRecording.withData(recording.ipld())
    resolver.expand(newRecording.ipld(), '', (err, result) => {
      expect(err).to.be.null
      expect(result).to.deep.equal(recording.data())
      done()
    })
  })

  it('gets invalid path', done => {
    const { cid } = service.pathToCID(recording.path)
    resolver.get(cid, 'badpath', '', err => {
      expect(err.message).to.equal(errPathNotFound('badpath').message)
      done()
    })
  })
}
