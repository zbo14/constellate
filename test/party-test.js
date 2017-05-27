import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { MusicGroup, Organization } from '../lib/party.js';
import { validateSchema } from '../lib/schema.js';

const composer = JSON.parse(readTestFile('/parties/composer.json'));
const lyricist = JSON.parse(readTestFile('/parties/lyricist.json'));
const performer = JSON.parse(readTestFile('/parties/performer.json'));
const producer = JSON.parse(readTestFile('/parties/producer.json'));
const publisher = JSON.parse(readTestFile('/parties/publisher.json'));
const recordLabel = JSON.parse(readTestFile('/parties/recordLabel.json'));

describe('Party', () => {
  it('validates composer', () => {
    assert.isOk(
      validateSchema(composer, MusicGroup),
      'should validate composer'
    );
  });
  it('validates lyricist', () => {
    assert.isOk(
      validateSchema(lyricist, MusicGroup),
      'should validate lyricist'
    );
  });
  it('validates performer', () => {
    assert.isOk(
      validateSchema(performer, MusicGroup),
      'should validate performer'
    );
  });
  it('validates producer', () => {
    assert.isOk(
      validateSchema(producer, MusicGroup),
      'should validate producer'
    );
  });
  it('validates publisher', () => {
    assert.isOk(
      validateSchema(publisher, Organization),
      'should validate publisher'
    );
  });
  it('validates recordLabel', () => {
    assert.isOk(
      validateSchema(recordLabel, Organization),
      'should validate recordLabel'
    );
  });
});
