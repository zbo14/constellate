import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  Artist,
  Organization,
  validateParty
} from '../lib/party.js';

import {
  composer, composerKeypair,
  lyricist, lyricistKeypair,
  performer, performerKeypair,
  producer, producerKeypair,
  publisher, publisherKeypair,
  recordLabel, recordLabelKeypair
} from './parties.js';

describe('Party', () => {
  it('validates artist', () => {
    assert.isOk(
      validateParty(composer, composerKeypair.publicKey, Artist),
      'should validate artist'
    );
    assert.isOk(
      validateParty(lyricist, lyricistKeypair.publicKey, Artist),
      'should validate artist'
    );
    assert.isOk(
      validateParty(performer, performerKeypair.publicKey, Artist),
      'should validate artist'
    );
    assert.isOk(
      validateParty(producer, producerKeypair.publicKey, Artist),
      'should validate artist'
    );
  });
  it('validates organizations', () => {
    assert.isOk(
      validateParty(publisher, publisherKeypair.publicKey, Organization),
      'should validate organization'
    )
    assert.isOk(
      validateParty(recordLabel, recordLabelKeypair.publicKey, Organization),
      'should validate organization'
    );
  });
});
