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
      validateSchema(Copyright, compositionCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      validateSchema(Copyright, recordingCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(ReviewAction, compositionCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(ReviewAction, recordingCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(Right, compositionRight),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(Right, recordingRight),
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(RightsTransferAction, compositionRightAssignment),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(RightsTransferAction, recordingRightAssignment),
      'should validate RightsTransferAction'
    );
  });
});
