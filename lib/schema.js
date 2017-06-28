'use strict';

const {
    isObject,
    isString,
    orderObject
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

//      

/**
 * @module constellate/src/schema
 */

const Thing = newObject({
    '@context': newContext('http://schema.org/'),
    '@type': newType('Thing')
}, {
    required: [
        '@context',
        '@type'
    ]
});

const Action = mergeObject(Thing, {
    '@type': newType('Action')
});

const ReviewAction = mergeObject(Action, {
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
        'asserter',
        'assertionSubject'
    ]
});

const TransferAction = mergeObject(Action, {
    '@type': newType('TransferAction')
});

const RightsTransferAction = mergeObject(TransferAction, {
    '@context': newContext(
        'http://coalaip.org/',
        'http://schema.org/'
    ),
    '@type': newType('RightsTransferAction'),
    transferContract: Link
}, {
    required: [
        'transferContract'
    ]
});

const CreativeWork = mergeObject(Thing, {
    '@type': newType('CreativeWork')
});

const MusicComposition = mergeObject(CreativeWork, {
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
        'composer',
        'name'
    ]
});

const MusicRecording = mergeObject(CreativeWork, {
    '@type': newType('MusicRecording'),
    audio: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    byArtist: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    }),
    genre: String,
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
        'audio',
        'byArtist',
        'producer',
        'recordingOf'
    ]
});

const MediaObject = mergeObject(CreativeWork, {
    '@type': newType('MediaObject'),
    contentUrl: Link
}, {
    required: ['contentUrl']
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

const MusicPlaylist = mergeObject(CreativeWork, {
    '@type': newType('MusicPlaylist'),
    image: Link,
    genre: String,
    name: String,
    track: newArray(Link, {
        minItems: 1,
        uniqueItems: true
    })
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

const Intangible = mergeObject(Thing, {
    '@type': newType('Intangible')
});

const Copyright = mergeObject(Intangible, {
    '@context': newContext(
        'http://coalaip.org/',
        'http://schema.org/'
    ),
    '@type': newType('Copyright'),
    rightsOf: Link,
    territory: Territory,
    validFrom: DateTime,
    validThrough: DateTime
}, {
    required: ['rightsOf']
});

const DigitalFingerprint = mergeObject(Intangible, {
    '@context': newContext(
        'http://coalaip.org/',
        'http://schema.org/'
    ),
    '@type': newType('DigitalFingerprint'),
    fingerprint: newString({
        pattern: '^[A-Za-z0-9-_]+$'
    }),
    fingerprintOf: Link
}, {
    required: [
        'fingerprint',
        'fingerprintOf'
    ]
});


const Right = mergeObject(Intangible, {
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
        'license',
        'source'
    ]
});

const Organization = mergeObject(Thing, {
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
    required: ['name']
});

const MusicGroup = mergeObject(Organization, {
    '@type': newType('MusicGroup'),
    genre: String
});

const Person = mergeObject(Thing, {
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
        'familyName',
        'givenName'
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
    accountCodeHash: newString({
        pattern: '^([A-Za-z0-9+/]{43}=)?$'
    }),
    refunds: Link
}, {
    required: ['accountCodeHash']
});

const ExternalAccount = mergeObject(Account, {
    '@type': newType('ExternalAccount'),
    accountPublicKey: newString({
        pattern: '^0x[A-Fa-f0-9]{128}$'
    })
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
    blockNonce: newString({
        pattern: '^0x[A-Fa-f0-9]{16}$'
    }),
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
    msgPayload: newString({
        pattern: '^0x[A-Fa-f0-9]+$'
    }),
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

module.exports = function(argv) {
    let schema;
    if (isObject(argv)) {
        schema = argv;
    } else if (isString(argv)) {
        switch (argv) {
            case 'ReviewAction':
                schema = ReviewAction;
                break;
            case 'RightsTransferAction':
                schema = RightsTransferAction;
                break;
            case 'MusicComposition':
                schema = MusicComposition;
                break;
            case 'MusicRecording':
                schema = MusicRecording;
                break;
            case 'AudioObject':
                schema = AudioObject;
                break;
            case 'ImageObject':
                schema = ImageObject;
                break;
            case 'MusicPlaylist':
                schema = MusicPlaylist;
                break;
            case 'MusicAlbum':
                schema = MusicAlbum;
                break;
            case 'MusicRelease':
                schema = MusicRelease;
                break;
            case 'Copyright':
                schema = Copyright;
                break;
            case 'DigitalFingerprint':
                schema = DigitalFingerprint;
                break;
            case 'Right':
                schema = Right;
                break;
            case 'Organization':
                schema = Organization;
                break;
            case 'MusicGroup':
                schema = MusicGroup;
                break;
            case 'Person':
                schema = Person;
                break;
            case 'Account':
                schema = Account;
                break;
            case 'ContractAccount':
                schema = ContractAccount;
                break;
            case 'ExternalAccount':
                schema = ExternalAccount;
                break;
            case 'Block':
                schema = Block;
                break;
            case 'Tx':
                schema = Tx;
                break;
            default:
                throw new Error('unexpected type: ' + argv);
        }
    } else {
        throw new Error('unexpected parameter: ' + JSON.stringify(argv));
    }
    Object.assign(this, orderObject(schema));
    const validate = ajv.compile(this);
    this.validate = (instance) => {
        validate(instance);
        if (!validate.errors) return null;
        return new Error(JSON.stringify(validate.errors));
    }
}