import { assert } from 'chai';
import { describe, it } from 'mocha';

const ed25519 = require('../lib/ed25519.js');
const secp256k1 = require('../lib/secp256k1.js');

const alice = ed25519.keypairFromPassword('passwerd');
const bob = secp256k1.randomKeypair();

const message = 'dreeming of elliptic curvez';

const aliceSignature = ed25519.sign(message, alice.secretKey);
const bobSignature = secp256k1.sign(message, bob.privateKey);

describe('Crypto', () => {
  it('verifies ed25519 signature', () => {
    assert.isOk(
    ed25519.verify(message, alice.publicKey, aliceSignature),
    'should verify ed25519 signature');
  });
  it('verifies secp256k1 signature', () => {
    assert.isOk(
      secp256k1.verify(message, bob.publicKey, bobSignature),
      'should verify secp256k1 signature');
  });
});
