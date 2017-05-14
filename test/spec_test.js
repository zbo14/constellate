import { assert } from 'chai';
import { describe, it } from 'mocha';
import { generateKeypairFromPassword } from '../lib/crypto.js';
import { getHeader, setId, validate } from '../lib/spec.js';
import { encodeBase58, orderStringify } from '../lib/util.js';

import {
  Artist,
  Organization,
  Composition,
  Audio,
  Recording,
  Album,
  schemaPrefix
} from '../lib/schema.js';

const getHeaders = (...objs) => objs.map(getHeader);

const artistContext = {
  schema: 'http://schema.org/',
  email: 'schema:email',
  homepage: 'schema:url',
  MusicGroup: 'schema:MusicGroup',
  name: 'schema:name',
  Person: 'schema:Person',
  profile: 'schema:sameAs'
}

const organizationContext = artistContext;

const compositionContext = {
  schema: 'http://schema.org/',
  composer: 'schema:composer',
  iswc: 'schema:iswcCode',
  lyricist: 'schema:lyricist',
  MusicComposition: 'schema:MusicComposition',
  publisher: 'schema:publisher',
  title: 'schema:name'
}

const audioContext = {
  schema: 'http://schema.org/',
  AudioObject: 'schema:AudioObject',
  contentUrl: 'schema:contentUrl',
  encodingFormat: 'schema:encodingFormat'
}

const recordingContext = {
  schema: 'http://schema.org/',
  audio: 'schema:AudioObject',
  isrc: 'schema:isrcCode',
  MusicRecording: 'schema:MusicRecording',
  performer: 'schema:performer',
  producer: 'schema:producer',
  recordingOf: 'schema:recordingOf',
  recordLabel: 'schema:recordLabel'
}

const albumContext = {
  schema: 'http://schema.org/',
  artist: 'schema:byArtist',
  MusicAlbum: 'schema:MusicAlbum',
  productionType: 'schema:albumProductionType',
  recordLabel: 'schema:recordLabel',
  releaseType: 'schema:albumReleaseType',
  track: 'schema:track'
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
  title: 'fire-song'
});

const audio = setId({
  '@context': audioContext,
  '@type': 'AudioObject',
  contentUrl: 'http://audio-file.com',
  encodingFormat: 'mp3'
})

const recording = setId({
  '@context': recordingContext,
  '@type': 'MusicRecording',
  audio: getHeaders(audio),
  performer: getHeaders(performer),
  producer: getHeaders(producer),
  recordingOf: getHeader(composition),
  recordLabel: getHeaders(recordLabel)
});

const album = setId({
  '@context': albumContext,
  '@type': 'MusicAlbum',
  artist: getHeaders(performer, producer),
  productionType: 'DemoAlbum',
  recordLabel: getHeaders(recordLabel),
  releaseType: 'SingleRelease',
  track: getHeaders(recording)
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
    it('validates audio', () => {
      assert(
        validate(audio, Audio),
        'should validate audio'
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
