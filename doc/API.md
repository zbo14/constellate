## API

### fingerprint

#### new Fingerprint
```js
const Fingerprint = require('constellate/lib/fingerprint.js');

const fp = new Fingerprint();
```

#### fp.calculate

*This function requires [chromaprint](https://acoustid.org/chromaprint).*

##### Parameters
`string` - path to an audio file.

`number` - [optional] length of audio data to use for fingerprint calculation.

##### Returns
`Promise<Object>` - a promise with a [DigitalFingerprint](https://github.com/zbo14/constellate/blob/master/doc/schema.md#digitalfingerprint).

#### fp.decode

##### Parameters
`string` - an [encoded fingerprint](#fpencode).

#### fp.encode

##### Returns
`string` - the compressed fingerprint encoded as a base64 string.

#### fp.match

##### Parameters
[`Fingerprint`](#new-fingerprint)

##### Returns
`Object`

#### fp.raw

##### Returns
`Uint32Array` - the raw fingerprint.

### form

#### new Form

##### Parameters
`HTMLElement|Object|string` - an HTML form, instance object, or schema type.

```js
const Form = require('constellate/lib/form.js');

let form;

const element = document.querySelector('form');
form = new Form(element);

// OR..

const instance = { /* ... */ };
form = new Form(instance);

// OR..

const type = 'MusicRecording';
form = new Form(type);
```
#### form.element

##### Returns

`HTMLFormElement`

#### form.instance

##### Returns

`Object`

#### form.schema

##### Returns

[`Schema`](#new-schema)

### gen-util

TODO

### ipfs-node

#### new IpfsNode
```js
const IpfsNode = require('constellate/lib/ipfs-node.js');

const node = new IpfsNode();
```

#### node.addFile

##### Parameters

`Buffer|ReadableStream` - the file data to add.

##### Returns

`Promise<string>` - a promise with the file multihash.

#### node.addObject

##### Parameters

`Object` - the object to add.

##### Returns

`Promise<string>` - a promise with the object hash (i.e. base-encoded CID).

#### node.calcHash

##### Parameters

`Buffer|Object|ReadableStream` - file data or an object.

##### Returns

`string` - the file multihash or object hash.

#### node.getFile

##### Parameters

`string` - the file multihash.

##### Returns

`Promise<Object>` - a promise with an object that contains the file data and MIME type.

#### node.getObject

##### Parameters

`Object|string` - a CID object or hash.

##### Returns

`Promise<Object>` - a promise with the object.

#### node.info

##### Returns

`Promise<Object>`

#### node.start

##### Returns

`Promise`

#### node.stop

##### Returns

`Promise`

#### node.version

##### Returns

`Promise<?>`

### linked-data

*This module uses the ipfs, ontology, and schema modules to dereference instance objects from merkle-links, check property-type agreement, and validate their structures against the corresponding JSON schema.*

#### dereference

##### Parameters

`Object` - the CID to dereference.

[`IpfsNode`](#new-ipfsnode)

##### Returns

`Promise<any>` - a promise containing the dereferenced value.

#### validate

##### Parameters

`Object` - the instance object to validate.

[`IpfsNode`](#new-ifpsnode)

##### Returns

`Promise<Object>` - a promise containing the expanded object with dereferenced merkle-links.

### ontology

#### getParentType

##### Parameters

`string` - the type.

##### Returns

`string` - the parent type.

#### getSubTypes

##### Parameters

`string` - the type.

##### Returns

`Array<string>` - the sub-types.

#### getTypesForProperty

##### Parameters

`string` - the instance property.

##### Returns

`Array<string>` - the expected type(s) for the dereferenced value of the instance property.

#### isAncestorType

##### Parameters

`string` - the ancestor type.

`string` - the descendant type.

##### Returns

`boolean`

### schema

##### Parameters

`Object|string` - a schema object or type.

#### new Schema
```js
const Schema = require('constellate/lib/schema.js');

let schema;

schema = new Schema({
    type: 'object',
    properties: { /* ... */ },
    // ...
});

// OR..

schema = new Schema('MusicRecording');
```

#### schema.validate

##### Parameters

`Object` - the instance object to validate.

##### Returns

`Error|null` - an error if validation fails, null if validation passes.

### schema-util

TODO

### web3-eth

#### new Web3Eth
```js
const Web3Eth = require('constellate/lib/web3-eth.js');

let web3eth;

window.addEventListener('load', () => {
    if (!web3) {
        return console.warn('Could not get web3 from MetaMask');
    }
    web3eth = new Web3Eth(web3.currentProvider);
    // ...
});
```

#### web3eth.callContract

##### Parameters
`Object` - a [contract object](#web3ethnewcontract).

`string` - the caller's address.

`string` - the name of the contract method.

`string` - the contract address.

`number` - the value (ETH) sent to contract.

`...any` - [optional] the method parameters.

##### Returns
`Promise<any>` - a promise with the return value from the contract call.

#### web3eth.deployContract

##### Parameters
`Object` - the [contract object](#web3ethnewcontract).

`string` - the deployer's address.

##### Returns
`Promise<Object>` - the deployed contract object.

#### web3eth.getAccounts

##### Returns
`Promise<Object[]>` - a promise with an array of [Account](https://github.com/zbo14/constellate/blob/master/doc/schema.md#account)s.

#### web3eth.getAccountStatus

##### Parameters
`string` - the account address.

##### Returns
`Promise<Object>` - a promise with an object containing the account balance and nonce.

#### web3eth.getBlock

##### Parameters
`string` - the block hash.

##### Returns
`Promise<Object>` - a promise with a [Block](https://github.com/zbo14/constellate/blob/master/doc/schema.md#block).

#### web3eth.getContractAccount

##### Parameters
`string` - the address of the contract.

##### Returns
`Promise<Object>` - a promise with a [ContractAccount](https://github.com/zbo14/constellate/blob/master/doc/schema.md#contractaccount).

#### web3eth.getTransaction

##### Parameters
`string` - the transaction hash.

##### Returns
`Promise<Object>` - a promise with a [Tx](https://github.com/zbo14/constellate/blob/master/doc/schema.md#tx).

#### web3eth.getTransactionReceipt

##### Parameters
`string` - the transaction hash.

##### Returns
`Promise<Object>` - a transaction receipt object.

#### web3eth.newContract

##### Parameters
`string` - the solidity source code for the contract.

##### Returns
`Object` - a new contract object.

#### web3eth.sendEther

##### Parameters
`string` - the sender's address.

`string` - the recipient's address.

`number` - the value to send.

##### Returns
`Promise<string>` - a promise with the transaction hash.

#### web3eth.sendTransaction

##### Parameters
`Object` - the [contract object](#web3ethnewcontract).

`string` - the sender's address.

`string` - the name of the contract method.

`string` - the contract address.

`number` - the value (ETH) to send.

`...any` - [optional] the method parameters.

##### Returns

#### web3eth.signData

##### Parameters
`string` - the signer's address.

`string` - the hex-encoded data to sign.

##### Returns
`Promise<Object>` - a promise with a signature object.
