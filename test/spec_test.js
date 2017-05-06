import { assert } from 'chai';
import { describe, it } from 'mocha';
import { base58_encode, base64_digest, orderStringify } from '../lib/util.js';
import { generateKeypairFromPassword } from '../lib/crypto.js';

const schema = require('../lib/schema.js');
const spec = require('../lib/spec.js');

const keypair = generateKeypairFromPassword('passwerd');

const arranger = spec.setId({
  '@context': schema.context,
  '@type': 'Person',
  email: 'arranger@email.com',
  name: 'arranger',
  url: 'http://arranger.com'
});

const composer = spec.setId({
  '@context': schema.context,
  '@type': 'Person',
  email: 'composer@email.com',
  name: 'composer',
  publicKey: base58_encode(keypair.publicKey),
  sameAs: ['http://facebook-profile.com'],
  url: 'http://composer.com'
});

const lyricist = spec.setId({
  '@context': schema.context,
  '@type': 'Person',
  email: 'lyricist@email.com',
  name: 'lyricist',
  url: 'http://lyricist.com'
});

const performer = spec.setId({
  '@context': schema.context,
  '@type': 'MusicGroup',
  email: 'performer@email.com',
  name: 'performer',
  sameAs: ['http://bandcamp-page.com'],
  url: 'http://performer.com'
});

const producer = spec.setId({
  '@context': schema.context,
  '@type': 'Person',
  name: 'producer',
  sameAs: ['http://soundcloud-page.com'],
  url: 'http://producer.com'
});

const publisher = spec.setId({
  '@context': schema.context,
  '@type': 'Organization',
  email: 'publisher@email.com',
  name: 'publisher',
  url: 'http://publisher.com'
});

const recordLabel = spec.setId({
  '@context': schema.context,
  '@type': 'Organization',
  email: 'recordLabel@email.com',
  name: 'recordLabel',
  url: 'http://recordLabel.com'
});

const composition = spec.setId({
  '@context': schema.context,
  '@type': 'MusicComposition',
  arranger: spec.getHeaders(arranger),
  composer: spec.getHeaders(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: spec.getHeaders(lyricist),
  publisher: spec.getHeaders(publisher),
  title: 'fire-song',
  url: 'http://composition.com'
});

const recording = spec.setId({
  '@context': schema.context,
  '@type': 'MusicRecording',
  performer: spec.getHeaders(performer),
  producer: spec.getHeaders(producer),
  recordingOf: spec.getHeader(composition),
  recordLabel: spec.getHeaders(recordLabel),
  url: 'http://recording.com'
});

describe('Spec', () => {
    it('validates an artist', () => {
      assert.equal(
        spec.validate(composer, schema.artist), null,
        'should validate user'
      );
    });
    it('validates an organization', () => {
      assert.equal(
        spec.validate(recordLabel, schema.organization), null,
        'should validate an organization'
      );
    });
    it('validates a composition', () => {
      assert.equal(
        spec.validate(composition, schema.composition), null,
        'should validate composition'
      );
    });
    it('validates a recording', () => {
      assert.equal(
        spec.validate(recording, schema.recording), null,
        'should validate recording'
      );
    });
});
