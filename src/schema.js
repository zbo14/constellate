'use strict';

const {
  isObject,
  isString
} = require('../lib/gen-util.js');

const {
    Address,
    Boolean,
    Date,
    DateTime,
    Email,
    Hex32,
    Link,
    Number,
    String,
    Territory,
    Uri,
    WholeNumber,
    ajv,
    mergeObject,
    newArray,
    newBoolean,
    newContext,
    newEnum,
    newNumber,
    newObject,
    newString,
    newType
} = require('../lib/schema-util.js');

// @flow

/**
 * @module constellate/src/schema
 */

module.exports = function(argv: Object|string) {
  if (isObject(argv)) {
    Object.assign(this, argv);
  } else if (isString(argv)) {
    switch(argv) {
        case 'Account':
            Object.assign(this, Account);
            break;
        case 'Block':
            Object.assign(this, Block);
            break;
        case 'ContractAccount':
            Object.assign(this, ContractAccount);
            break;
        case 'ExternalAccount':
            Object.assign(this, ExternalAccount);
            break;
        case 'Tx':
            Object.assign(this, Tx);
            break;
        case 'MusicGroup':
            Object.assign(this, MusicGroup);
            break;
        case 'Organization':
            Object.assign(this, Organization);
            break;
        case 'Person':
            Object.assign(this, Person);
            break;
        case 'AudioObject':
            Object.assign(this, AudioObject);
            break;
        case 'ImageObject':
            Object.assign(this, ImageObject);
            break;
        case 'MusicAlbum':
            Object.assign(this, MusicAlbum);
            break;
        case 'MusicComposition':
            Object.assign(this, MusicComposition);
            break;
        case 'MusicPlaylist':
            Object.assign(this, MusicPlaylist);
            break;
        case 'MusicRecording':
            Object.assign(this, MusicRecording);
            break;
        case 'MusicRelease':
            Object.assign(this, MusicRelease);
            break;
        case 'Copyright':
            Object.assign(this, Copyright);
            break;
        case 'ReviewAction':
            Object.assign(this, ReviewAction);
            break;
        case 'Right':
            Object.assign(this, Right);
            break;
        case 'RightsTransferAction':
            Object.assign(this, RightsTransferAction);
            break;
        default:
            throw new Error('unexpected type: ' + argv);
    }
  } else {
    throw new Error('unexpected parameter: ' + JSON.stringify(argv));
  }
  const validate = ajv.compile(this);
  this.validate = (instance) => {
    validate(instance);
    if (!validate.errors) return null;
    return new Error(JSON.stringify(validate.errors));
  }
}

const Organization = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('Organization'),
    email: Email,
    member: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    name: String,
    sameAs: newArray(Uri, {
        minItems: 1,
        uniqueItems: true
    }),
    url: Uri
}, {
    required: [
      '@context',
      '@type',
      'name'
    ]
});

const Person = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('Person'),
    birthDate: Date,
    email: Email,
    familyName: String,
    givenName: String,
    sameAs: newArray(Uri, {
        minItems: 1,
        uniqueItems: true
    }),
    url: Uri
}, {
    required: [
        '@context',
        '@type',
        'familyName',
        'givenName'
    ]
});


const MusicGroup = mergeObject(Organization, {
    '@type': newType('MusicGroup'),
    genre: String
});

const MediaObject = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('MediaObject'),
    contentUrl: Link
}, {
    required: [
      '@context',
      '@type',
      'contentUrl'
    ]
});

const MusicComposition = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('MusicComposition'),
    composer: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    genre: String,
    iswcCode: newString({
        pattern: 'T-[0-9]{3}.[0-9]{3}.[0-9]{3}-[0-9]'
    }),
    lyricist: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    name: String,
    publisher: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    })
}, {
    required: [
        '@context',
        '@type',
        'composer',
        'name'
    ]
});

const MusicRecording = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('MusicRecording'),
    audio: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    byArtist: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    image: Link,
    isrcCode: newString({
        pattern: '^[A-Z]{2}-[A-Z0-9]{3}-[7890][0-9]-[0-9]{5}$'
    }),
    name: String,
    producer: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    recordingOf: Link
}, {
    required: [
        '@context',
        '@type',
        'audio',
        'byArtist',
        'producer',
        'recordingOf'
    ]
});

const MusicPlaylist = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('MusicPlaylist'),
    image: Link,
    name: String,
    track: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    })
}, {
    required: [
      '@context',
      '@type'
    ]
});

const AudioObject = mergeObject(MediaObject, {
    '@type': newType('AudioObject'),
    bitrate: String,
    duration: newString({
        pattern: '^T(\\d+H)?(\\d+M)?(\\d+S)?$'
    }),
    encodingFormat: newEnum([
        '',
        'flac',
        'mp3',
        'mpeg4',
        'wav'
    ])
});

const ImageObject = mergeObject(MediaObject, {
    '@type': newType('ImageObject'),
    encodingFormat: newEnum([
        '',
        'jpeg',
        'png'
    ])
});

const MusicAlbum = mergeObject(MusicPlaylist, {
    '@type': newType('MusicAlbum'),
    albumProductionType: newEnum([
        '',
        'CompilationAlbum',
        'DemoAlbum',
        'DJMixAlbum',
        'LiveAlbum',
        'MixtapeAlbum',
        'RemixAlbum',
        'SoundtrackAlbum',
        'SpokenWordAlbum',
        'StudioAlbum'
    ]),
    albumReleaseType: newEnum([
        '',
        'AlbumRelease',
        'BroadcastRelease',
        'EPRelease',
        'SingleRelease'
    ]),
    byArtist: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    genre: String,
    name: String,
    producer: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    })
}, {
    required: [
        'byArtist',
        'name',
        'producer',
        'track'
    ]
});

