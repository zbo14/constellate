import { assert } from 'chai';
import { describe, it } from 'mocha';
import { validateParty } from '../lib/party.js';

describe('Party', () => {
  it('validates an artist', () => {
    assert.isOk(
      validateParty(composer, Artist),
      'should validate artist'
    );
  });
  it('validates an organization', () => {
    assert.isOk(
      validateParty(recordLabel, Organization),
      'should validate organization'
    );
  });
});
