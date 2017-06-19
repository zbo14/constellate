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
      validateSchema(composer, Person),
      'should validate Person schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(lyricist, Person),
      'should validate Person schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isNull(
      validateSchema(performer, MusicGroup),
      'should validate MusicGroup schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      validateSchema(producer, Person),
      'should validate Person schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(publisher, Organization),
      'should validate Organization schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      validateSchema(recordLabel, Organization),
      'should validate Organization schema'
    );
  });
});
