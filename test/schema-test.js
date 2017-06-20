import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';
const Schema = require('../lib/schema.js');

const contractAccount = JSON.parse(readFileSync(__dirname + '/ethon/contract-account.json'));
const externalAccount = JSON.parse(readFileSync(__dirname + '/ethon/external-account.json'));

const composer = JSON.parse(readFileSync(__dirname + '/party/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname + '/party/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname + '/party/performer.json'));
const producer = JSON.parse(readFileSync(__dirname + '/party/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname + '/party/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname + '/party/recordLabel.json'));

const album = JSON.parse(readFileSync(__dirname + '/meta/album.json'));
const audio = JSON.parse(readFileSync(__dirname + '/meta/audio.json'));
const composition = JSON.parse(readFileSync(__dirname + '/meta/composition.json'));
const image = JSON.parse(readFileSync(__dirname + '/meta/image.json'));
const playlist = JSON.parse(readFileSync(__dirname + '/meta/playlist.json'));
const recording = JSON.parse(readFileSync(__dirname + '/meta/recording.json'));
const release = JSON.parse(readFileSync(__dirname + '/meta/release.json'));

const compositionCopyright = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright.json'));
const compositionCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright-assertion.json'));
const compositionRight = JSON.parse(readFileSync(__dirname + '/coala/composition-right.json'));
const compositionRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/composition-right-assignment.json'));

const recordingCopyright = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright.json'));
const recordingCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright-assertion.json'));
const recordingRight = JSON.parse(readFileSync(__dirname + '/coala/recording-right.json'));
const recordingRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/recording-right-assignment.json'));

const personSchema = new Schema('Person');
const organizationSchema = new Schema('Organization');
const copyrightSchema = new Schema('Copyright');
const reviewActionSchema = new Schema('ReviewAction');
const rightSchema = new Schema('Right');
const rightsTransferActionSchema = new Schema('RightsTransferAction')

describe('EthOn', () => {
  it('validates ContractAccount schema', () => {
    assert.isNull(
      new Schema('ContractAccount').validate(contractAccount),
      'should validate ContractAccount schema'
    );
  });
  it('validates ExternalAccount schema', () => {
    assert.isNull(
      new Schema('ExternalAccount').validate(externalAccount),
      'should validate ExternalAccount schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      personSchema.validate(composer),
      'should validate Person schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      personSchema.validate(lyricist),
      'should validate Person schema'
    );
  });
  it('validates MusicGroup schema', () => {
    assert.isNull(
      new Schema('MusicGroup').validate(performer),
      'should validate MusicGroup schema'
    );
  });
  it('validates Person schema', () => {
    assert.isNull(
      personSchema.validate(producer),
      'should validate Person schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      organizationSchema.validate(publisher),
      'should validate Organization schema'
    );
  });
  it('validates Organization schema', () => {
    assert.isNull(
      organizationSchema.validate(recordLabel),
      'should validate Organization schema'
    );
  });
  it('validates AudioObject schema', () => {
    assert.isNull(
      new Schema('AudioObject').validate(audio),
      'should validate AudioObject schema'
    );
  });
  it('validates ImageObject schema', () => {
    assert.isNull(
      new Schema('ImageObject').validate(image),
      'should validate ImageObject schema'
    );
  });
  it ('validates MusicAlbum schema', () => {
    assert.isNull(
      new Schema('MusicAlbum').validate(album),
      'should validate MusicAlbum schema'
    );
  });
  it('validates MusicComposition schema', () => {
    assert.isNull(
      new Schema('MusicComposition').validate(composition),
      'should validate MusicComposition schema'
    );
  });
  it('validates MusicPlaylist schema', () => {
    assert.isNull(
      new Schema('MusicPlaylist').validate(playlist),
      'should validate MusicPlaylist schema'
    );
  });
  it('validates MusicRecording schema', () => {
    assert.isNull(
      new Schema('MusicRecording').validate(recording),
      'should validate MusicRecording schema'
    );
  });
  it('validates MusicRelease schema', () => {
    assert.isNull(
      new Schema('MusicRelease').validate(release),
      'should validate MusicRelease schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      copyrightSchema.validate(compositionCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates Copyright schema', () => {
    assert.isNull(
      copyrightSchema.validate(recordingCopyright),
      'should validate Copyright schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      reviewActionSchema.validate(compositionCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates ReviewAction schema', () => {
    assert.isNull(
      reviewActionSchema.validate(recordingCopyrightAssertion),
      'should validate ReviewAction schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      rightSchema.validate(compositionRight),
      'should validate Right schema'
    );
  });
  it('validates Right schema', () => {
    assert.isNull(
      rightSchema.validate,
      'should validate Right schema'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      rightsTransferActionSchema.validate(compositionRightAssignment),
      'should validate RightsTransferAction'
    );
  });
  it('validates RightsTransferAction schema', () => {
    assert.isNull(
      rightsTransferActionSchema.validate(compositionRightAssignment),
      'should validate RightsTransferAction'
    );
  });
});
