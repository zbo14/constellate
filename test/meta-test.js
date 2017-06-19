import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
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

const album = JSON.parse(readFileSync(__dirname + '/meta/album.json'));
const audio = JSON.parse(readFileSync(__dirname + '/meta/audio.json'));
const composition = JSON.parse(readFileSync(__dirname + '/meta/composition.json'));
const image = JSON.parse(readFileSync(__dirname + '/meta/image.json'));
const playlist = JSON.parse(readFileSync(__dirname + '/meta/playlist.json'));
const recording = JSON.parse(readFileSync(__dirname + '/meta/recording.json'));
const release = JSON.parse(readFileSync(__dirname + '/meta/release.json'));

describe('Meta', () => {
  it('validates AudioObject schema', () => {
    assert.isNull(
      validateSchema(audio, AudioObject),
      'should validate AudioObject schema'
    );
  });
  it('validates ImageObject schema', () => {
    assert.isNull(
      validateSchema(image, ImageObject),
      'should validate ImageObject schema'
    );
  });
  it ('validates MusicAlbum schema', () => {
    assert.isNull(
      validateSchema(album, MusicAlbum),
      'should validate MusicAlbum schema'
    );
  });
  it('validates MusicComposition schema', () => {
    assert.isNull(
      validateSchema(composition, MusicComposition),
      'should validate MusicComposition schema'
    );
  });
  it('validates MusicPlaylist schema', () => {
    assert.isNull(
      validateSchema(playlist, MusicPlaylist),
      'should validate MusicPlaylist schema'
    );
  });
  it('validates MusicRecording schema', () => {
    assert.isNull(
      validateSchema(recording, MusicRecording),
      'should validate MusicRecording schema'
    );
  });
  it('validates MusicRelease schema', () => {
    assert.isNull(
      validateSchema(release, MusicRelease),
      'should validate MusicRelease schema'
    );
  });
});
