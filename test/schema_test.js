import { assert } from 'chai';
import { describe, it } from 'mocha';
import { Header } from '../lib/header.js';
import { User } from '../lib/user.js';
import { Composition } from '../lib/composition.js';
import { Recording } from '../lib/recording.js';

const schema = require('../lib/schema.js');

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
      schema.validate(header, schema.header),
      'should validate header schema'
    );
  });
  it('validates a user schema', () => {
    assert(
      schema.validate(user, schema.header) && schema.validate(user, schema.user),
      'should validate user schema'
    );
  });
  it('validates a composition schema', () => {
    assert(
      schema.validate(composition, schema.header) && schema.validate(composition, schema.composition),
      'should validate composition schema'
    );
  });
  it('validates a recording schema', () => {
    assert(
      schema.validate(recording, schema.header) && schema.validate(recording, schema.recording),
      'should validate recordinßg schema'
    );
  });
});
