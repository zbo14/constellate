'use strict'

// const assert = require('chai').assert
const fs = require('fs')
const Constellate = require('../lib/constellate')
const Tasks = require('../lib/util').Tasks

const constellate = new Constellate()
const tasks = new Tasks()

const proj1Path = '../demo/proj1/'
const proj2Path = '../demo/proj2/'

const content1 = fs.readFileSync(proj1Path + 'content/audio.mp3')
const content2 = fs.readFileSync(proj2Path + 'content/audio.mp3')

const file1 = {
  content: content1,
  name: 'audio.mp3',
  path: '',
  type: 'audio/mp3'
}

const file2 = {
  content: content2,
  name: 'audio.mp3',
  path: '',
  type: 'audio/mp3'
}

const MusicComposition1 = {
  content: fs.readFileSync(proj1Path + 'metadata/MusicComposition.csv', 'utf8'),
  name: 'MusicComposition',
  path: '',
  type: 'text/csv'
}

const MusicGroup = {
  content: fs.readFileSync(proj1Path + 'metadata/MusicGroup.csv', 'utf8'),
  name: 'MusicGroup',
  path: '',
  type: 'text/csv'
}

const MusicRecording1 = {
  content: fs.readFileSync(proj1Path + 'metadata/MusicRecording.csv', 'utf8'),
  name: 'MusicRecording',
  path: '',
  type: 'text/csv'
}

const Organization = {
  content: fs.readFileSync(proj1Path + 'metadata/Organization.csv', 'utf8'),
  name: 'Organization',
  path: '',
  type: 'text/csv'
}

const Person = {
  content: fs.readFileSync(proj1Path + 'metadata/Person.csv', 'utf8'),
  name: 'Person',
  path: '',
  type: 'text/csv'
}

const Hash = {
  content: fs.readFileSync(proj2Path + 'metadata/Hash.csv', 'utf8'),
  name: 'Hash',
  path: '',
  type: 'text/csv'
}

const MusicComposition2 = {
  content: fs.readFileSync(proj2Path + 'metadata/MusicComposition.csv', 'utf8'),
  name: 'MusicComposition',
  path: '',
  type: 'text/csv'
}

const MusicRecording2 = {
  content: fs.readFileSync(proj2Path + 'metadata/MusicRecording.csv', 'utf8'),
  name: 'MusicRecording',
  path: '',
  type: 'text/csv'
}

let contentService = 'ipfs-content-service'
const metadataService = 'ipfs-metadata-service'
const password = 'passwerd'

tasks.init()

let hashes, t = 0

tasks.add(() => {
  constellate.importContent(contentService, [file1], password, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.importMetadata([
    MusicComposition1,
    MusicGroup,
    MusicRecording1,
    Organization,
    Person
  ], err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.generateIPLD(metadataService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.pushIPLD(metadataService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.uploadContent(contentService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  hashes = constellate.exportMetaHashes()
  constellate.getMetadata(metadataService, hashes.recording, true, (err, result) => {
    if (err) {
      return tasks.error(err)
    }
    console.log(JSON.stringify(result, null, 2))
    tasks.run(t++)
  })
})

tasks.add(() => {
  const name = 'audio.mp3'
  hashes = constellate.exportFileHashes()
  constellate.getContent(contentService, hashes[name], { name, password }, (err, result) => {
    if (err) {
      return tasks.error(err)
    }
    if (!content1.equals(result.content)) {
      return tasks.error('decrypted content does not match original')
    }
    constellate.clearFileHashes()
    constellate.clearMetadata()
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.Swarm('http://swarm-gateways.net', err => {
    if (err) {
      return tasks.error(err)
    }
    contentService = 'swarm-content-service'
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.importContent(contentService, [file2], err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.importMetadata([
    Hash,
    MusicComposition2,
    MusicRecording2
  ], err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.generateIPLD(metadataService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.pushIPLD(metadataService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  constellate.uploadContent(contentService, err => {
    if (err) {
      return tasks.error(err)
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  hashes = constellate.exportFileHashes()
  constellate.getContent(contentService, hashes['audio.mp3'], (err, result) => {
    if (err) {
      return tasks.error(err)
    }
    if (!content2.equals(result.content)) {
      return tasks.error('query result does not match content')
    }
    tasks.run(t++)
  })
})

tasks.add(() => {
  hashes = constellate.exportMetaHashes()
  constellate.getMetadata(metadataService, hashes.anotherRecording, true, (err, result) => {
    if (err) {
      return tasks.error(err)
    }
    console.log(JSON.stringify(result, null, 2))
    tasks.run(t++)
  })
})

tasks.add(() => {
  console.log('Done')
  process.exit()
})

constellate.IPFS(err => {
  if (err) {
    return tasks.error(err)
  }
  tasks.run(t++)
})
