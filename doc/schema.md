## Schema

### [Thing](http://schema.org/Thing)

### [Action](http://schema.org/Action)
##### Thing > Action

### [ReviewAction](https://github.com/COALAIP/specs/tree/master/schema#rrm-assertion)
##### Thing > Action > ReviewAction

`asserter` - merkle-link to [Person](#person) / [Organization](#organization)

`assertionSubject` - merkle-link to [Thing](#thing)

`assertionTruth` - boolean

`error` - string

`validFrom` - ISO 8601 DateTime

`validThrough` - ISO 8601 DateTime

```js
{
    "@context": [
        "http://coalaip.org/",
        "http://schema.org/"
    ],
    "@type": "ReviewAction",
    "asserter": {
        "/": "zdpuAwn3woQJ9B4e14VDYXwWpCGgi8HGtZSEk6AWQtt5vzAcU"
    },
    "assertionSubject": {
        "/": "zdpuAydnpAcfEuS6mmvL1ZPXEeZN9ofLf427HcwsC1KvEUPBt"
    },
    "assertionTruth": false,
    "error": "validThrough"
}
```

### [TransferAction](http://schema.org/TransferAction)
##### Thing > Action > TransferAction

### [RightsTransferAction](https://github.com/COALAIP/specs/tree/master/schema#rrm-rightsassignment)
##### Thing > Action > TransferAction > RightsTransferAction

`transferContract` - merkle-link to [ContractAccount](#contractaccount)

```js
{
    "@context": [
        "http://coalaip.org/",
        "http://schema.org/"
    ],
    "@type": "RightsTransferAction",
    "transferContract": {
        "/": "zdpuAmoUdEBgEJ6aPJBkZMm1qr1cNW3uD9nxJr2j3JU2F6xaN"
    }
}
```

### [CreativeWork](http://schema.org/CreativeWork)
##### Thing > CreativeWork

### [MusicComposition](http://schema.org/MusicComposition)
##### Thing > CreativeWork > MusicComposition

`composer` - array of merkle-links to [Person](#person)s / [Organization](#organization)s

`lyricist` - array of merkle-links to [Person](#person)s / [Organization](#organization)s

`genre` - string

`iswcCode` - string

`name` - string

`publisher` - array of merkle-links to [Organization](#organization)s

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicComposition",
    "composer": [{
        "/": "zdpuAxw7NVPhT3bLwqEbYjpr9PKFzF75yE3Adqwn4FE71vbaZ"
    }],
    "genre": "slimecore",
    "iswcCode": "T-034.524.680-1",
    "lyricist": [{
        "/": "zdpuB18HrjH2S7YLsreS8pe8sF8eu6qxC24Fug92AaMcHUMZY"
    }],
    "name": "song-title",
    "publisher": [{
        "/": "zdpuAp7vSSMSce4EcRka3CdFC3JKLXeD5vaHC1qYD8evXc27c"
    }]
}
```

### [MusicRecording](http://schema.org/MusicRecording)
##### Thing > CreativeWork > MusicRecording

`audio` - array of merkle-links to [AudioObject](#audioobject)s

`byArtist` - array of merkle-links to [MusicGroup](#musicgroup)s

`genre` - string

`image` - merkle-link to [ImageObject](#imageobject)

`isrcCode` - string

`name` - string

`producer` - array of merkle-links to [Person](#person)s / [Organization](#organization)s

`recordingOf` - merkle-link to [MusicComposition](#musiccomposition)

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicRecording",
    "audio": [{
        "/": "zdpuB2sPE4H4T4ubfwXRtadAUEGYjs8q8HSjYAXSUEoZ7VDrp"
    }],
    "byArtist": [{
        "/": "zdpuAwn3woQJ9B4e14VDYXwWpCGgi8HGtZSEk6AWQtt5vzAcU"
    }],
    "producer": [{
        "/": "zdpuAwfEHnob8r9Cz5uHo1rxtKU9rWXzS7JgmXxu448TaVxuz"
    }],
    "recordingOf": {
        "/": "zdpuAtc4Gmk6UGWJZuLPWWoC11W6v8SFzng994H8U9A4q8JS1"
    }
}
```

### [MediaObject](http://schema.org/MediaObject)
##### Thing > CreativeWork > MediaObject

`contentUrl` - merkle-link to file in IPFS

### [AudioObject](http://schema.org/AudioObject)
##### Thing > CreativeWork > MediaObject > AudioObject

`bitrate` - string

`duration` - ISO 8601 Duration

`encodingFormat` - string

```js
{
    "@context": "http://schema.org/",
    "@type": "AudioObject",
    "bitrate": "320",
    "contentUrl": {
        "/": "QmQbREs14UevBRiWVPDz8zBibSwLT4PXYQikhx9maLKHJ3"
    },
    "duration": "T4M33S",
    "encodingFormat": "mp3"
}
```

### [ImageObject](http://schema.org/ImageObject)
##### Thing > CreativeWork > MediaObject > ImageObject

`encodingFormat` - string

```js
{
    "@context": "http://schema.org/",
    "@type": "ImageObject",
    "contentUrl": {
        "/": "QmSK7jjjYvJvdYRQF27NYjUTqU7GG7rAxJvB3CVh28CfSR"
    },
    "encodingFormat": "png"
}
```

### [MusicPlaylist](http://schema.org/MusicPlaylist)
##### Thing > CreativeWork > MusicPlaylist

`genre` - string

`image` - merkle-link to [ImageObject](#imageobject)

`name` - string

`track` - array of merkle-links to [MusicRecording](#musicrecording)s

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicPlaylist",
    "image": {
        "/": "zdpuArXq27Qr8qJ8e8jkRgVohhW1X6RNvvjn86fyzmrgFxbjK"
    },
    "name": "just 1 song",
    "track": [{
        "/": "zdpuB2cinivPJQ5TM9cE4zVCgudXkR6NJsdMGCvWt851GpShx"
    }]
}
```

### [MusicAlbum](http://schema.org/MusicAlbum)
##### Thing > CreativeWork > MusicPlaylist > MusicAlbum

`albumProductionType` - string

`albumReleaseType` - string

`byArtist` - array of merkle-links to [MusicGroup](#musicgroup)s

`producer` - array of merkle-links to [Person](#person)s / [Organization](#organization)s

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicAlbum",
    "albumProductionType": "DemoAlbum",
    "albumReleaseType": "SingleRelease",
    "byArtist": [{
        "/": "zdpuAwn3woQJ9B4e14VDYXwWpCGgi8HGtZSEk6AWQtt5vzAcU"
    }],
    "image": {
        "/": "zdpuArXq27Qr8qJ8e8jkRgVohhW1X6RNvvjn86fyzmrgFxbjK"
    },
    "name": "album title",
    "producer": [{
        "/": "zdpuAwfEHnob8r9Cz5uHo1rxtKU9rWXzS7JgmXxu448TaVxuz"
    }],
    "track": [{
        "/": "zdpuB2cinivPJQ5TM9cE4zVCgudXkR6NJsdMGCvWt851GpShx"
    }]
}
```

### [MusicRelease](http://schema.org/MusicRelease)
##### Thing > CreativeWork > MusicPlaylist > MusicRelease

`catalogNumber` - string

`musicReleaseFormat` - string

`recordLabel` - array of merkle-links to [Organization](#organization)s

`releaseOf` - merkle-link to [MusicAlbum](#musicalbum)

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicRelease",
    "musicReleaseFormat": "DigitalFormat",
    "recordLabel": [{
        "/": "zdpuApKnGjxoazFP9dT7Rs3thcJcfon23BExYUvdUXaP5PP2Z"
    }],
    "releaseOf": {
        "/": "zdpuAoYRkuFHfPFsqE8RTvU8Gu8JnYejxqfgTCLvcosKe225J"
    }
}
```

### [Intangible](http://schema.org/Intangible)
##### Thing > Intangible

### [Copyright](https://github.com/COALAIP/specs/tree/master/schema#rrm-right)
##### Thing > Intangible > Copyright

`rightsOf` - merkle-link to a [CreativeWork](#creativework)

`territory` - [Place](http://schema.org/Place) with country code

`validFrom` - ISO 8601 DateTime

`validThrough` - ISO 8601 DateTime

```js
{
    "@context": [
        "http://coalaip.org/",
        "http://schema.org/"
    ],
    "@type": "Copyright",
    "rightsOf": {
        "/": "zdpuAtc4Gmk6UGWJZuLPWWoC11W6v8SFzng994H8U9A4q8JS1"
    },
    "territory": {
        "@type": "Place",
        "geo": {
            "@type": "GeoCoordinates",
            "addressCountry": "US"
        }
    },
    "validFrom": "2018-01-01T00:00:00Z",
    "validThrough": "2088-01-01T00:00:00Z"
}
```

### [DigitalFingerprint](https://github.com/COALAIP/specs/tree/master/schema#fingerprinting)
##### Thing > Intangible > DigitalFingerprint

`fingerprint` - URL-safe base64

`fingerprintOf` - merkle-link to media blob

```js
{
  "@context": [
    "http://coalaip.org/",
    "http://schema.org/"
  ],
  "@type": "DigitalFingerprint",
  "fingerprint": "AQAABpI2pdKkwLXxTE3xKNkxZT-0NxoAZYATDA",
  "fingerprintOf": {
    "/": "QmcMmTFWToHC9iNqNUS8obreMRRSwWwfkgbXU5WMVN9Xhs"
  }
}
```

### [Right](https://github.com/COALAIP/specs/tree/master/schema#rrm-right)
##### Thing > Intangible > Right

`exclusive` - boolean

`license` - merkle-link to [ContractAccount](#contractaccount)

`numberOfUses` - number

`percentageShares` - number

`rightContext` - array of strings

`source` - merkle-link to [Copyright](#copyright)

`territory` - [Place](http://schema.org/Place) with country code

`usageType` - array of strings

`validFrom` - ISO 8601 DateTime

`validThrough` - ISO 8601 DateTime

```js
{
    "@context": [
        "http://coalaip.org/",
        "http://schema.org/"
    ],
    "@type": "Right",
    "exclusive": true,
    "license": {
        "/": "zdpuAmoUdEBgEJ6aPJBkZMm1qr1cNW3uD9nxJr2j3JU2F6xaN"
    },
    "percentageShares": 70,
    "rightContext": ["commercial"],
    "territory": {
        "@type": "Place",
        "geo": {
            "@type": "GeoCoordinates",
            "addressCountry": "US"
        }
    },
    "usageType": ["publish"],
    "source": {
        "/": "zdpuAp2qcFw6Lo8TMW3UiZMogZ1DDEqr5yfiACpf3xnv6hFXG"
    },
    "validFrom": "2018-01-01T00:00:00Z",
    "validThrough": "2068-01-01T00:00:00Z"
}
```

### [Organization](http://schema.org/Organization)
##### Thing > Organization

`email` - string

`member` - array of merkle-links to [Person](#person)s / [Organization](#organization)s

`name` - string

`sameAs` - array of URIs

`url` - URI

```js
{
    "@context": "http://schema.org/",
    "@type": "Organization",
    "email": "publisher@example.com",
    "name": "publisher name",
    "url": "http://publisher-homepage.com"
}
```

### [MusicGroup](http://schema.org/MusicGroup)
##### Thing > Organzation > MusicGroup

`genre` - string

```js
{
    "@context": "http://schema.org/",
    "@type": "MusicGroup",
    "email": "band@example.com",
    "member": [{
        "/": "zdpuAxw7NVPhT3bLwqEbYjpr9PKFzF75yE3Adqwn4FE71vbaZ"
    }],
    "name": "band name",
    "url": "http://band-homepage.com"
}
```

### [Person](http://schema.org/Person)
##### Thing > Person

`birthDate` - ISO 8601 Date

`email` - string

`familyName` - string

`givenName` - string

`sameAs` - array of URIs

`url` - URI

```js
{
    "@context": "http://schema.org/",
    "@type": "Person",
    "birthDate": "1995-01-01",
    "email": "composer@example.com",
    "familyName": "lastName",
    "givenName": "firstName",
    "url": "http://composer-homepage.com"
}
```

### [Account](http://ethon.consensys.net/EthOn_spec.html#class-account)

`address` - 32-byte hexadecimal

### [ContractAccount](http://ethon.consensys.net/EthOn_spec.html#class-contractaccount)
##### Account > ContractAccount

`accountCodeHash` - 32-byte base64

`refunds` - merkle-link to an [Account](#account)

```js
{
    "@context": "http://ethon.consensys.net/",
    "@type": "ContractAccount",
    "accountCodeHash": "YZXy2LY8zNi5RffMoaGJBnwNz9QnapUx118dMfeWA+M=",
    "address": "0xff2409ea254d83d2fcb6b62b85553d5fb87008fc"
}
```

### [ExternalAccount](http://ethon.consensys.net/EthOn_spec.html#class-externalaccount)
##### Account > ExternalAccount

`accountPublicKey` - 64-byte hexadecimal

```js
{
    "@context": "http://ethon.consensys.net/",
    "@type": "ExternalAccount",
    "accountPublicKey": "0x9679ef1d1b14e180244409421d55875e9c705012e89846546dbb7ceb00e4213797e2e2235b55e51521ad0a468fa05cd2df70dc6d937883cde3bff7bb01b0f43b",
    "address": "0xc7b0395675becc4e2947b2a287e9dc1ed3133e61"
}
```

### [Block](http://ethon.consensys.net/EthOn_spec.html#class-block)

`blockCreationTime` - ISO 8601 DateTime

`blockDifficulty` - string

`blockGasLimit` - number

`blockGasUsed` - 32-byte hexadecimal

`blockNonce` - 8-byte hexadecimal

`blockSize` - number

`createsPostBlockState` - [WorldState](http://ethon.consensys.net/EthOn_spec.html#class-worldstate)

`containsTx` - array of [Tx](#tx)s

`hasBeneficiary` - [Account](#account)

`hasParentBlock` - [Block](#block)

`hasTxTrie` - [TxTrie](http://ethon.consensys.net/EthOn_spec.html#class-txtrie)

`knowsOfUncle` - array of [Block](#block)s

`number` - number

```js
{
  "@context": "http://ethon.consensys.net/",
  "@type": "Block",
  "blockCreationTime": "2017-06-27T22:18:55.000Z",
  "blockDifficulty": "0",
  "blockGasLimit": 4712388,
  "blockGasUsed": 71254,
  "blockHash": "0xecfa150944a020d018e3aa5e182a4c89dfe1088935076a3ea50343f8989268fd",
  "blockSize": 1000,
  "containsTx": [
    {
      "@type": "Tx",
      "txHash": "0xfee17508c9767eee7468ec192fcb42f72e9c4078495eb6e0b162a302baa0bc50"
    }
  ],
  "createsPostBlockState": {
    "@type": "WorldState",
    "stateRoot": "0x14040f5321c1e517b64f61d89b8a213dbd2d6a0228879580ba4d813f8401dcbf"
  },
  "hasBeneficiary": {
    "@type": "Account",
    "address": "0x0000000000000000000000000000000000000000"
  },
  "hasParentBlock": {
    "@type": "Block",
    "blockHash": "0x85240e22192aa73227127ab53f5341ef3970941f63758a602052e96e68333d9f"
  },
  "hasTxTrie": {
    "@type": "TxTrie",
    "transactionsRoot": "0x56e81f171bcc55a6ff8345e692c0f86e5b48e01b996cadc001622fb5e363b421"
  },
  "number": 1
}
```

### [Tx](http://ethon.consensys.net/EthOn_spec.html#class-tx)

`fromAccount` - [Account](#account)

`msgGasPrice` - number

`msgPayload` - hexadecimal

`toAccount` - [Account](#account)

`txGasUsed` - number

`txHash` - 32-byte hexadecimal

`txNonce` - number

`value` - number

```js
{
    "@context": "http://ethon.consensys.net/",
    "@type": "Tx",
    "fromAccount": {
      "@type": "Account",
      "address": "0xc7b0395675becc4e2947b2a287e9dc1ed3133e61"
    },
    "msgGasPrice": 20000000000,
    "msgPayload": "0x6060604052346000575b60408060156000396000f3606060405260e060020a6000350463f8a8fd6d8114601c575b6000565b346000576026603a565b604080519115158252519081900360200190f35b60015b9056",
    "txGasUsed": 71254,
    "txHash": "0xc5705187548f5b4bb96fc167708897767444010342f62b3e6b1c6b4bb06ee474",
    "txNonce": 4
}
```
