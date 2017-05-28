import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readTestFile } from './fs.js';
import { validateSchema } from '../lib/schema.js';

import {
  Copyright,
  CreativeWork,
  ReviewAction,
  Right,
  RightsTransferAction
} from '../lib/coala.js';


const compositionCopyright = JSON.parse(readTestFile('/coala/composition-copyright.json'));
const compositionCopyrightAssertion = JSON.parse(readTestFile('/coala/composition-copyright-assertion.json'));
const compositionLicense = JSON.parse(readTestFile('/coala/composition-license.json'));
const compositionRight = JSON.parse(readTestFile('/coala/composition-right.json'));
const compositionRightAssignment = JSON.parse(readTestFile('/coala/composition-right-assignment.json'));
const compositionRightContract = JSON.parse(readTestFile('/coala/composition-right-contract.json'));

const recordingCopyright = JSON.parse(readTestFile('/coala/recording-copyright.json'));
const recordingCopyrightAssertion = JSON.parse(readTestFile('/coala/recording-copyright-assertion.json'));
const recordingLicense = JSON.parse(readTestFile('/coala/recording-license.json'));
const recordingRight = JSON.parse(readTestFile('/coala/recording-right.json'));
const recordingRightAssignment = JSON.parse(readTestFile('/coala/recording-right-assignment.json'));
const recordingRightContract = JSON.parse(readTestFile('/coala/recording-right-contract.json'));

describe('Coala', () => {
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(compositionLicense, CreativeWork),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(recordingLicense, CreativeWork),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(compositionRightContract, CreativeWork),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(recordingRightContract, CreativeWork),
      'should validate CreativeWork schema'
    );
  });
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
