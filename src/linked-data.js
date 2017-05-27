const CID = require('cids');
const { validateSchema } = require('../lib/schema.js');

const {
  getDAGNode,
  getFile
} = require('../lib/ipfs.js');

const {
  Assertion,
  Copyright,
  Right,
  RightsAssignment
} = require('../lib/coala.js');

const {
  AudioObject,
  CreativeWork,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicRecording
} = require('../lib/meta.js');

const {
  MusicGroup,
  Organization
} = require('../lib/party.js');

const {
  arrayFromObject,
  encodeBase58,
  isArray,
  isObject,
  recurse
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/linked-data
*/

function getSchema(type: string): Object {
  switch(type) {
    case 'MusicGroup':
      return MusicGroup;
    case 'Organization':
      return Organization;
    case 'AudioObject':
      return AudioObject;
    case 'CreativeWork':
      return CreativeWork;
    case 'ImageObject':
      return ImageObject;
    case 'MusicAlbum':
      return MusicAlbum;
    case 'MusicComposition':
      return MusicComposition;
    case 'MusicRecording':
      return MusicRecording;
    case 'Assertion':
      return Assertion;
    case 'Copyright':
      return Copyright;
    case 'Right':
      return Right;
    case 'RightsAssignment':
      return RightsAssignment;
    //..
    default:
      throw new Error('unexpected @type: ' + type);
  }
}

function getTypes(key: string): string[] {
  switch(key) {
    case 'byArtist':
    case 'composer':
    case 'lyricist':
    case 'performer':
    case 'producer':
      return ['MusicGroup'];
    case 'publisher':
    case 'recordLabel':
      return ['Organization'];
    case 'audio':
      return ['AudioObject'];
    case 'contentUrl':
      return [];
    case 'image':
      return ['ImageObject'];
    case 'recordingOf':
      return ['MusicComposition'];
    case 'track':
      return ['MusicRecording'];
    case 'license':
    case 'transferContract':
      return ['CreativeWork'];
    case 'rightsOf':
      return [
        'AudioObject',
        'ImageObject',
        'MusicAlbum',
        'MusicComposition',
        'MusicRecording'
      ];
    case 'source':
      return ['Copyright'];
    case 'asserter':
      return ['MusicGroup', 'Organization'];
    case 'assertionSubject':
      return [
        'AudioObject',
        'ImageObject',
        'MusicAlbum',
        'MusicComposition',
        'MusicRecording'
      ];
    default:
      throw new Error('unexpected key: ' + key);
  }
}

function getLinks(obj: Object): Object[] {
  return arrayFromObject(obj).reduce((result, [key, val]) => {
    if (isObject(val) && val['/']) {
      result.push({
        cid: val['/'],
        name: key
      });
    }
    if (isArray(val)) {
      val.forEach((v, i) => {
        if (isObject(v) && v['/']) {
          result.push({
            cid: v['/'],
            name: key + '-' + (i + 1)
          });
        }
      });
    }
    return result;
  }, []);
}

function validate(obj: Object, format: string): Promise<Object> {
    return new Promise((resolve, reject) => {
        const schema = getSchema(obj['@type']);
        if (!validateSchema(obj, schema)) {
            return reject(obj['@type'] + ' has invalid schema: ' + JSON.stringify(obj, null, 2));
        }
        const links = getLinks(obj);
        if (!links || !links.length) resolve(obj);
        let parts;
        links.reduce((result, link) => {
            return result.then(() => {
                return getDAGNode(link.cid, format);
            }).then((dagNode) => {
                parts = link.name.split('-');
                const types = getTypes(parts[0]);
                if (!types.length) {
                  return { '/': new CID(link.cid).toBaseEncodedString() };
                }
                if (!types.includes(dagNode['@type'])) {
                    return reject(
                      new Error(`invalid @type for ${parts[0]}: ${dagNode['@type']}`)
                    );
                }
                return validate(dagNode, format);
            }).then((validated) => {
                if (parts.length === 1) {
                  obj = Object.assign({}, obj, { [link.name]: validated });
                } else if (parseInt(parts[1]) === 1) {
                  obj = Object.assign({}, obj, { [parts[0]]: [validated] });
                } else {
                  obj = Object.assign({}, obj, { [parts[0]]: obj[parts[0]].concat(validated) });
                }
            });
        }, Promise.resolve()).then(() => {
            resolve(obj);
        });
    });
}

exports.getSchema = getSchema;
exports.validate = validate;
