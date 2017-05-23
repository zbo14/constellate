const { writeFile } = require('fs');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');
const { now } = require('../lib/util.js');
const { newClaims } = require('../lib/jwt.js');

const {
  ArtistContext,
  OrganizationContext,
  newParty
} = require('../lib/party.js');

const {
  AlbumContext,
  AudioContext,
  CompositionContext,
  ImageContext,
  RecordingContext,
  newMeta
} = require('../lib/meta.js');

const composerKeypair = ed25519.keypairFromPassword('muzaq');
const lyricistKeypair = rsa.generateKeypair();
const performerKeypair = secp256k1.generateKeypair();
const producerKeypair = ed25519.generateKeypair();
const publisherKeypair = rsa.generateKeypair();
const recordLabelKeypair = secp256k1.generateKeypair();

writeFile(
  __dirname + '/keys/composerKeypair.json',
  ed25519.encodeKeypair(composerKeypair)
);

writeFile(
  __dirname + '/keys/lyricistKeypair.json',
  rsa.encodeKeypair(lyricistKeypair)
);

writeFile(
  __dirname + '/keys/performerKeypair.json',
  secp256k1.encodeKeypair(performerKeypair)
);

writeFile(
  __dirname + '/keys/producerKeypair.json',
  ed25519.encodeKeypair(producerKeypair)
);

writeFile(
  __dirname + '/keys/publisherKeypair.json',
  rsa.encodeKeypair(publisherKeypair)
);

writeFile(
  __dirname + '/keys/recordLabelKeypair.json',
  secp256k1.encodeKeypair(recordLabelKeypair)
);

let composer, lyricist, performer, producer, publisher, recordLabel,
    album, audio, composition, image, recording,
    createAlbum, createComposition, createRecording;

[ newComposer,
  newLyricist,
  newPerformer,
  newProducer,
  newPublisher,
  newRecordLabel,
  newComposition,
  newAudio,
  newImage,
  newRecording,
  newAlbum,
  newCreateComposition,
  newCreateRecording,
  newCreateAlbum,
  newLicenseComposition,
  newLicenseRecording,
  newLicenseAlbum
].reduce((p, fn) => {
  return p.then(fn);
}, Promise.resolve()).catch((reason) => console.error(reason));

function newComposer() {
  return newParty({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'composer@example.com',
    homepage: 'http://composer.com',
    name: 'composer',
    profile: ['http://facebook-profile.com'],
  }).then((obj) => {
    composer = obj;
    writeFile(__dirname + '/parties/composer.json', JSON.stringify(composer));
  });
}

function newLyricist() {
  return newParty({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'lyricist@example.com',
    homepage: 'http://lyricist.com',
    name: 'lyricist'
  }).then((obj) => {
    lyricist = obj;
    writeFile(__dirname + '/parties/lyricist.json', JSON.stringify(lyricist));
  });
}

function newPerformer() {
  return newParty({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'performer@example.com',
    homepage: 'http://performer.com',
    name: 'performer',
    profile: ['http://bandcamp-page.com']
  }, performerKeypair.publicKey).then((obj) => {
    performer = obj;
    writeFile(__dirname + '/parties/performer.json', JSON.stringify(performer));
  });
}

function newProducer() {
  return newParty({
    '@context': ArtistContext,
    '@type': 'Artist',
    homepage: 'http://producer.com',
    name: 'producer',
    profile: ['http://soundcloud-page.com']
  }).then((obj) => {
    producer = obj;
    writeFile(__dirname + '/parties/producer.json', JSON.stringify(producer));
  });
}

function newPublisher() {
  return newParty({
   '@context': OrganizationContext,
   '@type': 'Organization',
   email: 'publisher@example.com',
   homepage: 'http://publisher.com',
   name: 'publisher'
 }).then((obj) => {
   publisher = obj;
   writeFile(__dirname + '/parties/publisher.json', JSON.stringify(publisher));
 });
}

function newRecordLabel() {
  return newParty({
    '@context': OrganizationContext,
    '@type': 'Organization',
    email: 'recordLabel@example.com',
    homepage: 'http://recordLabel.com',
    name: 'recordLabel'
  }, recordLabelKeypair.publicKey).then((obj) => {
    recordLabel = obj;
    writeFile(__dirname + '/parties/recordLabel.json', JSON.stringify(recordLabel));
  });
}

