import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  generateKeypairFromPassword,
  generateRandomKeypair,
  signMessage,
  verifySignature
} from '../lib/crypto.js';

const alice = generateRandomKeypair();
const bob = generateKeypairFromPassword('passwerd');

const message = 'dreeming of elliptic curvez';

const aliceSignature = signMessage(message, alice.secretKey);
const bobSignature = signMessage(message, bob.secretKey);

describe('Crypto', () => {
  it('verifies a signature', () => {
    assert.isOk(
    verifySignature(message, alice.publicKey, aliceSignature),
    'should verify signature');
  });
  it('verifies another signature', () => {
    assert.isOk(
      verifySignature(message, bob.publicKey, bobSignature),
      'should verify signature');
  });
})
