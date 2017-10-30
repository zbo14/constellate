'use strict';

exports.errInvalidPassword = function (password) {
  return new Error('invalid password: ' + password);
};

exports.errPathNotFound = function (path) {
  return new Error('path not found: ' + path);
};

exports.errUnexpectedCID = function (cid) {
  return new Error('unexpected cid: ' + JSON.stringify(cid));
};

exports.errUnexpectedHash = function (actual, expected) {
  return new Error('expected hash="' + expected + '", got "' + actual + '"');
};

exports.errUnexpectedType = function (actual, expected) {
  return new Error('expected type="' + expected + '", got "' + actual + '"');
};

exports.errUnsupportedService = function (name) {
  return new Error('"' + name + '" is not a supported service');
};