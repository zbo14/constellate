import { assert } from 'chai';
import { describe, it } from 'mocha';
import { Artist, Organization, Composition, Recording, Album } from '../lib/schema.js';
import { getHeader, setId, validate } from '../lib/spec.js';
import { encodeBase58, orderStringify } from '../lib/util.js';

const getHeaders = (...objs) => objs.map(getHeader);

const artistContext = {
  schema: 'http://schema.org/',
  homepage: 'schema:url',
  profile: 'schema:sameAs'
}

const organizationContext = {
  schema: 'http://schema.org/',
  homepage: 'schema:url',
  profile: 'schema:sameAs'
}

const compositionContext = {
  schema: 'http://schema.org/',
  title: 'schema:name'
}

const recordingContext = {
  schema: 'http://schema.org/',
  performer: 'schema:performer'
}

const albumContext = {
  schema: 'http://schema.org/',
  artist: 'schema:byArtist',
  recordLabel: 'schema:recordLabel'
}

const composer = setId({
  '@context': artistContext,
  '@type': 'Person',
  email: 'composer@example.com',
  homepage: 'http://composer.com',
  name: 'composer',
  profile: ['http://facebook-profile.com']
});

const lyricist = setId({
  '@context': artistContext,
  '@type': 'Person',
  email: 'lyricist@example.com',
  homepage: 'http://lyricist.com',
  name: 'lyricist'
});

const performer = setId({
  '@context': artistContext,
  '@type': 'MusicGroup',
  email: 'performer@example.com',
  homepage: 'http://performer.com',
  name: 'performer',
  profile: ['http://bandcamp-page.com']
});

const producer = setId({
  '@context': artistContext,
  '@type': 'Person',
  homepage: 'http://producer.com',
  name: 'producer',
  profile: ['http://soundcloud-page.com']
});

const publisher = setId({
  '@context': organizationContext,
  '@type': 'Organization',
  email: 'publisher@example.com',
  homepage: 'http://publisher.com',
  name: 'publisher'
});

const recordLabel = setId({
  '@context': organizationContext,
  '@type': 'Organization',
  email: 'recordLabel@example.com',
  homepage: 'http://recordLabel.com',
  name: 'recordLabel'
});

const composition = setId({
  '@context': compositionContext,
  '@type': 'MusicComposition',
  composer: getHeaders(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getHeaders(lyricist),
  publisher: getHeaders(publisher),
  title: 'fire-song',
  url: 'http://composition.com'
});

const recording = setId({
  '@context': recordingContext,
  '@type': 'MusicRecording',
  performer: getHeaders(performer),
  producer: getHeaders(producer),
  recordingOf: getHeader(composition),
  recordLabel: getHeaders(recordLabel),
  url: ['http://recording.com']
});

const album = setId({
  '@context': albumContext,
  '@type': 'MusicAlbum',
  artist: getHeaders(performer, producer),
  recordLabel: getHeaders(recordLabel),
  track: getHeaders(recording),
  url: 'http://album.com'
});

describe('Spec', () => {
    it('validates an artist', () => {
      assert(
        validate(composer, Artist),
        'should validate user'
      );
    });
    it('validates an organization', () => {
      assert(
        validate(recordLabel, Organization),
        'should validate an organization'
      );
    });
    it('validates a composition', () => {
      assert(
        validate(composition, Composition),
        'should validate composition'
      );
    });
    it('validates a recording', () => {
      assert(
        validate(recording, Recording),
        'should validate recording'
      );
    });
    it('validates an album', () => {
      assert(
        validate(album, Album),
        'should validate album'
      );
    });
});
