import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateParty } from '../lib/party.js';

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const composer = JSON.parse(readFileSync(__dirname +'/parties/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname +'/parties/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname +'/parties/performer.json'));
const producer = JSON.parse(readFileSync(__dirname +'/parties/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname +'/parties/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname +'/parties/recordLabel.json'));

const performerKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/performerKeypair.json'));
const recordLabelKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/recordLabelKeypair.json'));

describe('Party', () => {
  it('validates composer', (done) => {
    validateParty(composer)
      .then(() => done(), done);
  });
  it('validates lyricist', (done) => {
    validateParty(lyricist)
      .then(() => done(), done);
  });
  it('validates performer', (done) => {
    validateParty(performer, performerKeypair.publicKey)
      .then(() => done(), done);
  });
  it('validates producer', (done) => {
    validateParty(producer).catch(done)
      .then(() => done(), done);
  });
  it('validates publisher', (done) => {
    validateParty(publisher).catch(done)
      .then(() => done(), done);
  });
  it('validates recordLabel', (done) => {
    validateParty(recordLabel, recordLabelKeypair.publicKey)
      .then(() => done(), done);
  });
});
