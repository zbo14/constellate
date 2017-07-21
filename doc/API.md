## API

### constellate

#### new Constellate

```js
const Constellate = require('./lib/constellate')

const constellate = new Constellate()

constellate.start(err => {})
```

#### constellate.start

##### Parameters

`Function` - callback with the signature `function (err)`

#### constellate.importContent

##### Parameters

`File[]` - audio, image, and/or video files

`Function` - callback with the signature `function (err)`


#### constellate.importMetadata

##### Parameters

`File[]` - csv or json files

`Function` - callback with the signature `function (err)`

#### constellate.generateIPLD

##### Parameters

`Function` - callback with the signature `function (err)`

#### constellate.upload

##### Parameters

`Function` - callback with the signature `function (err)`

#### constellate.getContent

##### Parameters

`string` - the hash and/or path to query

`Function` - callback with the signature `function (err, file)`

#### constellate.getMetadata

##### Parameters

`string[]` - the hashes and/or paths to query

`Function` - callback with the signature `function (err, objects)`

#### constellate.exportHashes

##### Returns

`Object` - an object with file and metadata hashes

#### constellate.exportIPLD

##### Returns

`Object[]` - an array of IPLD objects

#### constellate.stop

##### Parameters

`Function` - callback with the signature `function (err)`
