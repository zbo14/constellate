## Constellate

Beware of 🔥🔥

Persist and retrieve linked metadata with media content. The two main components are...

`ContentService` - Responsible for persisting and retrieving media content from the storage layer.

`MetadataService` - Responsible for persisting and retrieving linked metadata (e.g. [IPLD](https://ipld.io/)) from the database/storage layer.

#### Get Started
```js
const ContentService = require('./src/content-service')

// Running ipfs daemon

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

// Import media

contentService.import([file, ...], (err, mediaObjects) => {
  if (err) {
    throw err
  }
  console.log(contentService.hashes)

  // {
  //   "track.mp3": "QmSRna7zhvyzxyqN7bSHA4JbJMzWSMjkApJWaMzxPQ7LEN",
  //   ...
  // }

  console.log(mediaObjects[0].data())

  // {
  //   "@context": "http://schema.org",
  //   "@type":  "AudioObject",
  //   "contentUrl": "http://127.0.0.1:5001/api/v0/get?arg=QmSRna7zhvyzxyqN7bSHA4JbJMzWSMjkApJWaMzxPQ7LEN",
  //   "encodingFormat": "audio/mp3",
  //   "name": "track.mp3"
  // },

  // Persist to storage layer
  contentService.put(err => {
    if (err) {
      throw err
    }

    // Retrieve media
    contentService.get(file.name, (err, buf) => {
      if (err) {
        throw error
      }
      console.log(buf)

      // <Buffer ...>
    })
  })
})
```

Check out the [API doc](https://github.com/zbo14/constellate/tree/master/doc/API.md) and [tests](https://github.com/zbo14/constellate/tree/master/test/fixtures/test.js) for more examples.
