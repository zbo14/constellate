const ID3Parser = require('id3-parser');
const ID3Writer = require('browser-id3-writer');

const {
  arrayFromObject,
  draft,
  validateSchema
 } = require('../lib/util.js');

// @flow

/**
* @module constellate/src/id3
*/

function readFile(input, callback) {
  const reader = new FileReader();
  reader.onload = () => callback(reader);
  reader.readAsArrayBuffer(input.files[0]);
}

function readTags(input, callback) {
  readFile(input, (reader) => {
    ID3Parser.parse(new Uint8Array(reader.result)).then(tag => {
      callback(tag);
    });
  });
}

function writeTags(input, frames, callback) {
  readFile(input, (reader) => {
    try {
      if (!validateSchema(frames, schemaFrames)) {
        throw new Error('frames has invalid schema: ' + JSON.stringify(frames, null, 2));
      }
      const writer = new ID3Writer(reader.result);
      arrayFromObject(frames).forEach(([k, v]) => {
        writer.setFrame(k, v);
      });
      writer.addTag();
      callback(writer);
    } catch(err) {
      console.error(err)
    }
  });
}

const schemaFrames = {
  $schema: draft,
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
    WOAF: {
      type: 'string',
      format: 'uri'
    },
    TPE1: {
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
  performer: 'TPE1',
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
