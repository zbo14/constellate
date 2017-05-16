import { assert } from 'chai';
import { describe, it } from 'mocha';
import { keypairFromPassword } from '../lib/crypto.js';
import { encodeBase58, orderStringify } from '../lib/util.js';

import {
  Album,
  Artist,
  Audio,
  Composition,
  Organization,
  Recording,
  getMetaId,
  getMetaIds,
  schemaPrefix,
  setMetaId,
  validateMeta
} from '../lib/meta.js';


const artistContext = {
  schema: 'http://schema.org/',
  Artist: 'schema:MusicGroup',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  profile: 'schema:sameAs'
}

const organizationContext = {
  schema: 'http://schema.org/',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  Organization: 'schema:Organization',
  profile: 'schema:sameAs'
}

const compositionContext = {
  schema: 'http://schema.org/',
  composer: 'schema:composer',
  Composition: 'schema:MusicComposition',
  iswc: 'schema:iswcCode',
  lyricist: 'schema:lyricist',
  publisher: 'schema:publisher',
  title: 'schema:name'
}

const audioContext = {
  schema: 'http://schema.org/',
  Audio: 'schema:AudioObject',
  contentUrl: 'schema:contentUrl',
  encodingFormat: 'schema:encodingFormat'
}

const recordingContext = {
  schema: 'http://schema.org/',
  audio: 'schema:audio',
  isrc: 'schema:isrcCode',
  performer: 'schema:performer',
  producer: 'schema:producer',
  Recording: 'schema:MusicRecording',
  recordingOf: 'schema:recordingOf',
  recordLabel: 'schema:recordLabel'
}

const albumContext = {
  schema: 'http://schema.org/',
  Album: 'schema:MusicAlbum',
  artist: 'schema:byArtist',
  productionType: 'schema:albumProductionType',
  recordLabel: 'schema:recordLabel',
  releaseType: 'schema:albumReleaseType',
  track: 'schema:track'
}

const composer = setMetaId({
  '@context': artistContext,
  '@type': 'Artist',
  email: 'composer@example.com',
  homepage: 'http://composer.com',
  name: 'composer',
  profile: ['http://facebook-profile.com'],
});

const lyricist = setMetaId({
  '@context': artistContext,
  '@type': 'Artist',
  email: 'lyricist@example.com',
  homepage: 'http://lyricist.com',
  name: 'lyricist'
});

const performer = setMetaId({
  '@context': artistContext,
  '@type': 'Artist',
  email: 'performer@example.com',
  homepage: 'http://performer.com',
  name: 'performer',
  profile: ['http://bandcamp-page.com']
});

const producer = setMetaId({
  '@context': artistContext,
  '@type': 'Artist',
  homepage: 'http://producer.com',
  name: 'producer',
  profile: ['http://soundcloud-page.com']
});

const publisher = setMetaId({
  '@context': organizationContext,
  '@type': 'Organization',
  email: 'publisher@example.com',
  homepage: 'http://publisher.com',
  name: 'publisher'
});

const recordLabel = setMetaId({
  '@context': organizationContext,
  '@type': 'Organization',
  email: 'recordLabel@example.com',
  homepage: 'http://recordLabel.com',
  name: 'recordLabel'
});

const composition = setMetaId({
  '@context': compositionContext,
  '@type': 'Composition',
  composer: getMetaIds(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getMetaIds(lyricist),
  publisher: getMetaIds(publisher),
  title: 'fire-song'
});

const audio = setMetaId({
  '@context': audioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com',
  encodingFormat: 'mp3'
});

const recording = setMetaId({
  '@context': recordingContext,
  '@type': 'Recording',
  audio: getMetaIds(audio),
  performer: getMetaIds(performer),
  producer: getMetaIds(producer),
  recordingOf: getMetaId(composition),
  recordLabel: getMetaIds(recordLabel)
});

const album = setMetaId({
  '@context': albumContext,
  '@type': 'Album',
  artist: getMetaIds(performer, producer),
  productionType: 'DemoAlbum',
  recordLabel: getMetaIds(recordLabel),
  releaseType: 'SingleRelease',
  track: getMetaIds(recording)
});

describe('Meta', () => {
    it('validates artist metadata', () => {
      assert(
        validateMeta(composer, Artist),
        'should validate artist metadata'
      );
    });
    it('validates organization metadata', () => {
      assert(
        validateMeta(recordLabel, Organization),
        'should validate organization metadata'
      );
    });
    it('validates composition metadata', () => {
      assert(
        validateMeta(composition, Composition),
        'should validate composition metadata'
      );
    });
    it('validates audio metadata', () => {
      assert(
        validateMeta(audio, Audio),
        'should validate audio metadata'
      );
    });
    it('validates recording metadata', () => {
      assert(
        validateMeta(recording, Recording),
        'should validate recording metadata'
      );
    });
    it('validates album metadata', () => {
      assert(
        validateMeta(album, Album),
        'should validate album metadata'
      );
    });
});
