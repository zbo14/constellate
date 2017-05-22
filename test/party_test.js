import { assert } from 'chai';
import { describe, it } from 'mocha';
import { validateParty } from '../lib/party.js';
import { readFileSync } from 'fs';

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const composer = JSON.parse(readFileSync(__dirname +'/parties/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname +'/parties/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname +'/parties/performer.json'));
const producer = JSON.parse(readFileSync(__dirname +'/parties/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname +'/parties/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname +'/parties/recordLabel.json'));

const composerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/keys/composerKeypair.json'));
const lyricistKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/keys/lyricistKeypair.json'));
const performerKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/performerKeypair.json'));
const producerKeypair = ed25519.decodeKeypair(readFileSync(__dirname + '/keys/producerKeypair.json'));
const publisherKeypair = rsa.decodeKeypair(readFileSync(__dirname + '/keys/publisherKeypair.json'));
const recordLabelKeypair = secp256k1.decodeKeypair(readFileSync(__dirname + '/keys/recordLabelKeypair.json'));

describe('Party', () => {
  it('validates artists', () => {
    assert.isOk(
      validateParty(composer, composerKeypair.publicKey),
      'should validate artist'
    );
    assert.isOk(
      validateParty(lyricist, lyricistKeypair.publicKey),
      'should validate artist'
    );
    assert.isOk(
      validateParty(performer, performerKeypair.publicKey),
      'should validate artist'
    );
    assert.isOk(
      validateParty(producer, producerKeypair.publicKey),
      'should validate artist'
    );
  });
  it('validates organizations', () => {
    assert.isOk(
      validateParty(publisher, publisherKeypair.publicKey),
      'should validate organization'
    )
    assert.isOk(
      validateParty(recordLabel, recordLabelKeypair.publicKey),
      'should validate organization'
    );
  });
});
