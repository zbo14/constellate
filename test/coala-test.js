import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
import { validateSchema } from '../lib/schema.js';

import {
  Copyright,
  CreativeWork,
  ReviewAction,
  Right,
  RightsTransferAction
} from '../lib/coala.js';

const CreativeWorkIPLD = CreativeWork('ipld');
const CopyrightIPLD = Copyright('ipld');
const ReviewActionIPLD = ReviewAction('ipld');
const RightIPLD = Right('ipld');
const RightsTransferActionIPLD = RightsTransferAction('ipld');

const compositionCopyright = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright.json'));
const compositionCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright-assertion.json'));
const compositionLicense = JSON.parse(readFileSync(__dirname + '/coala/composition-license.json'));
const compositionRight = JSON.parse(readFileSync(__dirname + '/coala/composition-right.json'));
const compositionRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/composition-right-assignment.json'));
const compositionRightContract = JSON.parse(readFileSync(__dirname + '/coala/composition-right-contract.json'));

const recordingCopyright = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright.json'));
const recordingCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright-assertion.json'));
const recordingLicense = JSON.parse(readFileSync(__dirname + '/coala/recording-license.json'));
const recordingRight = JSON.parse(readFileSync(__dirname + '/coala/recording-right.json'));
const recordingRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/recording-right-assignment.json'));
const recordingRightContract = JSON.parse(readFileSync(__dirname + '/coala/recording-right-contract.json'));

describe('Coala', () => {
  it('validates CreativeWork schema', () => {
    assert.isNull(
      validateSchema(CreativeWorkIPLD, compositionLicense),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isNull(
      validateSchema(CreativeWorkIPLD, recordingLicense),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isNull(
      validateSchema(CreativeWorkIPLD, compositionRightContract),
      'should validate CreativeWork schema'
    );
  });
  it('validates CreativeWork schema', () => {
    assert.isNull(
      validateSchema(CreativeWorkIPLD, recordingRightContract),
      'should validate CreativeWork schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      validateSchema(CopyrightIPLD, compositionCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      validateSchema(CopyrightIPLD, recordingCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(ReviewActionIPLD, compositionCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      validateSchema(ReviewActionIPLD, recordingCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(RightIPLD, compositionRight),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      validateSchema(RightIPLD, recordingRight),
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(RightsTransferActionIPLD, compositionRightAssignment),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      validateSchema(RightsTransferActionIPLD, recordingRightAssignment),
      'should validate RightsTransferAction'
    );
  });
});
