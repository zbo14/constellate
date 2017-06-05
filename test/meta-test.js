import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateSchema } from '../lib/schema.js';

import {
  AudioObject,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicPlaylist,
  MusicRecording,
  MusicRelease
} from '../lib/meta.js';

const album = JSON.parse(readTestFile('/meta/album.json'));
const audio = JSON.parse(readTestFile('/meta/audio.json'));
const composition = JSON.parse(readTestFile('/meta/composition.json'));
const image = JSON.parse(readTestFile('/meta/image.json'));
const playlist = JSON.parse(readTestFile('/meta/playlist.json'));
const recording = JSON.parse(readTestFile('/meta/recording.json'));
const release = JSON.parse(readTestFile('/meta/release.json'));

describe('Meta', () => {
  it('validates AudioObject schema', () => {
    assert.isOk(
      validateSchema(AudioObject, audio),
      'should validate AudioObject schema'
    );
  });
  it('validates ImageObject schema', () => {
    assert.isOk(
      validateSchema(ImageObject, image),
      'should validate ImageObject schema'
    );
  });
  it ('validates MusicAlbum schema', () => {
    assert.isOk(
      validateSchema(MusicAlbum, album),
      'should validate MusicAlbum schema'
    );
  });
  it('validates MusicComposition schema', () => {
    assert.isOk(
      validateSchema(MusicComposition, composition),
      'should validate MusicComposition schema'
    );
  });
  it('validates MusicPlaylist schema', () => {
    assert.isOk(
      validateSchema(MusicPlaylist, playlist),
      'should validate MusicPlaylist schema'
    );
  });
  it('validates MusicRecording schema', () => {
    assert.isOk(
      validateSchema(MusicRecording, recording),
      'should validate MusicRecording schema'
    );
  });
  it('validates MusicRelease schema', () => {
    assert.isOk(
      validateSchema(MusicRelease, release),
      'should validate MusicRelease schema'
    );
  });
});
