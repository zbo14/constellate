'use strict';

const util = require('./util.js');
const { base64_digest, clone, extend, orderStringify } = util;
const schema = require('./schema.js');

// @flow

/**
* @module constellate/src/header
*/

/**
* Header
* @constructor
* @param {string} url
*/

function Header(url        ) {
  this.id = base64_digest(this);
  this.url = url;
}

Header.prototype.calcId = function()         {
  let copy = clone(this);
  delete copy.id;
  delete copy.url;
  return base64_digest(copy);
}

Header.prototype.setId = function() {
  this.id = this.calcId();
}

Header.prototype.getHeader = function()         {
  return new Header(this.url);
}

Header.prototype.addHeader = function(property        , hasHeader        )          {
  return Header.prototype.add.call(this, property, hasHeader.getHeader());
}

Header.prototype.removeHeader = function(property        , hasHeader        )          {
  return Header.prototype.remove.call(this, property, hasHeader.getHeader());
}

Header.prototype.add = function(property        , value)          {
  if (!this.hasOwnProperty(property)) {
    this[property] = [];
  }
  if (!Array.isArray(this[property]) || value == null) {
    return false;
  }
  if (this[property].length > 0 && typeof value !== typeof this[property][0]) {
    return false;
  }
  this[property].push(value);
  this.setId();
  return true;
}

Header.prototype.remove = function(property        , value        )          {
  if (!this.hasOwnProperty(property)) {
    return false;
  }
  if (!Array.isArray(this[property]) || value == null) {
    return false;
  }
  let str = orderStringify(value);
  for (let i = 0; i < this[property].length; i++) {
    if (str === orderStringify(this[property][i])) {
      this[property].splice(i, 1);
      if (this[property].length === 0) {
        delete this[property];
      }
      this.setId();
      return true;
    }
  }
  return false;
}

Header.prototype.validate = function(schema         = schema.header)         {
  if (!schema.validate(this, schema)) {
    return new Error('Invalid schema');
  }
  if (this.id !== this.calcId()) {
    return new Error('Invalid id');
  }
  return null;
}

exports.Header = Header;
