import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateMeta } from '../lib/meta.js';

const album = JSON.parse(readTestFile('/metas/album.json'));
const audio = JSON.parse(readTestFile('/metas/audio.json'));
const composition = JSON.parse(readTestFile('/metas/composition.json'));
const image = JSON.parse(readTestFile('/metas/image.json'));
const recording = JSON.parse(readTestFile('/metas/recording.json'));

describe('Meta', () => {
  it('validates composition metadata', () => {
    assert.isOk(
      validateMeta(composition),
      'should validate composition'
    );
  });
  it('validates audio metadata', () => {
    assert.isOk(
      validateMeta(audio),
      'should validate audio'
    );
  });
  it('validates image metadata', () => {
    assert.isOk(
      validateMeta(image),
      'should validate image'
    );
  });
  it('validates recording metadata', () => {
    assert.isOk(
      validateMeta(recording),
      'should validate recording'
    );
  });
  it ('validates album metadata', () => {
    assert.isOk(
      validateMeta(album),
      'should validate album'
    );
  });
});
