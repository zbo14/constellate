import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateSchema } from '../lib/schema.js';

import {
  MusicGroup,
  Organization,
  Person
} from '../lib/party.js';

const composer = JSON.parse(readTestFile('/party/composer.json'));
const lyricist = JSON.parse(readTestFile('/party/lyricist.json'));
const performer = JSON.parse(readTestFile('/party/performer.json'));
const producer = JSON.parse(readTestFile('/party/producer.json'));
const publisher = JSON.parse(readTestFile('/party/publisher.json'));
const recordLabel = JSON.parse(readTestFile('/party/recordLabel.json'));

describe('Party', () => {
  it('validates Person schema', () => {
    assert.isOk(
      validateSchema(composer, Person),
      'should validate Person schema'
    );
  });
  it('validates Person schema', () => {
    assert.isOk(
      validateSchema(lyricist, Person),
      'should validate Person schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isOk(
      validateSchema(performer, MusicGroup),
      'should validate MusicGroup schema'
    );
  });
  it('validates Person schema', () => {
    assert.isOk(
      validateSchema(producer, Person),
      'should validate Person schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isOk(
      validateSchema(publisher, Organization),
      'should validate Organization schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isOk(
      validateSchema(recordLabel, Organization),
      'should validate Organization schema'
    );
  });
});
