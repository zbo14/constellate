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
      validateSchema(CreativeWork, compositionLicense),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(CreativeWork, recordingLicense),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(CreativeWork, compositionRightContract),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isOk(
      validateSchema(CreativeWork, recordingRightContract),
      'should validate CreativeWork schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isOk(
      validateSchema(Copyright, compositionCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isOk(
      validateSchema(Copyright, recordingCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isOk(
      validateSchema(ReviewAction, compositionCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isOk(
      validateSchema(ReviewAction, recordingCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isOk(
      validateSchema(Right, compositionRight),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isOk(
      validateSchema(Right, recordingRight),
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isOk(
      validateSchema(RightsTransferAction, compositionRightAssignment),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isOk(
      validateSchema(RightsTransferAction, recordingRightAssignment),
      'should validate RightsTransferAction'
    );
  });
});
