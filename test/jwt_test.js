import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { getAddr } from '../lib/party.js';
import { now } from '../lib/util.js';

import {
  newEd25519Header,
  newRsaHeader,
  newSecp256k1Header,
  signClaims,
  verifyClaims
} from '../lib/jwt.js';

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const composerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/keys/composerKeypair.json'));
const lyricistKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/keys/lyricistKeypair.json'));
const performerKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/performerKeypair.json'));
const producerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/keys/producerKeypair.json'));
const publisherKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/keys/publisherKeypair.json'));
const recordLabelKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/recordLabelKeypair.json'));

const album = JSON.parse(readFileSync(__dirname + '/metas/album.json'));
const composition = JSON.parse(readFileSync(__dirname + '/metas/composition.json'));
const recording = JSON.parse(readFileSync(__dirname + '/metas/recording.json'));

const composerHeader = newEd25519Header(composerKeypair.publicKey);
const lyricistHeader = newRsaHeader(lyricistKeypair.publicKey);
const performerHeader = newSecp256k1Header(performerKeypair.publicKey);
const producerHeader = newEd25519Header(producerKeypair.publicKey);

const createComposition = JSON.parse(readFileSync(__dirname + '/claims/createComposition.json'));
const createRecording = JSON.parse(readFileSync(__dirname + '/claims/createRecording.json'));
const createAlbum = JSON.parse(readFileSync(__dirname + '/claims/createAlbum.json'));
const licenseComposition = JSON.parse(readFileSync(__dirname + '/claims/licenseComposition.json'));
const licenseRecording = JSON.parse(readFileSync(__dirname + '/claims/licenseRecording.json'));
const licenseAlbum = JSON.parse(readFileSync(__dirname + '/claims/licenseAlbum.json'));

const createCompositionSig = signClaims(createComposition, composerHeader, composerKeypair.privateKey);
const createRecordingSig = signClaims(createRecording, performerHeader, performerKeypair.privateKey);
const createAlbumSig = signClaims(createAlbum, performerHeader, performerKeypair.privateKey);
const licenseCompositionSig = signClaims(licenseComposition, lyricistHeader, lyricistKeypair.privateKey);
const licenseRecordingSig = signClaims(licenseRecording, producerHeader, producerKeypair.privateKey);
const licenseAlbumSig = signClaims(licenseAlbum, producerHeader, producerKeypair.privateKey);

describe('JWT', () => {
  it('verifies create composition claims', (done) => {
    verifyClaims(createComposition, composerHeader, composition, createCompositionSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('verifies create recording claims', (done) => {
    verifyClaims(createRecording, performerHeader, recording, createRecordingSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('verifies create album claims', (done) => {
    verifyClaims(createAlbum, performerHeader, album, createAlbumSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('verifies license composition claims', (done) => {
    verifyClaims(licenseComposition, lyricistHeader, composition, licenseCompositionSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('verifies license recording claims', (done) => {
    verifyClaims(licenseRecording, producerHeader, recording, licenseRecordingSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('verifies license album claims', (done) => {
    verifyClaims(licenseAlbum, producerHeader, album, licenseAlbumSig)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
});
