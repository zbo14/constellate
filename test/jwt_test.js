import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeKeypair } from '../lib/crypto.js';
import { keypairFromPassword, randomKeypair } from '../lib/ed25519.js';
import { Compose, License, Record, setClaimsId, signClaims, timestamp, verifyClaims } from '../lib/jwt.js';
import { encodeBase64, now } from '../lib/util.js';

import {
  AudioContext, ArtistContext,
  Composition, CompositionContext,
  Recording, RecordingContext,
  OrganizationContext,
  getMetaId, getMetaIds,
  setMetaId
} from '../lib/meta.js';

const artistKeypair = keypairFromPassword('muzaq');
const curatorKeypair = randomKeypair();

const artist = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'artist@example.com',
  homepage: 'http://artist.com',
  name: 'artist',
  profile: ['http://facebook-profile.com'],
}, artistKeypair.publicKey);

const curator = setMetaId({
  '@context': OrganizationContext,
  '@type': 'Organization',
  email: 'curator@example.com',
  homepage: 'http://curator.com',
  name: 'curator'
}, curatorKeypair.publicKey);

const audio = setMetaId({
  '@context': AudioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com'
});

const composition = setMetaId({
  '@context': CompositionContext,
  '@type': 'Composition',
  composer: getMetaIds(artist),
  lyricist: getMetaIds(artist),
  title: 'beep-bop-boop'
});

const recording = setMetaId({
  '@context': RecordingContext,
  '@type': 'Recording',
  audio: getMetaIds(audio),
  performer: getMetaIds(artist),
  producer: getMetaIds(artist),
  recordingOf: getMetaId(composition)
});

const composeClaims = setClaimsId(
  timestamp({
    iss: artist['@id'],
    sub: composition['@id'],
    typ: 'Compose'
  })
);

const licenseClaims = setClaimsId(
  timestamp({
    aud: [curator['@id']],
    exp: now() + 1000,
    iss: artist['@id'],
    sub: composition['@id'],
    typ: 'License'
  })
);

const recordClaims = setClaimsId(
  timestamp({
    iss: artist['@id'],
    sub: recording['@id'],
    typ: 'Record'
  })
);

const composeSignature = signClaims(composeClaims, artistKeypair.secretKey);
const licenseSignature = signClaims(licenseClaims, artistKeypair.secretKey);
const recordSignature = signClaims(recordClaims, artistKeypair.secretKey);

describe('JWT', () => {
  it('verify compose claims', () => {
    assert.isOk(
      verifyClaims(composeClaims, composition, Compose, Composition, composeSignature),
      'should verify compose claims'
    );
  });
  it('verify license claims', () => {
    assert.isOk(
      verifyClaims(licenseClaims, composition, License, Composition, licenseSignature),
      'should verify license claims'
    );
  });
  it('verify record claims', () => {
    assert.isOk(
      verifyClaims(recordClaims, recording, Record, Recording, recordSignature),
      'should verify record claims'
    );
  });
});
