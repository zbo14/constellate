import { assert } from 'chai';
import { describe, it } from 'mocha';
import { keypairFromPassword } from '../lib/crypto.js';
import { encodeBase58, orderStringify } from '../lib/util.js';

import {
  Album, AlbumContext,
  Artist, ArtistContext,
  Audio, AudioContext,
  Composition, CompositionContext,
  Organization, OrganizationContext,
  Recording, RecordingContext,
  getMetaId, getMetaIds,
  setMetaId,
  validateMeta
} from '../lib/meta.js';

const composer = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'composer@example.com',
  homepage: 'http://composer.com',
  name: 'composer',
  profile: ['http://facebook-profile.com'],
});

const lyricist = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'lyricist@example.com',
  homepage: 'http://lyricist.com',
  name: 'lyricist'
});

const performer = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'performer@example.com',
  homepage: 'http://performer.com',
  name: 'performer',
  profile: ['http://bandcamp-page.com']
});

const producer = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  homepage: 'http://producer.com',
  name: 'producer',
  profile: ['http://soundcloud-page.com']
});

const publisher = setMetaId({
  '@context': OrganizationContext,
  '@type': 'Organization',
  email: 'publisher@example.com',
  homepage: 'http://publisher.com',
  name: 'publisher'
});

const recordLabel = setMetaId({
  '@context': OrganizationContext,
  '@type': 'Organization',
  email: 'recordLabel@example.com',
  homepage: 'http://recordLabel.com',
  name: 'recordLabel'
});

const composition = setMetaId({
  '@context': CompositionContext,
  '@type': 'Composition',
  composer: getMetaIds(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getMetaIds(lyricist),
  publisher: getMetaIds(publisher),
  title: 'fire-song'
});

const audio = setMetaId({
  '@context': AudioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com',
  encodingFormat: 'mp3'
});

const recording = setMetaId({
  '@context': RecordingContext,
  '@type': 'Recording',
  audio: getMetaIds(audio),
  performer: getMetaIds(performer),
  producer: getMetaIds(producer),
  recordingOf: getMetaId(composition),
  recordLabel: getMetaIds(recordLabel)
});

const album = setMetaId({
  '@context': AlbumContext,
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
