import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeBase58, orderStringify } from '../lib/util.js';
import { generateKeypairFromPassword } from '../lib/crypto.js';

const schema = require('../lib/schema.js');
const spec = require('../lib/spec.js');

const keypair = generateKeypairFromPassword('passwerd');

const getHeaders = (...objs) => objs.map(spec.getHeader);

const context = {
  '@vocab': 'http://schema.org'
}

const arranger = spec.setId({
  '@context': context,
  '@type': 'Person',
  email: 'arranger@email.com',
  name: 'arranger',
  url: 'http://arranger.com'
});

const composer = spec.setId({
  '@context': context,
  '@type': 'Person',
  email: 'composer@email.com',
  name: 'composer',
  publicKey: encodeBase58(keypair.publicKey),
  sameAs: ['http://facebook-profile.com'],
  url: 'http://composer.com'
});

const lyricist = spec.setId({
  '@context': context,
  '@type': 'Person',
  email: 'lyricist@email.com',
  name: 'lyricist',
  url: 'http://lyricist.com'
});

const perspecer = spec.setId({
  '@context': context,
  '@type': 'MusicGroup',
  email: 'perspecer@email.com',
  name: 'perspecer',
  sameAs: ['http://bandcamp-page.com'],
  url: 'http://perspecer.com'
});

const producer = spec.setId({
  '@context': context,
  '@type': 'Person',
  name: 'producer',
  sameAs: ['http://soundcloud-page.com'],
  url: 'http://producer.com'
});

const publisher = spec.setId({
  '@context': context,
  '@type': 'Organization',
  email: 'publisher@email.com',
  name: 'publisher',
  url: 'http://publisher.com'
});

const recordLabel = spec.setId({
  '@context': context,
  '@type': 'Organization',
  email: 'recordLabel@email.com',
  name: 'recordLabel',
  url: 'http://recordLabel.com'
});

const composition = spec.setId({
  '@context': context,
  '@type': 'MusicComposition',
  arranger: getHeaders(arranger),
  composer: getHeaders(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getHeaders(lyricist),
  publisher: getHeaders(publisher),
  title: 'fire-song',
  url: 'http://composition.com'
});

const recording = spec.setId({
  '@context': context,
  '@type': 'MusicRecording',
  perspecer: getHeaders(perspecer),
  producer: getHeaders(producer),
  recordingOf: spec.getHeader(composition),
  recordLabel: getHeaders(recordLabel),
  url: 'http://recording.com'
});

describe('Spec', () => {
    it('validates an artist', () => {
      assert(
        spec.validate(composer, schema.artist),
        'should validate user'
      );
    });
    it('validates an organization', () => {
      assert(
        spec.validate(recordLabel, schema.organization),
        'should validate an organization'
      );
    });
    it('validates a composition', () => {
      assert(
        spec.validate(composition, schema.composition),
        'should validate composition'
      );
    });
    it('validates a recording', () => {
      assert(
        spec.validate(recording, schema.recording),
        'should validate recording'
      );
    });
});
