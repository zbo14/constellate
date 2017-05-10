import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeBase58, orderStringify } from '../lib/util.js';
import { generateKeypairFromPassword } from '../lib/crypto.js';

const schema = require('../lib/schema.js');
const spec = require('../lib/spec.js');

const keypair = generateKeypairFromPassword('passwerd');

const getHeaders = (...objs) => objs.map(spec.getHeader);

/*
const arranger = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Person',
  email: 'arranger@email.com',
  name: 'arranger',
  url: 'http://arranger.com'
});
*/

const composer = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Person',
  email: 'composer@email.com',
  name: 'composer',
  publicKey: encodeBase58(keypair.publicKey),
  sameAs: ['http://facebook-profile.com'],
  url: 'http://composer.com'
});

const lyricist = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Person',
  email: 'lyricist@email.com',
  name: 'lyricist',
  url: 'http://lyricist.com'
});

const performer = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'MusicGroup',
  email: 'performer@email.com',
  name: 'performer',
  sameAs: ['http://bandcamp-page.com'],
  url: 'http://performer.com'
});

const producer = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Person',
  name: 'producer',
  sameAs: ['http://soundcloud-page.com'],
  url: 'http://producer.com'
});

const publisher = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Organization',
  email: 'publisher@email.com',
  name: 'publisher',
  url: 'http://publisher.com'
});

const recordLabel = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'Organization',
  email: 'recordLabel@email.com',
  name: 'recordLabel',
  url: 'http://recordLabel.com'
});

const composition = spec.setId({
  '@context': {
    '@vocab': schema.vocabURL,
    title: schema.titleURL
  },
  '@type': 'MusicComposition',
  // arranger: getHeaders(arranger),
  composer: getHeaders(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getHeaders(lyricist),
  publisher: getHeaders(publisher),
  title: 'fire-song',
  url: 'http://composition.com'
});

const recording = spec.setId({
  '@context': {
    '@vocab': schema.vocabURL,
    performer: schema.performerURL
  },
  '@type': 'MusicRecording',
  performer: getHeaders(performer),
  producer: getHeaders(producer),
  recordingOf: spec.getHeader(composition),
  recordLabel: getHeaders(recordLabel),
  url: 'http://recording.com'
});

const album = spec.setId({
  '@context': schema.vocabURL,
  '@type': 'MusicAlbum',
  byArtist: performer,
  track: getHeaders(recording),
  url: 'http://album.com'
});

describe('Spec', () => {
    it('validates an artist', () => {
      assert(
        spec.validate(composer, schema.Artist),
        'should validate user'
      );
    });
    it('validates an organization', () => {
      assert(
        spec.validate(recordLabel, schema.Organization),
        'should validate an organization'
      );
    });
    it('validates a composition', () => {
      assert(
        spec.validate(composition, schema.Composition),
        'should validate composition'
      );
    });
    it('validates a recording', () => {
      assert(
        spec.validate(recording, schema.Recording),
        'should validate recording'
      );
    });
    it('validates an album', () => {
      assert(
        spec.validate(album, schema.Album),
        'should validate album'
      );
    });
});
