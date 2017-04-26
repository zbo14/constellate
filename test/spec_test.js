import { assert } from 'chai';
import { describe, it } from 'mocha';
import { base64_digest, orderStringify } from '../lib/util.js';
import { generateKeypairFromPassword } from '../lib/crypto.js';

import {
  newUser, newComposition, newRecording,
  addCompositionValue, addRecordingValue,
  removeCompositionValue, removeRecordingValue,
  validateUser, validateComposition, validateRecording,
} from '../lib/spec.js';


let keypair = generateKeypairFromPassword('passwerd');

let composer = newUser(
  'composer@email.com', '000000012150090X', 'composer',
  keypair.publicKey, 'http://www.composer.com'
);

let lyricist = newUser(
  'lyricist@email.com', '000000012250078X',
  'lyricist', null, 'http://www.lyricist.com'
);

let wordsmith = newUser(
  'wordsmith@email.com', null, 'wordsmith',
  null, 'http://www.wordsmith.com'
);

let performer = newUser(
  'performer@email.com', null,
  'performer', null, 'http://www.performer.com'
);

let producer = newUser(
  'producer@email.com', '001006501215004X',
  'producer', null, 'http://www.producer.com'
);

let publisher = newUser(
  'publisher@email.com', '301006507115002X',
  'publisher', null, 'http://www.publisher.com'
);

let recordLabel = newUser(
  'recordLabel@email.com', null, 'recordLabel',
  null, 'http://www.record-label.com'
);

let composition = newComposition(
  composer, 'T-034.524.680-1', lyricist, publisher,
  null, 'fire-song', 'http://www.composition.com'
);

composition = addCompositionValue(composition, 'lyricist', wordsmith);

let recording = newRecording(
  null, performer, producer,
  composition, null, 'http://www.recording.com'
);

recording = removeCompositionValue(recording, 'performer', performer);
recording = removeCompositionValue(recording, 'recordLabel', recordLabel);
recording = removeCompositionValue(recording, 'recordLabel', recordLabel);

composition = addCompositionValue(composition, 'recordedAs', recording);

describe('Spec', () => {
    it('validates a user', () => {
      assert.equal(
        validateUser(composer), null,
        'should validate user'
      );
    });
    // console.log(composition);
    it('validates a composition', () => {
      assert.equal(
        validateComposition(composition), null,
        'should validate composition'
      );
    });
    // console.log(recording);
    it('validates a recording', () => {
      assert.equal(
        validateRecording(recording), null,
        'should validate recording'
      );
    });
});
