import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateSchema } from '../lib/schema.js';

import {
  MusicGroup,
  Organization,
  Person
} from '../lib/party.js';

const MusicGroupIPLD = MusicGroup('ipld');
const OrganizationIPLD = Organization('ipld');
const PersonIPLD = Person('ipld');

const composer = JSON.parse(readFileSync(__dirname + '/party/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname + '/party/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname + '/party/performer.json'));
const producer = JSON.parse(readFileSync(__dirname + '/party/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname + '/party/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname + '/party/recordLabel.json'));

describe('Party', () => {
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(PersonIPLD, composer),
      'should validate Person schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(PersonIPLD, lyricist),
      'should validate Person schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isNull(
      validateSchema(MusicGroupIPLD, performer),
      'should validate MusicGroup schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(PersonIPLD, producer),
      'should validate Person schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(OrganizationIPLD, publisher),
      'should validate Organization schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(OrganizationIPLD, recordLabel),
      'should validate Organization schema'
    );
  });
});
