'use strict'

const expect = require('chai').expect
const it = require('mocha').it
const files = require('./files')
const Resolver = require('../../lib/resolver')

const {
  ContentService,
  MetadataService,
  errInvalidPassword,
  errUnsupportedService
} = require('../../lib')

const {
  errInvalidElement,
  errPathNotFound
} = require('../../lib/util')

const {
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
    contentService.import(files, params.encryptionPassword, (err, meta) => {
      if (err) {
        throw err
      }
      recording.setAudio(meta[0])
      done()
    })
  })

  it('imports metadata', done => {
    const metadata = recording.tree()
    metadata.forEach(meta => {
      delete meta.path
    })
    metadataService.import(metadata, params.recipient, err => {
      if (err) {
        throw err
      }
      done()
    })
  })

  it('puts content', done => {
    contentService.put(err => {
      if (err) {
        throw err
      }
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('puts metadata', done => {
    metadataService.put(params.accountPassword, err => {
      if (err) {
        throw err
      }
      setTimeout(done, 2000)
    })
  }).timeout(MAX_TIMEOUT)

  it('gets content', done => {
    contentService.get('track.mp3', params.encryptionPassword, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(files[0].content)
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded recording metadata', done => {
    metadataService.get(recording.path + '/data', true, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(recording.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded composition metadata', done => {
    metadataService.get(recording.path + '/data/recordingOf', true, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(composition.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded music group metadata', done => {
    metadataService.get(recording.path + '/data/byArtist/0', true, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(musicGroup.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded person metadata', done => {
    metadataService.get(recording.path + '/data/byArtist/0/member/0', true, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(person.data())
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets metadata sender', done => {
    metadataService.get(recording.path + '/sender', false, (err, result) => {
      if (err) {
        throw err
      }
      if (params.sender) {
        expect(result).to.deep.equal(params.sender)
      } else {
        expect(result).to.be.null
      }
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('gets metadata recipient', done => {
    metadataService.get(recording.path + '/recipient', false, (err, result) => {
      if (err) {
        throw err
      }
      if (params.recipient) {
        expect(result).to.deep.equal(params.recipient)
      } else {
        expect(result).to.be.null
      }
      done()
    })
  }).timeout(MAX_TIMEOUT)

  it('imports linked metadata', done => {
    delete recording.path
    const metadata = recording.tree()
    metadataService.import(metadata, params.recipient, err => {
      if (err) {
        throw err
      }
      done()
    })
  })

  it('puts linked metadata', done => {
    metadataService.put(params.accountPassword, err => {
      if (err) {
        throw err
      }
      done()
    })
  })

  it('gets nonexistent path', done => {
    metadataService.get(recording.path + '/data/badpath', true, err => {
      expect(err.message).to.equal(errPathNotFound('data/badpath').message)
      done()
    })
  })

  if (params.accountPassword) {
    it('uses invalid password', done => {
      metadataService.put('badpassword', err => {
        expect(err.message).to.equal(errInvalidPassword('badpassword').message)
        done()
      })
    })
  }

  it('uses unexpected service', () => {
    let err
    try {
      new ContentService({ name: 'badcontentservice' })
    } catch (e) {
      err = e
    }
    expect(err.message).to.equal(errUnsupportedService('badcontentservice').message)
    try {
      new MetadataService({ name: 'badmetadataservice' })
    } catch (e) {
      err = e
    }
    expect(err.message).to.equal(errUnsupportedService('badmetadataservice').message)
  })
}

exports.contentService = service => {

  const contents = files.map(file => {
    return file.content
  })

  let hashes

  it('puts content', done => {
    service.put(contents, (err, result) => {
      if (err) {
        throw err
      }
      hashes = result
      done()
    })
  })

  it('gets content', done => {
    service.get(hashes[0], (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(contents[0])
      done()
    })
  })
}

exports.metadataService = (service, sender, recipient) => {

  const resolver = new Resolver(service)

  let cid

  it('puts person metadata', done => {
    service.put({
      data: person.data('ipld'),
      sender,
      recipient
    }, (err, result) => {
      if (err) {
        throw err
      }
      person.path = service.hashFromCID(result)
      done()
    })
  })

  it('puts musicGroup metadata', done => {
    service.put({
      data: musicGroup.data('ipld'),
      sender,
      recipient
    }, (err, result) => {
      if (err) {
        throw err
      }
      musicGroup.path = service.hashFromCID(result)
      done()
    })
  })

  it('puts composition metadata', done => {
    service.put({
      data: composition.data('ipld'),
      sender,
      recipient
    }, (err, result) => {
      if (err) {
        throw err
      }
      composition.path = service.hashFromCID(result)
      done()
    })
  })

  it('puts recording metadata', done => {
    service.put({
      data: recording.data('ipld'),
      sender,
      recipient
    }, (err, result) => {
      if (err) {
        throw err
      }
      recording.path = service.hashFromCID(result)
      setTimeout(done, 2000)
    })
  }).timeout(MAX_TIMEOUT)

  it('gets expanded metadata', done => {
    cid = service.pathToCID(recording.path).cid
    resolver.get(cid, 'data', true, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(recording.data())
      done()
    })
  })

  it('gets metadata sender', done => {
    resolver.get(cid, 'sender', false, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal({
        publicKey: sender.publicKey
      })
      done()
    })
  })

  it('gets metadata recipient', done => {
    resolver.get(cid, 'recipient', false, (err, result) => {
      if (err) {
        throw err
      }
      expect(result).to.deep.equal(recipient)
      done()
    })
  })

  it('gets invalid path', done => {
    resolver.get(cid, 'badpath', false, err => {
      expect(err.message).to.equal(errPathNotFound('badpath').message)
      done()
    })
  })

  it('puts invalid element', done => {
    service.put({}, err => {
      expect(err.message).to.equal(errInvalidElement({}).message)
      done()
    })
  })
}
