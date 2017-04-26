'use strict';

const bs58 = require('bs58');
const Buffer = require('buffer/').Buffer;
const crypto = require('./crypto.js');
const { signMessage, verifySignature } = crypto;
const extend = require('./util.js').extend;
const Header = require('./header.js').Header;
const schema = require('./schema.js');

// @flow

/**
* @module constellate/src/user
*/

/**
* User
* @constructor
* @param {string} email
* @param {string} [isni]
* @param {string} name
* @param {Buffer} [publicKey]
* @param {string} url
*/

function User(
  email: string, isni: ?string, name: string,
  publicKey: ?Buffer, url: string) {
    this.email = email;
    if (isni != null) {
      this.isni = isni;
    }
    this.name = name;
    if (publicKey != null) {
      this.publicKey = bs58.encode(publicKey);
    }
    Header.call(this, url);
}

User.prototype = extend(Header);
User.prototype.constructor = User;

User.prototype.validate = function(): ?Error {
  return Header.prototype.validate.call(this, schema.user);
}

function signHeader(hasHeader: Header, privateKey: Buffer): string {
  return signMessage(hasHeader.id, privateKey);
}

User.prototype.verify = function(message: string, signature: Buffer): ?boolean {
  if (this.publicKey != null) {
    let buf = Buffer.from(bs58.decode(this.publicKey));
    return verifySignature(message, buf, signature);
  }
  return null;
}

exports.User = User;
exports.signHeader = signHeader;
