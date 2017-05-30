const CID = require('cids');
const { validateSchema } = require('../lib/schema.js');
const { getDAGNode } = require('../lib/ipfs.js');

const {
  Copyright,
  CreativeWork,
  Right,
  ReviewAction,
  RightsTransferAction
} = require('../lib/coala.js');

const {
  AudioObject,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicRecording
} = require('../lib/meta.js');

const {
  MusicGroup,
  Organization,
  Person
} = require('../lib/party.js');

const {
  arrayFromObject,
  isArray,
  isObject
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/linked-data
*/

function getTypeSchema(type: string): Object {
  switch(type) {
    case 'MusicGroup':
      return MusicGroup;
    case 'Organization':
      return Organization;
    case 'Person':
      return Person;
    case 'AudioObject':
      return AudioObject;
    case 'ImageObject':
      return ImageObject;
    case 'MusicAlbum':
      return MusicAlbum;
    case 'MusicComposition':
      return MusicComposition;
    case 'MusicRecording':
      return MusicRecording;
    case 'Copyright':
      return Copyright;
    case 'CreativeWork':
      return CreativeWork;
    case 'ReviewAction':
      return ReviewAction;
    case 'Right':
      return Right;
    case 'RightsTransferAction':
      return RightsTransferAction;
    //..
    default:
      throw new Error('unexpected @type: ' + type);
  }
}

function isSubType(subType: string, type: string): boolean {
  if (subType === type) return true;
  switch(subType) {
    case 'Action':
    case 'CreativeWork':
    case 'Intangible':
    case 'Organization':
    case 'Person':
      return isSubType('Thing', type);
    case 'MusicGroup':
      return isSubType('Organization', type);
    case 'MediaObject':
    case 'MusicAlbum':
    case 'MusicComposition':
    case 'MusicRecording':
      return isSubType('CreativeWork', type);
    case 'AudioObject':
    case 'ImageObject':
      return isSubType('MediaObject', type);
      return isSubType('MediaObject', type);
    case 'Copyright':
    case 'Right':
      return isSubType('Intangible', type);
    case 'ReviewAction':
    case 'TransferAction':
      return isSubType('Action', type);
    case 'RightsTransferAction':
      return isSubType('TransferAction', type);
    default:
      return false;
  }
}

function getPropertyTypes(property: string): string[] {
  switch(property) {
    case 'byArtist':
      return ['MusicGroup'];
    case 'composer':
    case 'lyricist':
    case 'producer':
    case 'publisher':
    case 'recordLabel':
      return [
        'Organization',
        'Person'
      ];
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
    case 'rightsOf':
      return ['CreativeWork'];
    case 'source':
      return ['Copyright'];
    case 'asserter':
      return [
        'Organization',
        'Person'
      ];
    case 'assertionSubject':
      return ['Thing'];
    default:
      throw new Error('unexpected property: ' + property);
  }
}

function getLinks(obj: Object): Object[] {
  return arrayFromObject(obj).reduce((result, [key, val]) => {
    if (isObject(val) && val['/']) {
      result.push({
        cid: new CID(val['/']),
        name: key
      });
    } else if (isArray(val)) {
      val.forEach((v, i) => {
        if (isObject(v) && v['/']) {
          result.push({
            cid: new CID(v['/']),
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
        const schema = getTypeSchema(obj['@type']);
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
                const types = getPropertyTypes(parts[0]);
                if (!types.length) {
                  return { '/': link.cid.toBaseEncodedString() };
                }
                if (!types.some((type) => isSubType(dagNode['@type'], type))) {
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

exports.getTypeSchema = getTypeSchema;
exports.validate = validate;
