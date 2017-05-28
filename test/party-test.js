import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { MusicGroup, Organization } from '../lib/party.js';
import { validateSchema } from '../lib/schema.js';

const composer = JSON.parse(readTestFile('/party/composer.json'));
const lyricist = JSON.parse(readTestFile('/party/lyricist.json'));
const performer = JSON.parse(readTestFile('/party/performer.json'));
const producer = JSON.parse(readTestFile('/party/producer.json'));
const publisher = JSON.parse(readTestFile('/party/publisher.json'));
const recordLabel = JSON.parse(readTestFile('/party/recordLabel.json'));

describe('Party', () => {
  it('validates MusicGroup schema', () => {
    assert.isOk(
      validateSchema(composer, MusicGroup),
      'should validate MusicGroup schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isOk(
      validateSchema(lyricist, MusicGroup),
      'should validate MusicGroup schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isOk(
      validateSchema(performer, MusicGroup),
      'should validate MusicGroup schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isOk(
      validateSchema(producer, MusicGroup),
      'should validate MusicGroup schema'
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
