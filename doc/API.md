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

##### Description

Import media files

##### Parameters

`File[]` - audio, image, or video files

`string` - [optional] password to generate keys for encryption

`Function` - callback with the signature `function (err)`


#### constellate.importMeta

##### Description

Import metadata files

##### Parameters

`File[]` - csv or json files

`Function` - callback with the signature `function (err)`

#### constellate.generate

##### Description

Generate IPLD from metadata and content

##### Parameters

`Function` - callback with the signature `function (err)`

#### constellate.upload

Push IPLD and upload content

##### Parameters

#### constellate.get

##### Parameters

`string` - hash or path to query

`string` - [optional] hexadecimal key for decryption

`Function` - callback with the signature `function (err, result)`

#### constellate.stop

##### Parameters

`Function` - callback with the signature `function (err)`
