const { writeFile } = require('fs');
const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const {
  ArtistContext,
  OrganizationContext,
  setAddr
} = require('../lib/party.js');

const composerKeypair = ed25519.keypairFromPassword('muzaq');
const lyricistKeypair = rsa.generateKeypair();
const performerKeypair = secp256k1.generateKeypair();
const producerKeypair = ed25519.generateKeypair();
const publisherKeypair = rsa.generateKeypair();
const recordLabelKeypair = secp256k1.generateKeypair();

writeFile(
  __dirname + '/parties/composerKeypair.json',
  ed25519.encodeKeypair(composerKeypair)
);

writeFile(
  __dirname + '/parties/lyricistKeypair.json',
  rsa.encodeKeypair(lyricistKeypair)
);

writeFile(
  __dirname + '/parties/performerKeypair.json',
  secp256k1.encodeKeypair(performerKeypair)
);

writeFile(
  __dirname + '/parties/producerKeypair.json',
  ed25519.encodeKeypair(producerKeypair)
);

writeFile(
  __dirname + '/parties/publisherKeypair.json',
  rsa.encodeKeypair(publisherKeypair)
);

writeFile(
  __dirname + '/parties/recordLabelKeypair.json',
  secp256k1.encodeKeypair(recordLabelKeypair)
);

writeFile(
  __dirname + '/parties/composer.json',
  JSON.stringify(setAddr({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'composer@example.com',
    homepage: 'http://composer.com',
    name: 'composer',
    profile: ['http://facebook-profile.com'],
  }, composerKeypair.publicKey))
);

writeFile(
  __dirname + '/parties/lyricist.json',
  JSON.stringify(setAddr({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'lyricist@example.com',
    homepage: 'http://lyricist.com',
    name: 'lyricist'
  }, lyricistKeypair.publicKey))
);

writeFile(
  __dirname + '/parties/performer.json',
  JSON.stringify(setAddr({
    '@context': ArtistContext,
    '@type': 'Artist',
    email: 'performer@example.com',
    homepage: 'http://performer.com',
    name: 'performer',
    profile: ['http://bandcamp-page.com']
  }, performerKeypair.publicKey))
);

writeFile(
  __dirname + '/parties/producer.json',
  JSON.stringify(setAddr({
    '@context': ArtistContext,
    '@type': 'Artist',
    homepage: 'http://producer.com',
    name: 'producer',
    profile: ['http://soundcloud-page.com']
  }, producerKeypair.publicKey))
);

writeFile(
  __dirname + '/parties/publisher.json',
  JSON.stringify(setAddr({
    '@context': OrganizationContext,
    '@type': 'Organization',
    email: 'publisher@example.com',
    homepage: 'http://publisher.com',
    name: 'publisher'
  }, publisherKeypair.publicKey))
);

writeFile(
  __dirname + '/parties/recordLabel.json',
  JSON.stringify(setAddr({
    '@context': OrganizationContext,
    '@type': 'Organization',
    email: 'recordLabel@example.com',
    homepage: 'http://recordLabel.com',
    name: 'recordLabel'
  }, recordLabelKeypair.publicKey))
);
