import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { startPeer } from '../lib/ipfs.js';
import { validateSchema } from '../lib/schema.js';

import {
  AudioObject,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicRecording
} from '../lib/meta.js';

const album = JSON.parse(readTestFile('/metas/album.json'));
const audio = JSON.parse(readTestFile('/metas/audio.json'));
const composition = JSON.parse(readTestFile('/metas/composition.json'));
const image = JSON.parse(readTestFile('/metas/image.json'));
const recording = JSON.parse(readTestFile('/metas/recording.json'));

describe('Meta', () => {
  it('validates composition metadata', () => {
    assert.isOk(
      validateSchema(composition, MusicComposition),
      'should validate composition metadata'
    );
  });
  it('validates audio metadata', () => {
    assert.isOk(
      validateSchema(audio, AudioObject),
      'should validate audio metadata'
    );
  });
  it('validates image metadata', () => {
    assert.isOk(
      validateSchema(image, ImageObject),
      'should validate image metadata'
    );
  });
  it('validates recording metadata', () => {
    assert.isOk(
      validateSchema(recording, MusicRecording),
      'should validate recording metadata'
    );
  });
  it ('validates album metadata', () => {
    assert.isOk(
      validateSchema(album, MusicAlbum),
      'should validate album metadata'
    );
  });
});