const MusicRelease = mergeObject(MusicPlaylist, {
    '@type': newType('MusicRelease'),
    catalogNumber: String,
    image: Link,
    musicReleaseFormat: newEnum([
        '',
        'CDFormat',
        'CassetteFormat',
        'DVDFormat',
        'DigitalAudioTapeFormat',
        'DigitalFormat',
        'LaserDiscFormat',
        'VinylFormat'
    ]),
    recordLabel: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    releaseOf: Link
}, {
    oneOf: [{
            required: ['releaseOf']
        },
        {
            required: ['track']
        }
    ]
});


const Copyright = newObject({
    '@context': newContext('http://coalaip.org/'),
    '@type': newType('Copyright'),
    rightsOf: Link,
    territory: Territory,
    validFrom: DateTime,
    validThrough: DateTime
}, {
    required: [
      '@context',
      '@type',
      'rightsOf'
    ]
});

const ReviewAction = newObject({
    '@context': newContext(
        'http://coalaip.org/',
        'http://schema.org/'
    ),
    '@type': newType('ReviewAction'),
    asserter: Link,
    assertionSubject: Link,
    assertionTruth: newBoolean({
        default: true
    }),
    error: String,
    validFrom: DateTime,
    validThrough: DateTime
}, {
    dependencies: {
        error: {
            properties: {
                assertionTruth: newBoolean({
                    enum: [false]
                })
            }
        }
    },
    not: {
        properties: {
            assertionTruth: newBoolean({
                enum: [false]
            }),
            error: newEnum([null])
        }
    },
    required: [
        '@context',
        '@type',
        'asserter',
        'assertionSubject'
    ]
});

const Right = newObject({
        '@context': newContext(
            'http://coalaip.org/',
            'http://schema.org/'
        ),
        '@type': newType('Right'),
        exclusive: Boolean,
        license: Link,
        numberOfUses: newNumber({
            minimum: 1
        }),
        percentageShares: newNumber({
            minimum: 1,
            maximum: 100
        }),
        rightContext: newArray(String, {
            minItems: 1,
            uniqueItems: true
        }),
        source: Link,
        territory: Territory,
        usageType: newArray(String, {
            minItems: 1,
            uniqueItems: true
        }),
        validFrom: DateTime,
        validThrough: DateTime
    }, {
    required: [
        '@context',
        '@type',
        'license',
        'source'
    ]
});

const RightsTransferAction = newObject({
    '@context': newContext('http://coalaip.org/'),
    '@type': newType('RightsTransferAction'),
    transferContract: Link
}, {
    required: [
      '@context',
      '@type',
      'transferContract'
    ]
});


const Account = newObject({
  '@context': newContext('http://ethon.consensys.net/'),
  '@type': newType('Account'),
  address: Address
}, {
  required: [
    '@context',
    '@type',
    'address'
  ]
});

const ContractAccount = mergeObject(Account, {
  '@type': newType('ContractAccount'),
  accountCodeHash: newString({ pattern: '^([A-Za-z0-9+/]{43}=)?$' }),
  refunds: Link
}, {
  required: ['accountCodeHash']
});

const ExternalAccount = mergeObject(Account, {
  '@type': newType('ExternalAccount'),
  accountPublicKey: newString({ pattern: '^0x[A-Fa-f0-9]{128}$'})
}, {
  required: ['accountPublicKey']
});

const Block = newObject({
    '@context': newContext('http://ethon.consensys.net/'),
    '@type': newType('Block'),
    blockCreationTime: DateTime,
    blockDifficulty: String,
    blockGasLimit: WholeNumber,
    blockGasUsed: WholeNumber,
    blockHash: Hex32,
    blockNonce: newString({ pattern: '^0x[A-Fa-f0-9]{16}$' }),
    blockSize: WholeNumber,
    createsPostBlockState: newObject({
      '@type': newType('WorldState'),
      stateRoot: Hex32
    }),
    containsTx: newArray(newObject({
      '@type': newType('Tx'),
      txHash: Hex32
    }), {
      minItems: 1,
      uniqueItems: true
    }),
    hasBeneficiary: newObject({
      '@type': newType('Account'),
      address: Address
    }),
    hasParentBlock: newObject({
      '@type': newType('Block'),
      blockHash: Hex32
    }),
    hasTxTrie: newObject({
      '@type': newType('TxTrie'),
      transactionsRoot: Hex32
    }),
    knowsOfUncle: newArray(newObject({
      '@type': newType('Block'),
      blockHash: Hex32
    }), {
      minItems: 1,
      uniqueItems: true
    }),
    number: WholeNumber
  }, {
    required: [
      '@context',
      '@type',
      'blockHash'
    ]
});

const Tx = newObject({
    '@context': newContext('http://ethon.consensys.net/'),
    '@type': newType('Tx'),
    from: newObject({
      '@type': newType('Account'),
      address: Address
    }),
    msgGasPrice: WholeNumber,
    msgPayload: newString({ pattern: '^0x[A-Fa-f0-9]+$' }),
    to: newObject({
      '@type': newType('Account'),
      address: Address
    }),
    txGasUsed: WholeNumber,
    txHash: Hex32,
    txNonce: WholeNumber,
    value: WholeNumber
  }, {
    required: [
      '@context',
      '@type',
      'txHash'
    ]
});
