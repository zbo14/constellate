import { assert } from 'chai';
import { describe, it } from 'mocha';
import { Header } from '../lib/header.js';
import { User } from '../lib/user.js';
import { Composition } from '../lib/composition.js';
import { Recording } from '../lib/recording.js';

import {
  headerSchema,
  userSchema,
  compositionSchema,
  recordingSchema,
  validateSchema
} from '../lib/schema.js';

// @flow

const header = new Header('http://www.kool-song.com');

const user = new User(
  'user@email.com', null, 'username',
  null, 'http://www.user.com'
);

const composition = new Composition(
  [user], null, [user], null, null,
  'title-of-composition', 'http://www.composition.com'
);

const recording = new Recording(
  null, [user], [user], composition,
  null, 'http://www.recording.com'
);

describe('Schema', () => {
  it('validates a header schema', () => {
    assert(
      validateSchema(header, headerSchema),
      'should validate header schema'
    );
  });
  it('validates a user schema', () => {
    assert(
      validateSchema(user, headerSchema) && validateSchema(user, userSchema),
      'should validate user schema'
    );
  });
  it('validates a composition schema', () => {
    assert(
      validateSchema(composition, headerSchema) && validateSchema(composition, compositionSchema),
      'should validate composition schema'
    );
  });
  it('validates a recording schema', () => {
    assert(
      validateSchema(recording, headerSchema) && validateSchema(recording, recordingSchema),
      'should validate recordinßg schema'
    );
  });
});