function newComposition() {
  return newMeta({
    '@context': CompositionContext,
    '@type': 'Composition',
    composer: [composer['@id']],
    iswcCode: 'T-034.524.680-1',
    lyricist: [lyricist['@id']],
    publisher: [publisher['@id']],
    title: 'fire-song'
  }).then((obj) => {
    composition = obj;
    writeFile(__dirname + '/metas/composition.json', JSON.stringify(composition));
  });
}

function newAudio() {
  return newMeta({
    '@context': AudioContext,
    '@type': 'Audio',
    contentUrl: 'QmYKAhVW2d4e28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
    encodingFormat: 'mp3'
  }).then((obj) => {
    audio = obj;
    writeFile(__dirname + '/metas/audio.json', JSON.stringify(audio));
  });
}

function newImage() {
  return newMeta({
    '@context': ImageContext,
    '@type': 'Image',
    contentUrl: 'QmYKAhvW2d4f28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
    encodingFormat: 'png'
  }).then((obj) => {
    image = obj;
    writeFile(__dirname + '/metas/image.json', JSON.stringify(image));
  });
}

function newRecording() {
  return newMeta({
    '@context': RecordingContext,
    '@type': 'Recording',
    audio: [audio['@id']],
    performer: [performer['@id']],
    producer: [producer['@id']],
    recordingOf: composition['@id'],
    recordLabel: [recordLabel['@id']]
  }).then((obj) => {
    recording = obj;
    writeFile(__dirname + '/metas/recording.json', JSON.stringify(recording));
  });
}

function newAlbum() {
  return newMeta({
    '@context': AlbumContext,
    '@type': 'Album',
    art: image['@id'],
    artist: [performer['@id'], producer['@id']],
    productionType: 'DemoAlbum',
    recordLabel: [recordLabel['@id']],
    releaseType: 'SingleRelease',
    title: 'ding-ding-dooby-doo',
    track: [recording['@id']]
  }).then((obj) => {
    album = obj;
    writeFile(__dirname + '/metas/album.json', JSON.stringify(album));
  });
}

function newCreateComposition() {
  return newClaims({
    iss: composer['@id'],
    sub: composition['@id'],
    typ: 'Create'
  }).then((obj) => {
    createComposition = obj;
    writeFile(__dirname + '/claims/createComposition.json', JSON.stringify(createComposition));
  });
}

function newCreateRecording() {
  return newClaims({
    iss: performer['@id'],
    sub: recording['@id'],
    typ: 'Create'
  }).then((obj) => {
    createRecording = obj;
    writeFile(__dirname + '/claims/createRecording.json', JSON.stringify(createRecording));
  });
}

function newCreateAlbum() {
  return newClaims({
    iss: performer['@id'],
    sub: album['@id'],
    typ: 'Create'
  }).then((obj) => {
    createAlbum = obj;
    writeFile(__dirname + '/claims/createAlbum.json', JSON.stringify(createAlbum));
  });
}

function newLicenseComposition() {
  return newClaims({
    aud: [publisher['@id']],
    exp: now() + 1000,
    iss: composer['@id'],
    sub: createComposition['jti'],
    typ: 'License'
  }).then((licenseComposition) => {
    writeFile(__dirname + '/claims/licenseComposition.json', JSON.stringify(licenseComposition));
  });
}

function newLicenseRecording() {
  return newClaims({
    aud: [recordLabel['@id']],
    exp: now() + 2000,
    iss: performer['@id'],
    sub: createRecording['jti'],
    typ: 'License'
  }).then((licenseRecording) => {
    writeFile(__dirname + '/claims/licenseRecording.json', JSON.stringify(licenseRecording));
  });
}

function newLicenseAlbum() {
  return newClaims({
    aud: [recordLabel['@id']],
    exp: now() + 3000,
    iss: performer['@id'],
    sub: createAlbum['jti'],
    typ: 'License'
  }).then((licenseAlbum) => {
    writeFile(__dirname + '/claims/licenseAlbum.json', JSON.stringify(licenseAlbum));
  });
}
