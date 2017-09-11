# API

## Node.js
The Node.js implementation of Constellate.

### ContentService
The ContentService is responsible for the uplaoding and retrieval of media to and from data stores.

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
The get function is used to get media content which has been imported and put into the service previously. 
```js
contentService.get('{hash|name}', (err, buf) => {
  if (err) throw err

  console.log(buf)

  // <Buffer ...>
})
```

##### Parameters

`string` - the hash or name to query

`Function` - callback with the signature `function (err, buffer)`



#### contentService.import
Importing is the prerequisite to put. The content must first be imported into the service before it can be put on a data store. 
```js
const file = {
  content:  <Buffer ...>,
  name: 'track.mp3',
  type: 'audio/mp3'
}

contentService.import([file, ...], (err) => {
  if (err) throw err

  ... do other stuff
})
```

##### Parameters

`Object[]` - an array of objects with file content, name, and type

`Function` - callback with the signature `function (err, objects)`



#### contentService.put
Put actually puts the object into the specified data store. The specified store's configuration is passed into the ContentService during instantiation.
```js
contentService.put(err => {
  if (err) throw err
  // ...
})
```

##### Parameters

`Function` - callback with the signature `function (err)`





### MetadataService
The MetadataService is responsible for the pushing and retrieval of metadata to and from specified data stores.

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
The get function is used to get metadata which has been imported and put into the service previously. The boolean value applies functionality to resolve merkle links therefore providing any and all information nested in the hash

```js
metadataService.get('{hash|name}/data', false, (err, obj) => {
  if (err) throw err
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
metadataService.get('{hash|name}/data', true, (err, obj) => {
  if (err) throw err

  console.log(obj)

  // {
  //   name: 'Band',
  //   member: [
  //     {
  //       givenName: 'John',
  //       familyName: 'Smith',
  //     },
  //     {
  //       ...
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
  if (err) throw err
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
Browser implementation - Zach is this still working?

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
