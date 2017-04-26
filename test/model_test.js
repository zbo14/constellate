import { assert } from 'chai';
import { describe, it } from 'mocha';
import { base64_digest, orderStringify } from '../lib/util.js';
import { generateKeypairFromPassword } from '../lib/crypto.js';
import { Header } from '../lib/header.js';
import { User, signHeader } from '../lib/user.js';
import { Composition } from '../lib/composition.js';
import { Recording } from '../lib/recording.js';

// @flow

let keypair = generateKeypairFromPassword('passwerd');

let composer = new User(
  'composer@email.com', '000000012150090X', 'composer',
  keypair.publicKey, 'http://www.composer.com'
);

let lyricist = new User(
  'lyricist@email.com', '000000012250078X',
  'lyricist', null, 'http://www.lyricist.com'
);

let wordsmith = new User(
  'wordsmith@email.com', null, 'wordsmith',
  null, 'http://www.wordsmith.com'
);

let performer = new User(
  'performer@email.com', null,
  'performer', null, 'http://www.performer.com'
);

let producer = new User(
  'producer@email.com', '001006501215004X',
  'producer', null, 'http://www.producer.com'
);

let publisher = new User(
  'publisher@email.com', '301006507115002X',
  'publisher', null, 'http://www.publisher.com'
);

let recordLabel = new User(
  'recordLabel@email.com', null, 'recordLabel',
  null, 'http://www.record-label.com'
);

let composition = new Composition(
  [composer], 'T-034.524.680-1', [lyricist], [publisher],
  null, 'fire-song', 'http://www.composition.com'
);

composition.addHeader('lyricist', wordsmith);

let recording = new Recording(
  null, [performer, performer], [producer],
  composition, null, 'http://www.recording.com'
);

recording.removeHeader('performer', performer);
recording.removeHeader('recordLabel', recordLabel);
recording.removeHeader('recordLabel', recordLabel); // shouldn't do anything..

composition.addHeader('recordedAs', recording);

describe('Model', () => {
    it('validates a header', () => {
      assert.equal(
        composer.getHeader().validate(), null,
        'should validate header'
      );
    });
    it('validates a user', () => {
      assert.equal(
        composer.validate(), null,
        'should validate user'
      );
    });
    // console.log(composition);
    it('validates a composition', () => {
      assert.equal(
        composition.validate(), null,
        'should validate composition'
      );
    });
    // console.log(recording);
    it('validates a recording', () => {
      assert.equal(
        recording.validate(), null,
        'should validate recording'
      );
    });
    it('verifies a user signature', () => {
      const signature = signHeader(composition, keypair.privateKey);
      assert.isOk(
        composer.verify(composition.id, signature),
        'should verify user signature'
      );
    });
});
