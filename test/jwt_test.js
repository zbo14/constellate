import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { getAddr } from '../lib/party.js';
import { now } from '../lib/util.js';

import {
  Create,
  License,
  newEd25519Header,
  newRsaHeader,
  newSecp256k1Header,
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

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const album = JSON.parse(readFileSync(__dirname +'/metas/album.json'));
const composition = JSON.parse(readFileSync(__dirname +'/metas/composition.json'));
const recording = JSON.parse(readFileSync(__dirname +'/metas/recording.json'));

const composer = JSON.parse(readFileSync(__dirname +'/parties/composer.json'));
const composerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/parties/composerKeypair.json'));
const lyricist = JSON.parse(readFileSync(__dirname +'/parties/lyricist.json'));
const lyricistKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/parties/lyricistKeypair.json'));
const performer = JSON.parse(readFileSync(__dirname +'/parties/performer.json'));
const performerKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/parties/performerKeypair.json'));
const producer = JSON.parse(readFileSync(__dirname +'/parties/producer.json'));
const producerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/parties/producerKeypair.json'));
const publisher = JSON.parse(readFileSync(__dirname +'/parties/publisher.json'));
const publisherKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/parties/publisherKeypair.json'));
const recordLabel = JSON.parse(readFileSync(__dirname +'/parties/recordLabel.json'));
const recordLabelKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/parties/recordLabelKeypair.json'));

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
    iss: getAddr(lyricist),
    sub: getMetaId(composition),
    typ: 'License'
  })
);

const licenseRecording = setClaimsId(
  timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 2000,
    iss: getAddr(producer),
    sub: getMetaId(recording),
    typ: 'License'
  })
);

const licenseAlbum = setClaimsId(
  timestamp({
    aud: [getAddr(recordLabel)],
    exp: now() + 3000,
    iss: getAddr(producer),
    sub: getMetaId(album),
    typ: 'License'
  })
);

const composerHeader = newEd25519Header(composerKeypair.publicKey);
const lyricistHeader = newRsaHeader(lyricistKeypair.publicKey);
const performerHeader = newSecp256k1Header(performerKeypair.publicKey);
const producerHeader = newEd25519Header(producerKeypair.publicKey);

const createCompositionSig = signClaims(createComposition, composerHeader, composerKeypair.privateKey);
const createRecordingSig = signClaims(createRecording, performerHeader, performerKeypair.privateKey);
const createAlbumSig = signClaims(createAlbum, performerHeader, performerKeypair.privateKey);
const licenseCompositionSig = signClaims(licenseComposition, lyricistHeader, lyricistKeypair.privateKey);
const licenseRecordingSig = signClaims(licenseRecording, producerHeader, producerKeypair.privateKey);
const licenseAlbumSig = signClaims(licenseAlbum, producerHeader, producerKeypair.privateKey);

function callback(done) {
  return (err) => {
    assert.isNull(err);
    done();
  }
}

describe('JWT', () => {
  it('verifies create composition claims', (done) => {
    verifyClaims(createComposition, composerHeader, composition, createCompositionSig, callback(done));
  });
  it('verifies create recording claims', (done) => {
    verifyClaims(createRecording, performerHeader, recording, createRecordingSig, callback(done));
  });
  it('verifies create album claims', (done) => {
    verifyClaims(createAlbum, performerHeader, album, createAlbumSig, callback(done));
  });
  it('verifies license composition claims', (done) => {
    verifyClaims(licenseComposition, lyricistHeader, composition, licenseCompositionSig, callback(done));
  });
  it('verifies license recording claims', (done) => {
    verifyClaims(licenseRecording, producerHeader, recording, licenseRecordingSig, callback(done));
  });
  it('verifies license album claims', (done) => {
    verifyClaims(licenseAlbum, producerHeader, album, licenseAlbumSig, callback(done));
  });
});
