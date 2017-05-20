import { ArtistContext, OrganizationContext, setAddr } from '../lib/party.js';

const ed25519 = require('../lib/ed25519.js');
const secp256k1 = require('../lib/secp256k1.js');

const composerKeypair = ed25519.keypairFromPassword('muzaq');
const lyricistKeypair = ed25519.generateKeypair();
const performerKeypair = secp256k1.generateKeypair();
const producerKeypair = ed25519.generateKeypair();
const publisherKeypair = ed25519.generateKeypair();
const recordLabelKeypair = secp256k1.generateKeypair();

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

export {
  composer, composerKeypair,
  lyricist, lyricistKeypair,
  performer, performerKeypair,
  producer, producerKeypair,
  publisher, publisherKeypair,
  recordLabel, recordLabelKeypair
}
