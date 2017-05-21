import { assert } from 'chai';
import { describe, it } from 'mocha';
import { readFileSync } from 'fs';

const ed25519 = require('../lib/ed25519.js');
const rsa = require('../lib/rsa.js');
const secp256k1 = require('../lib/secp256k1.js');

const alice = ed25519.keypairFromPassword('passwerd');

const bob = {};
// .pem files from http://phpseclib.sourceforge.net/rsa/examples.html
bob.privateKey = rsa.importPrivateKey(readFileSync(__dirname + '/private-pkcs1.pem'));
bob.publicKey = rsa.importPublicKey(readFileSync(__dirname + '/public-pkcs1.pem'));

const charlie = secp256k1.generateKeypair();

const message = 'dreeming of elliptic curvez';

const aliceSignature = ed25519.sign(message, alice.privateKey);
const bobSignature = rsa.sign(message, bob.privateKey);
const charlieSignature= secp256k1.sign(message, charlie.privateKey);

const bobEncrypted = rsa.encrypt('<(o_o)>', bob.publicKey);

describe('Crypto', () => {
  it('verifies ed25519 signature', () => {
    assert.isOk(
      ed25519.verify(message, alice.publicKey, aliceSignature),
      'should verify ed25519 signature'
    );
  });
  it('verifies rsa signature', () => {
    assert.isOk(
      rsa.verify(message, bob.publicKey, bobSignature),
      'should verify rsa signature'
    );
  });
  it('verifies secp256k1 signature', () => {
    assert.isOk(
      secp256k1.verify(message, charlie.publicKey, charlieSignature),
      'should verify secp256k1 signature'
    );
  });
  it('decrypts rsa encrypted message', () => {
    assert.isOk(
      rsa.decrypt(bobEncrypted, bob.privateKey).toString('utf8'), '<(o_o)>',
      'should decrypt rsa encrypted message'
    );
  });
});
