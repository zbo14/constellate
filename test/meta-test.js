import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateSchema } from '../lib/schema.js';

import {
  AudioObject,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicRecording
} from '../lib/meta.js';

const album = JSON.parse(readTestFile('/meta/album.json'));
const audio = JSON.parse(readTestFile('/meta/audio.json'));
const composition = JSON.parse(readTestFile('/meta/composition.json'));
const image = JSON.parse(readTestFile('/meta/image.json'));
const recording = JSON.parse(readTestFile('/meta/recording.json'));

describe('Meta', () => {
  it('validates AudioObject schema', () => {
    assert.isOk(
      validateSchema(audio, AudioObject),
      'should validate AudioObject schema'
    );
  });
  it('validates ImageObject schema', () => {
    assert.isOk(
      validateSchema(image, ImageObject),
      'should validate ImageObject schema'
    );
  });
  it ('validates MusicAlbum schema', () => {
    assert.isOk(
      validateSchema(album, MusicAlbum),
      'should validate MusicAlbum schema'
    );
  });
  it('validates MusicComposition schema', () => {
    assert.isOk(
      validateSchema(composition, MusicComposition),
      'should validate MusicComposition schema'
    );
  });
  it('validates MusicRecording schema', () => {
    assert.isOk(
      validateSchema(recording, MusicRecording),
      'should validate MusicRecording schema'
    );
  });
});
