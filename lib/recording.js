'use strict';

const extend = require('./util.js').extend;
const Header = require('./header.js').Header;
const schema = require('./schema.js');

// @flow

/**
* @module constellate/src/recording
*/

/**
* Recording
* @constructor
* @param {string} [isrc]
* @param {Header[]} performer
* @param {Header[]} producer
* @param {Header} recordingOf
* @param {Header[]} [recordLabel]
* @param {string} url
*/

function Recording(
  isrc         , performer          , producer          ,
  recordingOf        , recordLabel           , url        ) {
    let i;
    if (isrc != null) {
      this.isrc = isrc;
    }
    this.performer = [];
    for (i = 0; i < performer.length; i++) {
      this.performer.push(performer[i].getHeader());
    }
    this.producer = [];
    for (i = 0; i < producer.length; i++) {
      this.producer.push(producer[i].getHeader());
    }
    this.recordingOf = recordingOf.getHeader();
    if (recordLabel != null) {
      this.recordLabel = [];
      for (i = 0; i < recordLabel.length; i++) {
        this.recordLabel.push(recordLabel[i].getHeader());
      }
    }
    Header.call(this, url);
}

Recording.prototype = extend(Header);
Recording.prototype.constructor = Recording;

Recording.prototype.addHeader = function(property        , hasHeader        )          {
  switch (property) {
    case 'performer':
    case 'producer':
    case 'recordLabel':
      return Header.prototype.addHeader.call(this, property, hasHeader);
  }
  return false;
}

Recording.prototype.validate = function()         {
  return Header.prototype.validate.call(this, schema.recording);
}

exports.Recording = Recording;
