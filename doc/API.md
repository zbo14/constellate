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

### ipfs-node

#### new IpfsNode
```js
const IpfsNode = require('constellate/lib/ipfs-ipfs.js');

const ipfs = new IpfsNode();

const started = ipfs.start();

started.then(() => {
  // ...
});
```

#### ipfs.addFile

##### Parameters

`Buffer|ReadableStream` - the file data to add.

##### Returns

`Promise<string>` - a promise with the file multihash.

#### ipfs.addObject

##### Parameters

`Object` - the object to add.

##### Returns

`Promise<string>` - a promise with the object hash (i.e. base-encoded CID).

#### ipfs.calcMultihash

##### Parameters

`Buffer|ReadableStream` - the file data.

##### Returns

`string` - the multihash of the file.

#### ipfs.getFile

##### Parameters

`string` - the file multihash.

##### Returns

`Promise<Object>` - a promise with an object that contains the file data and MIME type.

#### ipfs.getObject

##### Parameters

`Object|string` - a CID object or hash.

##### Returns

`Promise<Object>` - a promise with the object.

#### ipfs.info

##### Returns

`Promise<Object>`

#### ipfs.start

##### Returns

`Promise`

#### ipfs.stop

##### Returns

`Promise`

#### ipfs.version

##### Returns

`Promise<?>`

### ipld

#### dereference

##### Parameters

`Object` - the CID to dereference.

[`IpfsNode`](#new-ipfsnode)

##### Returns

`Promise<any>` - a promise containing the dereferenced value.

#### expand

##### Parameters

`Object` - the object to expand.

[`IpfsNode`](#new-ifpsnode)

##### Returns

`Promise<Object>` - a promise containing the expanded object with dereferenced merkle-links.

#### flatten

##### Parameters

`Object` - the object to flatten.

[`IpfsNode`](#new-ifpsnode)

##### Returns

`Promise<Object>` - a promise containing the flattened object with merkle-links.

### translate

#### new Translate
```js
const Translate = require('constellate/lib/translate.js');

const translate = new Translate();

const started = translate.start();

started.then(() => {
  // ...
});
```

#### translate.fromCSV

##### Parameters
`string` - the contents of a CSV file.

##### Returns
`Promise<Object[]>` - a promise with an array of IPLD-formatted objects.

#### translate.fromJSON

##### Parameters
`string` - the contents of a JSON file.

##### Returns
`Promise<Object[]>` - a promise with an array of IPLD-formatted objects.

#### translate.start

##### Returns
`Promise`

#### translate.stop

##### Returns
`Promise`

### util

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
