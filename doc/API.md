# API

## Node.js

### ContentService
The ContentService is responsible for persisting and retrieving media.

#### new ContentService
```js
const ContentService = require('./src/content-service')

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.get
This method retrieves media which has been persisted to the storage layer.
```js
contentService.get('{hash|name}', (err, buf) => {
  if (err) {
    throw err
  }
  console.log(buf)

  // <Buffer ...>
})
```

##### Parameters

`string` - the hash or name to query

*To query by name, `contentService.hashes` should be an object with names as keys and hashes as values*

`Function` - callback with the signature `function (err, buffer)`

#### contentService.import
Import media before persisting to a storage layer. This method generates a [js-coalaip](https://github.com/COALAIP/js-coalaip) MediaObject for each file.

```js
const file = {
  content: <Buffer ...>,
  name: 'track.mp3',
  type: 'audio/mp3'
}

contentService.import([file, ...], (err, mediaObjects) => {
  if (err) {
    throw err
  }
  console.log(contentService.hashes)

  // {
  //   "track.mp3": "QmSRna7zhvyzxyqN7bSHA4JbJMzWSMjkApJWaMzxPQ7LEN",
  //   ...
  // }
})
```

##### Parameters

`Object[]` - an array of objects with file content, name, and type

`Function` - callback with the signature `function (err, MediaObjects)`



#### contentService.put
This method persists imported media to a storage layer.
```js
contentService.put(err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`Function` - callback with the signature `function (err)`

### MetadataService
The MetadataService is responsible for persisting and retrieving metadata.

#### new MetadataService
```js
const MetadataService = require('./src/metadata-service')

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const metadataService = new MetadataService(params)
```


#### metadataService.get
This method retrieves metadata which has already been persisted to the database/storage layer.

```js
metadataService.get('{hash|name}', false, (err, obj) => {
  if (err) {
    throw err
  }
  console.log(obj)

  // {
  //   "@context": "http://schema.org",
  //   "@type": "MusicGroup",
  //   "description": "descriptive",
  //   "member": [
  //     {
  //       "/": "zdpuB2i18e52uzbBUHsM9bcUPEcAJQzPxSCsVVU8UtkJSL821"
  //     }
  //   ],
  //   "name": "Beatles"
  // }
})

// - VS -

metadataService.get('{hash|name}', true, (err, obj) => {
  if (err) {
    throw err
  }
  console.log(obj)

  // {
  //   "@context": "http://schema.org",
  //   "@type": "MusicGroup",
  //   "description": "descriptive",
  //   "member": [
  //     {
  //       "@context": "http://schema.org",
  //       "@type": "Person",
  //       "email": "jsmith@email.com",
  //       "familyName": "Smith",
  //       "givenName": "John"
  //     }
  //   ],
  //   "name": "Beatles"
  // }
})
```

##### Parameters

`string` - the path to query

*To query by name, `metadataService.hashes` should be an object with names as keys and hashes as values*

`boolean` - whether to expand the object (i.e. resolve merkle links)

`Function` - callback with the signature `function (err, object)`



#### metadataService.import
Import metadata from [js-coalaip](https://github.com/COALAIP/js-coalaip) instances.
```js
const metadata = instance.subInstances()

metadataService.import(metadata, err => {
  if (err) {
    throw err
  }
  console.log(metadataService.hashes)

  // {
  //   Beatles: "zdpuAyUDHx2iJrnChYuWWBaATvW8GC1HRpd3h4FBkBMd9x9Fa",
  //   John Smith: "zdpuB2i18e52uzbBUHsM9bcUPEcAJQzPxSCsVVU8UtkJSL821"
  // }
})
```

##### Parameters

`js-coalaip instances`

`Function` - callback with the signature `function (err)`

#### metadataService.put
This method persists imported metadata to the database/storage layer.
```js
metadataService.put(err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`Function` - callback with the signature `function (err)`


## Browser

### ContentService

#### new ContentService
```js
const ContentService = require('./src/content-service/browser')

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.get

```js
contentService.get('{hash|name}', (err, file) => {
  if (err) {
    throw err
  }
  console.log(file)

  // File { name: 'track.mp3', ... , type: 'audio/mp3' }
})
```

##### Parameters

`string` - the hash or name to query

*To query by name, `contentService.hashes` should be an object with names as keys and hashes as values*

`Function` - callback with the signature `function (err, file)`

#### contentService.import

```js
const input = document.querySelector('input[type="file"]')

const content = Array.from(input.files)

contentService.import(content, (err, mediaObjects) => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`File[]` - an array of audio, image, and/or video files

`Function` - callback with the signature `function (err, MediaObjects)`

#### contentService.put

Same as Node.js API method
