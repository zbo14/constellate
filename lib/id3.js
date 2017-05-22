'use strict';

const ID3Parser = require('id3-parser');
const ID3Writer = require('browser-id3-writer');
const { arrayFromObject, readFileInput } = require('../lib/util.js');
// const { Addr } = require('../lib/party.js');
const { Draft, Url, validateSchema } = require('../lib/schema.js')


// @flow

/**
* @module constellate/src/id3
*/

function readTags(input) {
  return readFileInput(input).then((ab) => {
    return ID3Parser.parse(new Uint8Array(ab));
  });
}

function writeTags(input, frames) {
  return readFileInput(input).then((ab) => {
    if (!validateSchema(frames, schemaFrames)) {
      throw new Error('frames has invalid schema: ' + JSON.stringify(frames, null, 2));
    }
    const writer = new ID3Writer(ab);
    arrayFromObject(frames).forEach(([k, v]) => {
      writer.setFrame(k, v);
    });
    writer.addTag();
    return writer
  });
}

const schemaFrames = {
  $schema: Draft,
  type: 'object',
  title: 'Frames',
  properties: {
    TCOM: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1,
      uniqueItems: true
    },
    WOAF: Url,
    /*
    TEXT: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1,
      uniqueItems: true
    },
    */
    TPE1: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1,
      uniqueItems: true
    },
    TPUB: {
      type: 'array',
      items: {
        type: 'string'
      },
      minItems: 1,
      uniqueItems: true
    },
    TIT2: {
      type: 'string'
    }
    //..
  }
}

const supportedFrames = {
  composer: 'TCOM',
  contentUrl: 'WOAF',
  // lyricist: 'TEXT',
  performer: 'TPE1',
  producer: 'TPE1',
  publisher: 'TPUB',
  recordLabel: 'TPUB',
  title: 'TIT2'
  //..
}

function generateFrames(meta) {
  return arrayFromObject(meta).reduce((result, [k, v]) => {
    if (!supportedFrames.hasOwnProperty(k)) return result;
    return Object.assign({}, result, { [supportedFrames[k]]: v });
  }, {});
}

exports.generateFrames = generateFrames;
exports.readTags = readTags;
exports.writeTags = writeTags;
