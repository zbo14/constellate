const { waterfall } = require('async');
const { writeFile } = require('fs');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const {
  ArtistContext,
  OrganizationContext,
  getAddr,
  setAddr
} = require('../lib/party.js');

const {
  AlbumContext,
  AudioContext,
  CompositionContext,
  ImageContext,
  RecordingContext,
  getMetaId, setMetaId
} = require('../lib/meta.js');

const { setClaimsId, timestamp } = require('../lib/jwt.js');
const { now } = require('../lib/util.js');

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

const composer = setAddr({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'composer@example.com',
  homepage: 'http://composer.com',
  name: 'composer',
  profile: ['http://facebook-profile.com'],
}, composerKeypair.publicKey);

const lyricist = setAddr({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'lyricist@example.com',
  homepage: 'http://lyricist.com',
  name: 'lyricist'
}, lyricistKeypair.publicKey);

const performer = setAddr({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'performer@example.com',
  homepage: 'http://performer.com',
  name: 'performer',
  profile: ['http://bandcamp-page.com']
}, performerKeypair.publicKey);

const producer = setAddr({
  '@context': ArtistContext,
  '@type': 'Artist',
  homepage: 'http://producer.com',
  name: 'producer',
  profile: ['http://soundcloud-page.com']
}, producerKeypair.publicKey);

const publisher = setAddr({
  '@context': OrganizationContext,
  '@type': 'Organization',
  email: 'publisher@example.com',
  homepage: 'http://publisher.com',
  name: 'publisher'
}, publisherKeypair.publicKey);

const recordLabel = setAddr({
  '@context': OrganizationContext,
  '@type': 'Organization',
  email: 'recordLabel@example.com',
  homepage: 'http://recordLabel.com',
  name: 'recordLabel'
}, recordLabelKeypair.publicKey);

writeFile(
  __dirname + '/parties/composer.json',
  JSON.stringify(composer)
);

writeFile(
  __dirname + '/parties/lyricist.json',
  JSON.stringify(lyricist)
);

writeFile(
  __dirname + '/parties/performer.json',
  JSON.stringify(performer)
);

writeFile(
  __dirname + '/parties/producer.json',
  JSON.stringify(producer)
);

writeFile(
  __dirname + '/parties/publisher.json',
  JSON.stringify(publisher)
);

writeFile(
  __dirname + '/parties/recordLabel.json',
  JSON.stringify(recordLabel)
);

let album, audio, composition, image, recording;

[ newComposition,
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
}, Promise.resolve()).catch(console.error);

function newComposition() {
  return setMetaId({
    '@context': CompositionContext,
    '@type': 'Composition',
    composer: [getMetaId(composer)],
    iswcCode: 'T-034.524.680-1',
    lyricist: [getMetaId(lyricist)],
    publisher: [getMetaId(publisher)],
    title: 'fire-song'
  }).then((obj) => {
    composition = obj;
    writeFile(__dirname + '/metas/composition.json', JSON.stringify(composition));
  });
}

function newAudio() {
  return setMetaId({
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
  return setMetaId({
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
  return setMetaId({
    '@context': RecordingContext,
    '@type': 'Recording',
    audio: [getMetaId(audio)],
    performer: [getMetaId(performer)],
    producer: [getMetaId(producer)],
    recordingOf: getMetaId(composition),
    recordLabel: [getMetaId(recordLabel)]
  }).then((obj) => {
    recording = obj;
    writeFile(__dirname + '/metas/recording.json', JSON.stringify(recording));
  });
}

function newAlbum() {
  return setMetaId({
    '@context': AlbumContext,
    '@type': 'Album',
    art: getMetaId(image),
    artist: [performer, producer].map(getAddr),
    productionType: 'DemoAlbum',
    recordLabel: [getAddr(recordLabel)],
    releaseType: 'SingleRelease',
    title: 'ding-ding-dooby-doo',
    track: [getMetaId(recording)]
  }).then((obj) => {
    album = obj;
    writeFile(__dirname + '/metas/album.json', JSON.stringify(album));
  });
}

function newCreateComposition() {
  return setClaimsId(timestamp({
    iss: getAddr(composer),
    sub: getMetaId(composition),
    typ: 'Create'
  })).then((createComposition) => {
    writeFile(__dirname + '/claims/createComposition.json', JSON.stringify(createComposition));
  });
}

function newCreateRecording() {
  return setClaimsId(timestamp({
    iss: getAddr(performer),
    sub: getMetaId(recording),
    typ: 'Create'
  })).then((createRecording) => {
    writeFile(__dirname + '/claims/createRecording.json', JSON.stringify(createRecording));
  });
}

function newCreateAlbum() {
  return setClaimsId(timestamp({
    iss: getAddr(performer),
    sub: getMetaId(album),
    typ: 'Create'
  })).then((createAlbum) => {
    writeFile(__dirname + '/claims/createAlbum.json', JSON.stringify(createAlbum));
  });
}

function newLicenseComposition() {
  return setClaimsId(timestamp({
    aud: [getAddr(publisher)],
    exp: now() + 1000,
    iss: getAddr(lyricist),
    sub: getMetaId(composition),
    typ: 'License'
  })).then((licenseComposition) => {
    writeFile(__dirname + '/claims/licenseComposition.json', JSON.stringify(licenseComposition));
  });
}

function newLicenseRecording() {
  return setClaimsId(timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 2000,
    iss: getAddr(producer),
    sub: getMetaId(recording),
    typ: 'License'
  })).then((licenseRecording) => {
    writeFile(__dirname + '/claims/licenseRecording.json', JSON.stringify(licenseRecording));
  });
}

function newLicenseAlbum() {
  return setClaimsId(timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 3000,
    iss: getAddr(producer),
    sub: getMetaId(album),
    typ: 'License'
  })).then((licenseAlbum) => {
    writeFile(__dirname + '/claims/licenseAlbum.json', JSON.stringify(licenseAlbum));
  });
}
