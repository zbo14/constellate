import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeKeypair } from '../lib/crypto.js';
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

const ed25519 = require('../lib/ed25519.js');
const secp256k1 = require('../lib/secp256k1.js');

const composerKeypair = ed25519.keypairFromPassword('muzaq');
const performerKeypair = secp256k1.randomKeypair();
const curatorKeypair = ed25519.randomKeypair();

const composer = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'composer@example.com',
  homepage: 'http://composer.com',
  name: 'composer',
  profile: ['http://facebook-profile.com'],
}, composerKeypair.publicKey);

const performer = setMetaId({
  '@context': ArtistContext,
  '@type': 'Artist',
  email: 'performer@example.com',
  homepage: 'http://performer.com',
  name: 'performer',
  profile: ['http://bandcamp-page.com']
}, performerKeypair.publicKey);

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
  composer: getMetaIds(composer),
  title: 'beep-bop-boop'
});

const recording = setMetaId({
  '@context': RecordingContext,
  '@type': 'Recording',
  audio: getMetaIds(audio),
  performer: getMetaIds(performer),
  recordingOf: getMetaId(composition)
});

const album = setMetaId({
  '@context': AlbumContext,
  '@type': 'Album',
  artist: getMetaIds(performer),
  releaseType: 'SingleRelease',
  title: 'album-title',
  track: getMetaIds(recording)
});

const createComposition = setClaimsId(
  timestamp({
    iss: getMetaId(composer),
    sub: getMetaId(composition),
    typ: 'Create'
  })
);

const createRecording = setClaimsId(
  timestamp({
    iss: getMetaId(performer),
    sub: getMetaId(recording),
    typ: 'Create'
  })
);

const createAlbum = setClaimsId(
  timestamp({
    iss: getMetaId(performer),
    sub: getMetaId(album),
    typ: 'Create'
  })
);

const licenseComposition = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 1000,
    iss: getMetaId(composer),
    sub: getMetaId(composition),
    typ: 'License'
  })
);

const licenseRecording = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 2000,
    iss: getMetaId(performer),
    sub: getMetaId(recording),
    typ: 'License'
  })
);

const licenseAlbum = setClaimsId(
  timestamp({
    aud: getMetaIds(curator),
    exp: now() + 3000,
    iss: getMetaId(performer),
    sub: getMetaId(album),
    typ: 'License'
  })
);

const ed25519Header = {
  alg: 'EdDsa',
  typ: 'JWT'
}

const secp256k1Header = {
  alg: 'ES256',
  typ: 'JWT'
}

const createCompositionSig = signClaims(createComposition, ed25519Header, composerKeypair.secretKey);
const createRecordingSig = signClaims(createRecording, secp256k1Header, performerKeypair.privateKey);
const createAlbumSig = signClaims(createAlbum, secp256k1Header, performerKeypair.privateKey);

const licenseCompositionSig = signClaims(licenseComposition, ed25519Header, composerKeypair.secretKey);
const licenseRecordingSig = signClaims(licenseRecording, secp256k1Header, performerKeypair.privateKey);
const licenseAlbumSig = signClaims(licenseAlbum, secp256k1Header, performerKeypair.privateKey);

describe('JWT', () => {
  it('verify create composition claims', () => {
    assert.isOk(
      verifyClaims(createComposition, ed25519Header, composition, Create, Composition, createCompositionSig),
      'should verify create composition claims'
    );
  });
  it('verify create recording claims', () => {
    assert.isOk(
      verifyClaims(createRecording, secp256k1Header, recording, Create, Recording, createRecordingSig),
      'should verify create recording claims'
    );
  });
  it('verify create album claims', () => {
    assert.isOk(
      verifyClaims(createAlbum, secp256k1Header, album, Create, Album, createAlbumSig),
      'should verify create album claims'
    );
  });
  it('verify license composition claims', () => {
    assert.isOk(
      verifyClaims(licenseComposition, ed25519Header, composition, License, Composition, licenseCompositionSig),
      'should verify license composition claims'
    );
  });
  it('verify license recording claims', () => {
    assert.isOk(
      verifyClaims(licenseRecording, secp256k1Header, recording, License, Recording, licenseRecordingSig),
      'should verify license recording claims'
    );
  });
  it('verify license album claims', () => {
    assert.isOk(
      verifyClaims(licenseAlbum, secp256k1Header, album, License, Album, licenseAlbumSig),
      'should verify license album claims'
    );
  });
});
