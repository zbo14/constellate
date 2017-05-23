import { assert } from 'chai';
import { describe, it } from 'mocha';
import { validateMeta } from '../lib/meta.js';
import { readFileSync } from 'fs';

const album = JSON.parse(readFileSync(__dirname + '/metas/album.json'));
const audio = JSON.parse(readFileSync(__dirname + '/metas/audio.json'));
const composition = JSON.parse(readFileSync(__dirname + '/metas/composition.json'));
const image = JSON.parse(readFileSync(__dirname + '/metas/image.json'));
const recording = JSON.parse(readFileSync(__dirname + '/metas/recording.json'));


describe('Meta', () => {
  it('validates composition metadata', (done) => {
    validateMeta(composition)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('validates audio metadata', (done) => {
    validateMeta(audio)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('validates image metadata', (done) => {
    validateMeta(image)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it('validates recording metadata', (done) => {
    validateMeta(recording)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
  it ('validates album metadata', (done) => {
    validateMeta(album)
      .then(() => done())
      .catch((reason) => { throw reason });
  });
});
