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

waterfall([
  function(callback) {
    setMetaId({
      '@context': CompositionContext,
      '@type': 'Composition',
      composer: [getMetaId(composer)],
      iswcCode: 'T-034.524.680-1',
      lyricist: [getMetaId(lyricist)],
      publisher: [getMetaId(publisher)],
      title: 'fire-song'
    }, callback);
  },
  function(composition, callback) {
    writeFile(__dirname + '/metas/composition.json', JSON.stringify(composition));
    setMetaId({
      '@context': AudioContext,
      '@type': 'Audio',
      contentUrl: 'QmYKAhVW2d4e28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
      encodingFormat: 'mp3'
    }, (err, audio) => callback(err, audio, composition));
  },
  function(audio, composition, callback) {
    writeFile(__dirname + '/metas/audio.json', JSON.stringify(audio));
    setMetaId({
      '@context': ImageContext,
      '@type': 'Image',
      contentUrl: 'QmYKAhvW2d4f28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
      encodingFormat: 'png'
    }, (err, image) => callback(err, audio, composition, image));
  },
  function(audio, composition, image, callback) {
    writeFile(__dirname + '/metas/image.json', JSON.stringify(image));
    setMetaId({
      '@context': RecordingContext,
      '@type': 'Recording',
      audio: [getMetaId(audio)],
      performer: [getMetaId(performer)],
      producer: [getMetaId(producer)],
      recordingOf: getMetaId(composition),
      recordLabel: [getMetaId(recordLabel)]
    }, (err, recording) => callback(err, composition, image, recording));
  },
  function(composition, image, recording, callback) {
    writeFile(__dirname + '/metas/recording.json', JSON.stringify(recording));
    setMetaId({
      '@context': AlbumContext,
      '@type': 'Album',
      art: getMetaId(image),
      artist: [performer, producer].map(getAddr),
      productionType: 'DemoAlbum',
      recordLabel: [getAddr(recordLabel)],
      releaseType: 'SingleRelease',
      title: 'ding-ding-dooby-doo',
      track: [getMetaId(recording)]
    }, (err, album) => callback(err, album, composition, recording));
  },
  function(album, composition, recording, callback) {
    writeFile(__dirname + '/metas/album.json', JSON.stringify(album));
    setClaimsId(timestamp({
      iss: getAddr(composer),
      sub: getMetaId(composition),
      typ: 'Create'
    }), (err, createComposition) => callback(err, album, createComposition, composition, recording));
  },
  function(album, createComposition, composition, recording, callback) {
    writeFile(__dirname + '/claims/createComposition.json', JSON.stringify(createComposition));
    setClaimsId(timestamp({
      iss: getAddr(performer),
      sub: getMetaId(recording),
      typ: 'Create'
    }), (err, createRecording) => callback(err, album, createRecording, composition, recording));
  },
  function(album, createRecording, composition, recording, callback) {
    writeFile(__dirname + '/claims/createRecording.json', JSON.stringify(createRecording));
    setClaimsId(timestamp({
      iss: getAddr(performer),
      sub: getMetaId(album),
      typ: 'Create'
    }), (err, createAlbum) => callback(err, album, createAlbum, composition, recording));
  },
  function(album, createAlbum, composition, recording, callback) {
    writeFile(__dirname + '/claims/createAlbum.json', JSON.stringify(createAlbum));
    setClaimsId(timestamp({
      aud: [getAddr(publisher)],
      exp: now() + 1000,
      iss: getAddr(lyricist),
      sub: getMetaId(composition),
      typ: 'License'
    }), (err, licenseComposition) => callback(err, album, licenseComposition, recording));
  },
  function(album, licenseComposition, recording, callback) {
    writeFile(__dirname + '/claims/licenseComposition.json', JSON.stringify(licenseComposition));
    setClaimsId(timestamp({
      aud: [getAddr(recordLabel)],
      exp: now() + 2000,
      iss: getAddr(producer),
      sub: getMetaId(recording),
      typ: 'License'
    }), (err, licenseRecording) => callback(err, album, licenseRecording));
  },
  function(album, licenseRecording, callback) {
    writeFile(__dirname + '/claims/licenseRecording.json', JSON.stringify(licenseRecording));
    setClaimsId(timestamp({
      aud: [getAddr(recordLabel)],
      exp: now() + 3000,
      iss: getAddr(producer),
      sub: getMetaId(album),
      typ: 'License'
    }), (err, licenseAlbum) => callback(err, licenseAlbum));
  },
  function(licenseAlbum, callback) {
    writeFile(__dirname + '/claims/licenseAlbum.json', JSON.stringify(licenseAlbum));
    callback(null, 'done');
  }
], function(err, result) {
  //..
});
