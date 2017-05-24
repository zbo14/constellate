import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateParty } from '../lib/party.js';

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const composer = JSON.parse(readTestFile('/parties/composer.json'));
const lyricist = JSON.parse(readTestFile('/parties/lyricist.json'));
const performer = JSON.parse(readTestFile('/parties/performer.json'));
const producer = JSON.parse(readTestFile('/parties/producer.json'));
const publisher = JSON.parse(readTestFile('/parties/publisher.json'));
const recordLabel = JSON.parse(readTestFile('/parties/recordLabel.json'));

const performerKeypair = secp256k1.decodeKeypair(readTestFile('/keys/performerKeypair.json'));
const recordLabelKeypair = secp256k1.decodeKeypair(readTestFile('/keys/recordLabelKeypair.json'));

describe('Party', () => {
  it('validates composer', () => {
    assert.isOk(
      validateParty(composer),
      'should validate composer'
    );
  });
  it('validates lyricist', () => {
    assert.isOk(
      validateParty(lyricist),
      'should validate lyricist'
    );
  });
  it('validates performer', () => {
    assert.isOk(
      validateParty(performer, performerKeypair.publicKey),
      'should validate performer'
    );
  });
  it('validates producer', () => {
    assert.isOk(
      validateParty(producer),
      'should validate producer'
    );
  });
  it('validates publisher', () => {
    assert.isOk(
      validateParty(publisher),
      'should validate publisher'
    );
  });
  it('validates recordLabel', () => {
    assert.isOk(
      validateParty(recordLabel, recordLabelKeypair.publicKey),
      'should validate recordLabel'
    );
  });
});
