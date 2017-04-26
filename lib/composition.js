'use strict';

const extend = require('./util.js').extend;
const Header = require('./header.js').Header;
const schema = require('./schema.js');

// @flow

/**
* @module constellate/src/composition
*/

/**
* Composition
* @constructor
* @param {Header[]} composer
* @param {string} [iswc]
* @param {Header[]} [lyricist]
* @param {Header[]} [publisher]
* @param {Header[]} [recordedAs]
* @param {string} title
* @param {string} url
*/

function Composition(
  composer          , iswc         , lyricist           ,
  publisher           , recordedAs           , title        , url        ) {
    let i;
    this.composer = [];
    for (i = 0; i < composer.length; i++) {
      this.composer.push(composer[i].getHeader());
    }
    if (iswc != null) {
      this.iswc = iswc;
    }
    if (lyricist != null) {
      this.lyricist = [];
      for (i = 0; i < lyricist.length; i++) {
        this.lyricist.push(lyricist[i].getHeader());
      }
    }
    if (publisher != null) {
      this.publisher = [];
      for (i = 0; i < publisher.length; i++) {
        this.publisher.push(publisher[i].getHeader());
      }
    }
    if (recordedAs != null) {
      this.recordedAs = [];
      for (i = 0; i < recordedAs.length; i++) {
        this.recordedAs.push(recordedAs[i].getHeader());
      }
    }
    this.title = title;
    Header.call(this, url);
}

Composition.prototype = extend(Header);
Composition.prototype.constructor = Composition;

Composition.prototype.addHeader = function(property        , hasHeader        )          {
  switch (property) {
    case 'composer':
    case 'lyricist':
    case 'publisher':
    case 'recordedAs':
      return Header.prototype.addHeader.call(this, property, hasHeader);
  }
  return false;
}

Composition.prototype.validate = function()         {
  return Header.prototype.validate.call(this, schema.composition);
}

exports.Composition = Composition;
