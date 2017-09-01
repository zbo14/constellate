# API

## Node.js

### ContentService

#### new ContentService
```js
const ContentService = require('./lib').ContentService

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.get
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

`Function` - callback with the signature `function (err, buffer)`

#### contentService.import
```js
const file = {
  content:  <Buffer ...>,
  name: 'track.mp3',
  type: 'audio/mp3'
}

contentService.import([file, ...], (err, objs) => {
  if (err) {
    throw err
  }
  console.log(objs)

  // [
  //   {
  //     @context: 'http://schema.org',
  //     @type:  'AudioObject',
  //     contentUrl: '',
  //     encodingFormat: 'audio/mp3',
  //     name: 'track.mp3'
  //   },
  //   ...
  // ]
})
```

##### Parameters

`Object[]` - an array of objects with file content, name, and type

`Function` - callback with the signature `function (err, objects)`

#### contentService.put
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

#### new MetadataService
```js
const MetadataService = require('./lib').MetadataService

const params = {
  name: 'bigchaindb',
  path: 'API_ENDPOINT'
}

const metadataService = new MetadataService(params)
```

#### metadataService.get

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
   //       '/': 'hash1/data'
   //     },
   //     {
   //       '/': 'hash2/data'
   //     }
   //   ]
   // }
})
```

##### Parameters

`string` - the path to query

`boolean` - whether to expand the object (i.e. resolve merkle links)

`Function` - callback with the signature `function (err, object)`

#### metadataService.import

```js
metadataService.import(metadata, err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`js-coalaip instances`

`Function` - callback with the signature `function (err)`

#### metadataService.put

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
const ContentService = require('./lib/browser').ContentService

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)
```

#### contentService.get

##### Parameters

```js
contentService.get('{hash|name}', (err, file) => {
  if (err) {
    throw err
  }
  console.log(file)

  // File { name: 'track.mp3', ... , type: 'audio/mp3' }
})
```

#### contentService.import

```js
const input = document.querySelector('input[type="file"]')

const content = Array.from(input.files)

contentService.import(content, (err, objs) => {
  if (err) {
    throw err
  }
  console.log(objs)

  // [
  //   {
  //     @context: 'http://schema.org',
  //     @type:  'AudioObject',
  //     contentUrl: '',
  //     encodingFormat: 'audio/mp3',
  //     name: 'track.mp3'
  //   },
  //   ...
  // ]
})
```

##### Parameters

`File[]` - an array of audio, image, and/or video files

`Function` - callback with the signature `function (err, objects)`

#### contentService.put

Same as Node.js API method

### MetadataService

#### new MetadataService
```js
const MetadataService = require('./lib/browser').MetadataService

const params = {
  name: 'bigchaindb',
  path: 'API_ENDPOINT'
}

const metadataService = new MetadataService(params)
```

#### metadataService.get

Same as Node.js API method

#### metadataService.import
```js
const input = document.querySelector('input[type="file"]')

const file = input.files[0]

metadataService.import(file, err => {
  if (err) {
    throw err
  }
  // ...
})
```

##### Parameters

`File` - a JSON file with the metadata

`Function` - callback with the signature `function (err)`

#### metadataService.put

Same as Node.js API method
