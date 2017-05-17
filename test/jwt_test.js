import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeKeypair } from '../lib/crypto.js';
import { keypairFromPassword, randomKeypair } from '../lib/ed25519.js';
import { Create, License, setClaimsId, signClaims, timestamp, verifyClaims } from '../lib/jwt.js';
import { encodeBase64, now } from '../lib/util.js';

import {
  Album, AlbumContext,
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

const album = setMetaId({
  '@context': AlbumContext,
  '@type': 'Album',
  artist: getMetaIds(artist),
  releaseType: 'SingleRelease',
  track: getMetaIds(recording)
});

const createComposition = setClaimsId(
  timestamp({
    iss: getMetaId(artist),
    sub: getMetaId(composition),
    typ: 'Create'
  })
);

const createRecording = setClaimsId(
  timestamp({
    iss: getMetaId(artist),
    sub: getMetaId(recording),
    typ: 'Create'
  })
);

const createAlbum = setClaimsId(
  timestamp({
    iss: getMetaId(artist),
    sub: getMetaId(album),
    typ: 'Create'
  })
);

const licenseComposition = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 1000,
    iss: getMetaId(artist),
    sub: getMetaId(composition),
    typ: 'License'
  })
);

const licenseRecording = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 2000,
    iss: getMetaId(artist),
    sub: getMetaId(recording),
    typ: 'License'
  })
);

const licenseAlbum = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 3000,
    iss: getMetaId(artist),
    sub: getMetaId(album),
    typ: 'License'
  })
);

const createCompositionSig = signClaims(createComposition, artistKeypair.secretKey);
const createRecordingSig = signClaims(createRecording, artistKeypair.secretKey);
const createAlbumSig = signClaims(createAlbum, artistKeypair.secretKey);

const licenseCompositionSig = signClaims(licenseComposition, artistKeypair.secretKey);
const licenseRecordingSig = signClaims(licenseRecording, artistKeypair.secretKey);
const licenseAlbumSig = signClaims(licenseAlbum, artistKeypair.secretKey);

describe('JWT', () => {
  it('verify create composition claims', () => {
    assert.isOk(
      verifyClaims(createComposition, composition, Create, Composition, createCompositionSig),
      'should verify create composition claims'
    );
  });
  it('verify create recording claims', () => {
    assert.isOk(
      verifyClaims(createRecording, recording, Create, Recording, createRecordingSig),
      'should verify create recording claims'
    );
  });
  it('verify create album claims', () => {
    assert.isOk(
      verifyClaims(createAlbum, album, Create, Album, createAlbumSig),
      'should verify create album claims'
    );
  });
  it('verify license composition claims', () => {
    assert.isOk(
      verifyClaims(licenseComposition, composition, License, Composition, licenseCompositionSig),
      'should verify license composition claims'
    );
  });
  it('verify license recording claims', () => {
    assert.isOk(
      verifyClaims(licenseRecording, recording, License, Recording, licenseRecordingSig),
      'should verify license recording claims'
    );
  });
  it('verify license album claims', () => {
    assert.isOk(
      verifyClaims(licenseAlbum, album, License, Album, licenseAlbumSig),
      'should verify license album claims'
    );
  });
});
