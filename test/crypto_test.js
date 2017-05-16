import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  keypairFromPassword,
  randomKeypair,
  sign, verify
} from '../lib/crypto.js';

const alice = randomKeypair();
const bob = keypairFromPassword('passwerd');

const message = 'dreeming of elliptic curvez';

const aliceSignature = sign(message, alice.secretKey);
const bobSignature = sign(message, bob.secretKey);

describe('Crypto', () => {
  it('verifies a signature', () => {
    assert.isOk(
    verify(message, alice.publicKey, aliceSignature),
    'should verify signature');
  });
  it('verifies another signature', () => {
    assert.isOk(
      verify(message, bob.publicKey, bobSignature),
      'should verify signature');
  });
});
