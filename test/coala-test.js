import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateSchema } from '../lib/schema.js';

import {
  Copyright,
  ReviewAction,
  Right,
  RightsTransferAction
} from '../lib/coala.js';

const compositionCopyright = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright.json'));
const compositionCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright-assertion.json'));
const compositionRight = JSON.parse(readFileSync(__dirname + '/coala/composition-right.json'));
const compositionRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/composition-right-assignment.json'));

const recordingCopyright = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright.json'));
const recordingCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright-assertion.json'));
const recordingRight = JSON.parse(readFileSync(__dirname + '/coala/recording-right.json'));
const recordingRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/recording-right-assignment.json'));

describe('Coala', () => {
  it('validates Copyright schema', () => {
    assert.isNull(
      validateSchema(compositionCopyright, Copyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      validateSchema(recordingCopyright, Copyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(compositionCopyrightAssertion, ReviewAction),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(recordingCopyrightAssertion, ReviewAction),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(compositionRight, Right),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(recordingRight, Right),
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(compositionRightAssignment, RightsTransferAction),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(recordingRightAssignment, RightsTransferAction),
      'should validate RightsTransferAction'
    );
  });
});
