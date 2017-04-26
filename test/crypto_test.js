import { assert } from 'chai';
import { describe, it } from 'mocha';

import {
  generateSeed,
  generateKeypairFromSeed,
  generateKeypairFromPassword,
  signMessage,
  verifySignature
} from '../lib/crypto.js';

const seed = generateSeed();
const alice = generateKeypairFromSeed(seed);
const bob = generateKeypairFromPassword('passwerd');

const message = 'dreeming of elliptic curvez';

const aliceSignature = signMessage(message, alice.privateKey);
const bobSignature = signMessage(message, bob.privateKey);

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
