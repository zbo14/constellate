# API

## Node.js

### ContentService

NOTE: some functionality isn't documented below (e.g. `import` and `put`). It is recommended to use `Project` for this, as it handles content and metadata together.

#### new ContentService
```js
const ContentService = require('./lib/constellate').ContentService

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.Hashes.import

Import hashes to enable querying by name.

```js
const hashes = {
  name1: 'hash1',
  name2: 'hash2',
  ...
}

contentService.Hashes.import(hashes)
```

##### Parameters

`Object` - an object with the hashes

#### contentService.get

Query content by hash or name.

##### Parameters

```js
contentService.get('{hash|name}', (err, buf) => {
  if (err) {
    throw err
  }
  console.log(buf)

  // <Buffer ...>
})
```

`string` - the hash or name to query

`Function` - callback with the signature `function (err, buffer)`

### MetadataService

NOTE: some functionality isn't documented below (e.g. `import` and `put`). It is recommended to use `Project` for this, as it handles content and metadata together.

#### new MetadataService
```js
const MetadataService = require('./lib/constellate').MetadataService

const params = {
  name: 'bigchaindb',
  path: 'API_ENDPOINT'
}

const metadataService = new MetadataService(params)
```

#### metadataService.Hashes.import

Import hashes to enable querying by name.

```js
const hashes = {
  name1: 'hash1',
  name2: 'hash2',
  ...
}

metadataService.Hashes.import(hashes)
```

##### Parameters

`Object` - an object with the hashes

#### metadataService.get

Query metadata by path.

```js
metadataService.get('{hash|name}/data', false, (err, obj) => {
  if (err) {
    throw err
   }
   console.log(obj)

   // {
   //   name: 'Band',
   //   member: [
   //     {
   //       '/': 'hash1'
   //     },
   //     {
   //       '/': 'hash2'
   //     }
   //   ]
   // }
})
```

##### Parameters

`string` - the path to query

`boolean` - whether to expand the object (i.e. resolve merkle links)

`Function` - callback with the signature `function (err, object)`

### Project

#### new Project
```js
const Project = require('./lib/constellate').Project

const params = {
  contentService: {
    name: 'ipfs',
    path: '/ip4/127.0.0.1/tcp/5001'
  },
  metadataService: {
    name: 'bigchaindb',
    path: 'API_ENDPOINT'
  },
  title: 'proj1'
}

const project = new Project(params)
```

#### project.import

Imports content, metadata and generates linked data.

```js
const fs = require('fs')

const buf = fs.readFileSync('./test/proj1/track1.mp3')

const content = {
  content: buf,
  name: 'track1.mp3',
  type: 'audio/mp3'
}

const text = fs.readFileSync('./test/proj1/metadata.json', 'utf8')

const metadata = JSON.parse(text)

project.import([content, ...], metadata, err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`Object[]` - an array of content objects

`Object[]` - an array of metadata objects (see examples in `./test/{proj1|proj2}`)

#### project.upload

Uploads content and pushes linked data.

```js
project.upload(err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`Function` - callback with the signature `function (err)`

#### project.export

```js
const linkedData = project.export('linked_data')
const contentHashes = project.export('content_hashes')
const metadataHashes = project.export('metadata_hashes')
```

##### Parameters

`string` - the name of the object to export

##### Returns

`Object` - the exported object

## Browser

### ContentService

#### new ContentService
```js
const ContentService = require('./lib/constellate').ContentService

const params = {
  browser: true,
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.Hashes.import

Import hashes to enable querying by name.

```js
const input = document.querySelector('input[type="file"]')

const file = input.files[0]

contentService.Hashes.import(file)
```

##### Parameters

`File` - a JSON file with the hashes

#### contentService.get

Query content by hash or name.

##### Parameters

```js
contentService.get('{hash|name}', (err, file) => {
  if (err) {
    throw err
  }
  console.log(file)

  // File { name: 'track1.mp3', ... , type: 'audio/mp3' }
})
```

`string` - the hash or name to query

`Function` - callback with the signature `function (err, file)`

### MetadataService

#### new MetadataService
```js
const MetadataService = require('./lib/constellate').MetadataService

const params = {
  browser: true,
  name: 'bigchaindb',
  path: 'API_ENDPOINT'
}

const metadataService = new MetadataService(params)
```

#### metadataService.Hashes.import

Import hashes to enable querying by name.

```js
const input = document.querySelector('input[type="file"]')

const file = input.files[0]

metadataService.Hashes.import(file)
```

##### Parameters

`Object` - a JSON file with the hashes

#### metadataService.get

same as Node.js API method

### Project

#### new Project
```js
const Project = require('./lib/constellate').Project

const params = {
  browser: true,
  contentService: {
    name: 'ipfs',
    path: '/ip4/127.0.0.1/tcp/5001'
  },
  metadataService: {
    name: 'bigchaindb',
    path: 'API_ENDPOINT'
  },
  title: 'proj1'
}

const project = new Project(params)
```

#### project.import

Imports content, metadata and generates linked data.

```js
const contentInput = document.getElementById('content-input')
const metadataInput = document.getElementById('metadata-input')

const content = Array.from(contentInput.files)
const metadata = metadataInput.files[0]

project.import(content, metadata, err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`File[]` - an array of audio, image, and/or video files

`File` - the metadata JSON file (see examples in `./test/{proj1|proj2}`)

#### project.export

```js
const linkedData = project.export('linked_data')
const contentHashes = project.export('content_hashes')
const metadataHashes = project.export('metadata_hashes')

console.log(linkedData)

// File { name: 'proj1_linked_data.json', ... , type: 'application/json' }
```

##### Parameters

`string` - the name of the file to export

##### Returns

`File` - the exported file
