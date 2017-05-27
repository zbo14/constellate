const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { writeTestFile } = require('./fs.js');
const { calcHash } = require('../lib/ipfs.js');

const hashes = {};
const objs = {};

function promiseSeq(...fns) {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve()).catch(console.error);
}

function setId(name) {
    return calcHash(objs[name], 'dag-cbor').then((hash) => {
        return hashes[name] = hash;
    })
}

const composerKeypair = ed25519.keypairFromPassword('muzaq');
const lyricistKeypair = rsa.generateKeypair();
const performerKeypair = secp256k1.generateKeypair();
const producerKeypair = ed25519.generateKeypair();
const publisherKeypair = rsa.generateKeypair();
const recordLabelKeypair = secp256k1.generateKeypair();

writeTestFile('/keys/composerKeypair.json', ed25519.encodeKeypair(composerKeypair));
writeTestFile('/keys/lyricistKeypair.json', rsa.encodeKeypair(lyricistKeypair));
writeTestFile('/keys/performerKeypair.json', secp256k1.encodeKeypair(performerKeypair));
writeTestFile('/keys/producerKeypair.json', ed25519.encodeKeypair(producerKeypair));
writeTestFile('/keys/publisherKeypair.json', rsa.encodeKeypair(publisherKeypair));
writeTestFile('/keys/recordLabelKeypair.json', secp256k1.encodeKeypair(recordLabelKeypair));

objs.composer = {
    '@context': 'http://schema.org/',
    '@type': 'MusicGroup',
    email: 'composer@example.com',
    name: 'composer',
    sameAs: ['http://facebook-sameAs.com'],
    url: 'http://composer.com'
}

objs.lyricist = {
    '@context': 'http://schema.org/',
    '@type': 'MusicGroup',
    email: 'lyricist@example.com',
    name: 'lyricist',
    url: 'http://lyricist.com'
}

objs.performer = {
    '@context': 'http://schema.org/',
    '@type': 'MusicGroup',
    address: secp256k1.publicKeyToAddress(performerKeypair.publicKey),
    email: 'performer@example.com',
    name: 'performer',
    sameAs: ['http://bandcamp-page.com'],
    url: 'http://performer.com'
}

objs.producer = {
    '@context': 'http://schema.org/',
    '@type': 'MusicGroup',
    name: 'producer',
    sameAs: ['http://soundcloud-page.com'],
    url: 'http://producer.com'
}

objs.publisher = {
    '@context': 'http://schema.org/',
    '@type': 'Organization',
    email: 'publisher@example.com',
    name: 'publisher',
    url: 'http://publisher.com'
}

objs.recordLabel = {
    '@context': 'http://schema.org/',
    '@type': 'Organization',
    address: secp256k1.publicKeyToAddress(recordLabelKeypair.publicKey),
    email: 'recordLabel@example.com',
    name: 'recordLabel',
    url: 'http://recordLabel.com'
}

writeTestFile('/parties/composer.json', JSON.stringify(objs.composer));
writeTestFile('/parties/lyricist.json', JSON.stringify(objs.lyricist));
writeTestFile('/parties/performer.json', JSON.stringify(objs.performer));
writeTestFile('/parties/producer.json', JSON.stringify(objs.producer));
writeTestFile('/parties/publisher.json', JSON.stringify(objs.publisher));
writeTestFile('/parties/recordLabel.json', JSON.stringify(objs.recordLabel));

promiseSeq(
    () => setId('composer'),
    () => setId('lyricist'),
    () => setId('performer'),
    () => setId('producer'),
    () => setId('publisher'),
    () => setId('recordLabel')

).then(() => {

    objs.audio = {
        '@context': 'http://schema.org/',
        '@type': 'AudioObject',
        contentUrl:  { '/': 'QmYKAhVW2d4e28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE' },
        encodingFormat: 'mp3'
    }

    objs.composition = {
        '@context': 'http://schema.org/',
        '@type': 'MusicComposition',
        composer: [{ '/': hashes.composer }],
        iswcCode: 'T-034.524.680-1',
        lyricist: [{ '/': hashes.lyricist }],
        name: 'song-title',
        publisher: [{ '/': hashes.publisher }]
    }

    objs.image = {
        '@context': 'http://schema.org/',
        '@type': 'ImageObject',
        contentUrl: { '/': 'QmYKAhvW2d4f28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE' },
        encodingFormat: 'png'
    }

    writeTestFile('/metas/composition.json', JSON.stringify(objs.composition));
    writeTestFile('/metas/audio.json', JSON.stringify(objs.audio));
    writeTestFile('/metas/image.json', JSON.stringify(objs.image));

    return promiseSeq(
        () => setId('audio'),
        () => setId('composition'),
        () => setId('image')
    );

}).then(() => {

    objs.recording = {
        '@context': 'http://schema.org/',
        '@type': 'MusicRecording',
        audio: [{ '/': hashes.audio }],
        performer: [{ '/': hashes.performer }],
        producer: [{ '/': hashes.producer }],
        recordingOf: { '/': hashes.composition },
        recordLabel: [{ '/': hashes.recordLabel }]
    }

    writeTestFile('/metas/recording.json', JSON.stringify(objs.recording));

    return setId('recording');

}).then(() => {

    objs.album = {
        '@context': 'http://schema.org/',
        '@type': 'MusicAlbum',
        albumProductionType: 'DemoAlbum',
        albumReleaseType: 'SingleRelease',
        byArtist: [
          { '/': hashes.performer },
          { '/': hashes.producer }
        ],
        image: { '/': hashes.image },
        name: 'ding-ding-dooby-doo',
        recordLabel: [{ '/': hashes.recordLabel }],
        track: [{ '/': hashes.recording }]
    }

    writeTestFile('/metas/album.json', JSON.stringify(objs.album));

    return setId('album');
    
});
