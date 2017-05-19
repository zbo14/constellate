import { assert } from 'chai';
import { describe, it } from 'mocha';
import { getAddr } from '../lib/party.js';
import { now } from '../lib/util.js';

import {
  Create,
  License,
  ed25519Header,
  secp256k1Header,
  setClaimsId,
  signClaims,
  timestamp,
  verifyClaims
} from '../lib/jwt.js';

import {
  Album,
  Composition,
  Recording,
  getMetaId
} from '../lib/meta.js';

import {
  album,
  composition,
  recording
} from './metas.js';

import {
  composer, composerKeypair,
  performer, performerKeypair,
  publisher,
  recordLabel
} from './parties.js';

const createComposition = setClaimsId(
  timestamp({
    iss: getAddr(composer),
    sub: getMetaId(composition),
    typ: 'Create'
  })
);

const createRecording = setClaimsId(
  timestamp({
    iss: getAddr(performer),
    sub: getMetaId(recording),
    typ: 'Create'
  })
);

const createAlbum = setClaimsId(
  timestamp({
    iss: getAddr(performer),
    sub: getMetaId(album),
    typ: 'Create'
  })
);

const licenseComposition = setClaimsId(
  timestamp({
    aud: [getAddr(publisher)],
    exp: now() + 1000,
    iss: getAddr(composer),
    sub: getMetaId(composition),
    typ: 'License'
  })
);

const licenseRecording = setClaimsId(
  timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 2000,
    iss: getAddr(performer),
    sub: getMetaId(recording),
    typ: 'License'
  })
);

const licenseAlbum = setClaimsId(
  timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 3000,
    iss: getAddr(performer),
    sub: getMetaId(album),
    typ: 'License'
  })
);

const composerHeader = ed25519Header(composerKeypair.publicKey);
const performerHeader = secp256k1Header(performerKeypair.publicKey);

const createCompositionSig = signClaims(createComposition, composerHeader, composerKeypair.secretKey);
const createRecordingSig = signClaims(createRecording, performerHeader, performerKeypair.secretKey);
const createAlbumSig = signClaims(createAlbum, performerHeader, performerKeypair.secretKey);
const licenseCompositionSig = signClaims(licenseComposition, composerHeader, composerKeypair.secretKey);
const licenseRecordingSig = signClaims(licenseRecording, performerHeader, performerKeypair.secretKey);
const licenseAlbumSig = signClaims(licenseAlbum, performerHeader, performerKeypair.secretKey);

describe('JWT', () => {
  it('verifies create composition claims', () => {
    assert.isOk(
      verifyClaims(createComposition, composerHeader, composition, createCompositionSig),
      'should verify create composition claims'
    );
  });
  it('verifies create recording claims', () => {
    assert.isOk(
      verifyClaims(createRecording, performerHeader, recording, createRecordingSig),
      'should verify create recording claims'
    );
  });
  it('verifies create album claims', () => {
    assert.isOk(
      verifyClaims(createAlbum, performerHeader, album, createAlbumSig),
      'should verify create album claims'
    );
  });
  it('verifies license composition claims', () => {
    assert.isOk(
      verifyClaims(licenseComposition, composerHeader, composition, licenseCompositionSig),
      'should verify license composition claims'
    );
  });
  it('verifies license recording claims', () => {
    assert.isOk(
      verifyClaims(licenseRecording, performerHeader, recording, licenseRecordingSig),
      'should verify license recording claims'
    );
  });
  it('verifies license album claims', () => {
    assert.isOk(
      verifyClaims(licenseAlbum, performerHeader, album, licenseAlbumSig),
      'should verify license album claims'
    );
  });
});
