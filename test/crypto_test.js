import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  generateKeypairFromPassword,
  generateRandomKeypair,
  sign, verify
} from '../lib/crypto.js';

const alice = generateRandomKeypair();
const bob = generateKeypairFromPassword('passwerd');

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
