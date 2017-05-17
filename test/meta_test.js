import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  Album,
  Audio,
  Composition,
  Recording,
  validateMeta
} from '../lib/meta.js';

import {
  album,
  audio,
  composition,
  recording
} from './metas.js'

describe('Meta', () => {
    it('validates composition metadata', () => {
      assert.isOk(
        validateMeta(composition, Composition),
        'should validate composition metadata'
      );
    });
    it('validates audio metadata', () => {
      assert.isOk(
        validateMeta(audio, Audio),
        'should validate audio metadata'
      );
    });
    it('validates recording metadata', () => {
      assert.isOk(
        validateMeta(recording, Recording),
        'should validate recording metadata'
      );
    });
    it('validates album metadata', () => {
      assert.isOk(
        validateMeta(album, Album),
        'should validate album metadata'
      );
    });
});
