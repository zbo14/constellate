import { assert } from 'chai';
import { describe, it } from 'mocha';
import { validateParty } from '../lib/party.js';

import {
  composer, composerKeypair,
  lyricist, lyricistKeypair,
  performer, performerKeypair,
  producer, producerKeypair,
  publisher, publisherKeypair,
  recordLabel, recordLabelKeypair
} from './parties.js';

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
