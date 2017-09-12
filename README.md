## Constellate

Constellate is a library built for the purposes of generating [IPLD](https://ipld.io/) and the ability to upload to one or several distributed data stores. In a world where everything is going digital it's increasingly more important to be able to store data that is interoperable.

Constellate is a solution for those looking to interface with data stored on distributed systems. It provides the functionality to link modeled data reguardless of the protocol.

Current data store integrations include:
1. [IPFS](https://ipfs.io/)
2. [BigchainDB](https://www.bigchaindb.com/)


Functionality is compatible with Node.js as well as a browser implementation, enabling users to interact with these distributed systems directly in their browser.

The two main components are *ContentService* and *MetadataService* - each with specific use cases.

### ContentService
The ContentService is meant for working with media files. By `import`ing media files and `put`ting them into a data store, one can `get` the head of the hashed object 
(along with the file and proper metadata) by requesting the name of the file.

### MetadataService
Similar to ContentService except used for the sole purpose of storing metadata. The metadata itself should be modeled in a linked data structure in order to get the most out of this service. Consider using a service such as this javascript implementation of [COALAIP](https://github.com/COALAIP/js-coalaip) to structure data.

#### Get Started
```js
const ContentService = require('./lib').ContentService

const params = {
  name: 'ipfs',
  path: '/ip4/127.0.0.1/tcp/5001'
}

const contentService = new ContentService(params)

const file = {
  content:  <Buffer ...>,
  name: 'track.mp3',
  type: 'audio/mp3'
}

// import into service
contentService.import([file, ...], (err, files) => {
  if (err) throw err

  console.log(files)
  [
    {
      @context: 'http://schema.org',
      @type:  'AudioObject',
      contentUrl: 'ipfs.io/ipfs/QmcSFW_EXAMPLE_oH9HRxEyi3Eh3',
      encodingFormat: 'audio/mp3',
      name: 'track.mp3'
    },
    ...
  ]
  
  ...

  // put in ipfs
  contentService.put((er) => {
    if (er) throw er

    // get from service
    contentService.get(file.name, (error, object) => {
	    if (error) throw error

    });
  });
});
```

Check out our [API docs](https://github.com/zbo14/constellate/blob/feat/coalaip/doc/API.md) for more info.
