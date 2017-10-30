'use strict';

var aes = require('aes-js');
var base58 = require('bs58');
var crypto = require('crypto');
var errInvalidPassword = require('./errors').errInvalidPassword;
var nacl = require('tweetnacl');
var scrypt = require('scrypt-async');

exports.KEY_LENGTH = 32;
exports.SALT_LENGTH = 20;

var options = {
  N: 16384,
  r: 8,
  p: 1,
  dkLen: exports.KEY_LENGTH,
  encoding: 'hex'
};

exports.decryptAccount = function (account, password, cb) {
  try {
    var salt = Buffer.from(account.salt, 'hex');
    return exports.scrypt2x(password, salt, function (dkey, hash) {
      if (account.hash !== hash) {
        return cb(errInvalidPassword(password));
      }
      var aesCtr = new aes.ModeOfOperation.ctr(dkey);
      var encryptedPrivateKey = Buffer.from(account.encryptedPrivateKey, 'hex');
      var privateKey = base58.encode(Buffer.from(aesCtr.decrypt(encryptedPrivateKey).buffer));
      cb(null, privateKey);
    });
  } catch (err) {
    cb(err);
  }
};

exports.encryptFiles = function (files, password, cb) {
  var _files = [];
  var salt = crypto.randomBytes(exports.SALT_LENGTH);
  exports.scrypt2x(password, salt, function (dkey, hash) {
    var decryption = {
      hash: hash,
      keys: {},
      salt: salt.toString('hex')
    };
    var aesCtrDkey = new aes.ModeOfOperation.ctr(dkey);
    var aesCtrKey = void 0,
        file = void 0,
        key = void 0;
    for (var i = 0; i < files.length; i++) {
      file = files[i];
      key = crypto.randomBytes(exports.KEY_LENGTH);
      aesCtrKey = new aes.ModeOfOperation.ctr(key);
      _files[i] = {
        content: Buffer.from(aesCtrKey.encrypt(file.content).buffer),
        name: file.name,
        type: file.type
      };
      key = Buffer.from(aesCtrDkey.encrypt(key).buffer);
      decryption.keys[file.name] = key.toString('hex');
    }
    cb(_files, decryption);
  });
};

exports.newAccount = function (password, cb) {
  var keypair = nacl.sign.keyPair();
  var salt = crypto.randomBytes(exports.SALT_LENGTH);
  exports.scrypt2x(password, salt, function (dkey, hash) {
    var aesCtr = new aes.ModeOfOperation.ctr(dkey);
    var encryptedPrivateKey = Buffer.from(aesCtr.encrypt(keypair.secretKey.slice(0, 32)).buffer).toString('hex');
    var data = {
      encryptedPrivateKey: encryptedPrivateKey,
      hash: hash,
      publicKey: base58.encode(keypair.publicKey),
      salt: salt.toString('hex')
    };
    cb(data);
  });
};

exports.scrypt2x = function (password, salt, cb) {
  scrypt(password, salt, options, function (result) {
    var dkey = Buffer.from(result, 'hex');
    scrypt(dkey, salt, options, function (hash) {
      cb(dkey, hash);
    });
  });
};