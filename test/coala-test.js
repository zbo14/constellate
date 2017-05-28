import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateSchema } from '../lib/schema.js';

import {
  Copyright,
  ReviewAction,
  Right,
  RightsTransferAction
} from '../lib/coala.js';

const compositionCopyright = JSON.parse(readTestFile('/coala/composition-copyright.json'));
const recordingCopyright = JSON.parse(readTestFile('/coala/recording-copyright.json'));
const compositionCopyrightAssertion = JSON.parse(readTestFile('/coala/composition-copyright-assertion.json'));
const recordingCopyrightAssertion = JSON.parse(readTestFile('/coala/recording-copyright-assertion.json'));
const compositionRight = JSON.parse(readTestFile('/coala/composition-right.json'));
const recordingRight = JSON.parse(readTestFile('/coala/recording-right.json'));
const compositionRightAssignment = JSON.parse(readTestFile('/coala/composition-right-assignment.json'));
const recordingRightAssignment = JSON.parse(readTestFile('/coala/recording-right-assignment.json'));

describe('Coala', () => {
  it('validates Copyright schema', () => {
    assert.isOk(
      validateSchema(compositionCopyright, Copyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isOk(
      validateSchema(recordingCopyright, Copyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isOk(
      validateSchema(compositionCopyrightAssertion, ReviewAction),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isOk(
      validateSchema(recordingCopyrightAssertion, ReviewAction),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isOk(
      validateSchema(compositionRight, Right),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isOk(
      validateSchema(recordingRight, Right),
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isOk(
      validateSchema(compositionRightAssignment, RightsTransferAction),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isOk(
      validateSchema(recordingRightAssignment, RightsTransferAction),
      'should validate RightsTransferAction'
    );
  });
});
