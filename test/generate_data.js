const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { writeTestFile } = require('./fs.js');
const { calcIPFSHash } = require('../lib/ipfs.js');
const { timestamp } = require('../lib/jwt.js');
const { now } = require('../lib/util.js');

const {
    ArtistContext,
    OrganizationContext
} = require('../lib/party.js');

const {
    AlbumContext,
    AudioContext,
    CompositionContext,
    ImageContext,
    RecordingContext
} = require('../lib/meta.js');

const ids = {};
const objs = {};

function promiseSeq(...fns) {
    return fns.reduce((result, fn) => {
        return result.then(fn);
    }, Promise.resolve()).catch(console.error);
}

function setId(name) {
    return calcIPFSHash(objs[name]).then((id) => {
        return ids[name] = id;
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
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'composer@example.com',
    homepage: 'http://composer.com',
    name: 'composer',
    profile: ['http://facebook-profile.com'],
}

objs.lyricist = {
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'lyricist@example.com',
    homepage: 'http://lyricist.com',
    name: 'lyricist'
}

objs.performer = {
    '@context': ArtistContext,
    '@type': 'Artist',
    address: secp256k1.publicKeyToAddress(performerKeypair.publicKey),
    email: 'performer@example.com',
    homepage: 'http://performer.com',
    name: 'performer',
    profile: ['http://bandcamp-page.com']
}

objs.producer = {
    '@context': ArtistContext,
    '@type': 'Artist',
    homepage: 'http://producer.com',
    name: 'producer',
    profile: ['http://soundcloud-page.com']
}

objs.publisher = {
    '@context': OrganizationContext,
    '@type': 'Organization',
    email: 'publisher@example.com',
    homepage: 'http://publisher.com',
    name: 'publisher'
}

objs.recordLabel = {
    '@context': OrganizationContext,
    '@type': 'Organization',
    address: secp256k1.publicKeyToAddress(recordLabelKeypair.publicKey),
    email: 'recordLabel@example.com',
    homepage: 'http://recordLabel.com',
    name: 'recordLabel'
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
        '@context': AudioContext,
        '@type': 'Audio',
        contentUrl: 'QmYKAhVW2d4e28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
        encodingFormat: 'mp3'
    }

    objs.composition = {
        '@context': CompositionContext,
        '@type': 'Composition',
        composer: [ids.composer],
        iswcCode: 'T-034.524.680-1',
        lyricist: [ids.lyricist],
        publisher: [ids.publisher],
        title: 'fire-song'
    }

    objs.image = {
        '@context': ImageContext,
        '@type': 'Image',
        contentUrl: 'QmYKAhvW2d4f28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
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
        '@context': RecordingContext,
        '@type': 'Recording',
        audio: [ids.audio],
        performer: [ids.performer],
        producer: [ids.producer],
        recordingOf: ids.composition,
        recordLabel: [ids.recordLabel]
    }

    writeTestFile('/metas/recording.json', JSON.stringify(objs.recording));

    return setId('recording');

}).then(() => {

    objs.album = {
        '@context': AlbumContext,
        '@type': 'Album',
        art: ids.image,
        artist: [ids.performer, ids.producer],
        productionType: 'DemoAlbum',
        recordLabel: [ids.recordLabel],
        releaseType: 'SingleRelease',
        title: 'ding-ding-dooby-doo',
        track: [ids.recording]
    }

    writeTestFile('/metas/album.json', JSON.stringify(objs.album));

    return setId('album');

}).then(() => {

    objs.createComposition = timestamp({
        iss: ids.composer,
        sub: ids.composition,
        typ: 'Create'
    });

    objs.createRecording = timestamp({
        iss: ids.performer,
        sub: ids.recording,
        typ: 'Create'
    });

    objs.createAlbum = timestamp({
        iss: ids.performer,
        sub: ids.album,
        typ: 'Create'
    });

    writeTestFile('/claims/createComposition.json', JSON.stringify(objs.createComposition));
    writeTestFile('/claims/createRecording.json', JSON.stringify(objs.createRecording));
    writeTestFile('/claims/createAlbum.json', JSON.stringify(objs.createAlbum));

    return promiseSeq(
        () => setId('createComposition'),
        () => setId('createRecording'),
        () => setId('createAlbum')
    );

}).then(() => {

    objs.licenseComposition = timestamp({
        aud: [ids.publisher],
        exp: now() + 1000,
        iss: ids.composer,
        sub: ids.createComposition,
        typ: 'License'
    });

    objs.licenseRecording = timestamp({
        aud: [ids.recordLabel],
        exp: now() + 2000,
        iss: ids.performer,
        sub: ids.createRecording,
        typ: 'License'
    });

    objs.licenseAlbum = timestamp({
        aud: [ids.recordLabel],
        exp: now() + 3000,
        iss: ids.performer,
        sub: ids.createAlbum,
        typ: 'License'
    });

    writeTestFile('/claims/licenseComposition.json', JSON.stringify(objs.licenseComposition));
    writeTestFile('/claims/licenseRecording.json', JSON.stringify(objs.licenseRecording));
    writeTestFile('/claims/licenseAlbum.json', JSON.stringify(objs.licenseAlbum));

});
