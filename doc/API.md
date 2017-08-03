## API

### constellate

#### new Constellate

```js
const Constellate = require('./lib/constellate')

const constellate = new Constellate()
```

#### constellate.IPFS

##### Parameters

`string` [optional] - the IPFS repo path

`Function` - callback with the signature `function (err)`

#### constellate.Swarm

##### Paramters

`string` - the Swarm HTTP API endpoint

#### constellate.importContent

##### Parameters

`Object[]` - an array of objects with the following properties
```js
{
  content: <Buffer ...>,
  name: 'filename',
  type: 'audio/*|image/*|video/*'
}
```

`Function` - callback with the signature `function (err)`

#### constellate.importMetadata

##### Parameters

`Object[]` - an array of objects with the following properties
```js
{
  content: 'text',
  name: 'filename',
  type: 'application/json|text/csv'
}
```

`Function` - callback with the signature `function (err)`

#### constellate.generateIPLD

##### Parameters

`string` - the metadata service to use

`Function` - callback with the signature `function (err)`

#### constellate.uploadContent

##### Parameters

`string` - the content service to use

`Function` - callback with the signature `function (err)`

#### constellate.pushIPLD

##### Paramters

`string` - the metadata service to use

`Function` - callback with the signature `function (err)`

#### constellate.getContent

##### Parameters

`string` - the content service to use

`string` - the path to query

`Function` - callback with the signature `function (err, object)`

#### constellate.getMetadata

##### Parameters

`string` - the metadata service to use

`string[]` - the path to query

`Function` - callback with the signature `function (err, object)`

#### constellate.exportFileHashes

##### Returns

`Object` - an object with file hashes

#### constellate.exportMetaHashes

##### Returns

`Object` - an object with metadata hashes

#### constellate.exportIPLD

##### Returns

`Object[]` - an array of IPLD objects

### Browser

#### constellate.Browser.importContent

##### Parameters

`File[]` - audio, image, or video files

`Function` - callback with the signature `function (err)`

#### constellate.Browser.importMetadata

##### Parameters

`File[]` - CSV or JSON files

`Function` - callback with the signature `function (err)`

#### constellate.Browser.getContent

##### Parameters

`string` - the content service to use

`string` - the path to query

`Function` - callback with the signature `function (err, file)`
