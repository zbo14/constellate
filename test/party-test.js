import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateSchema } from '../lib/schema.js';

import {
  MusicGroup,
  Organization,
  Person
} from '../lib/party.js';

const composer = JSON.parse(readFileSync(__dirname + '/party/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname + '/party/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname + '/party/performer.json'));
const producer = JSON.parse(readFileSync(__dirname + '/party/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname + '/party/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname + '/party/recordLabel.json'));

describe('Party', () => {
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(Person, composer),
      'should validate Person schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(Person, lyricist),
      'should validate Person schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isNull(
      validateSchema(MusicGroup, performer),
      'should validate MusicGroup schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(Person, producer),
      'should validate Person schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(Organization, publisher),
      'should validate Organization schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(Organization, recordLabel),
      'should validate Organization schema'
    );
  });
});
