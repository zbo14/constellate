const CID = require('cids');

const {
  Account,
  ContractAccount,
  ExternalAccount,
  Tx
} = require('../lib/ethon.js');

const {
  getCBOR,
  getFile
} = require('../lib/ipfs.js');

const {
  Copyright,
  Right,
  ReviewAction,
  RightsTransferAction
} = require('../lib/coala.js');

const {
  AudioObject,
  ImageObject,
  MusicAlbum,
  MusicComposition,
  MusicPlaylist,
  MusicRecording,
  MusicRelease
} = require('../lib/meta.js');

const {
  MusicGroup,
  Organization,
  Person
} = require('../lib/party.js');

const {
  Link,
  validateSchema
} = require('../lib/schema.js');

const {
  cloneObject,
  isObject,
  isString,
  transform,
  traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/linked-data
 */

function getTypeSchema(type: string): Object {
  switch(type) {
    case 'Account':
      return Account;
    case 'ContractAccount':
      return ContractAccount;
    case 'ExternalAccount':
      return ExternalAccount;
    case 'Tx':
      return Tx;
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
    case 'MusicPlaylist':
      return MusicPlaylist;
    case 'MusicRecording':
      return MusicRecording;
    case 'MusicRelease':
      return MusicRelease;
    case 'Copyright':
      return Copyright;
    case 'ReviewAction':
      return ReviewAction;
    case 'Right':
      return Right;
    case 'RightsTransferAction':
      return RightsTransferAction;
    default:
      throw new Error('unexpected @type: ' + type);
  }
}

function isSubType(subType: string, type: string): boolean {
  if (subType === type) return true;
  switch(subType) {
    case 'ContractAccount':
    case 'ExternalAccount':
      return isSubType('Account', type);
    case 'Action':
    case 'CreativeWork':
    case 'Intangible':
    case 'Organization':
    case 'Person':
      return isSubType('Thing', type);
    case 'MusicGroup':
      return isSubType('Organization', type);
    case 'MediaObject':
    case 'MusicComposition':
    case 'MusicPlaylist':
    case 'MusicRecording':
      return isSubType('CreativeWork', type);
    case 'MusicAlbum':
    case 'MusicRelease':
      return isSubType('MusicPlaylist', type);
    case 'AudioObject':
    case 'ImageObject':
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
    case 'member':
    case 'producer':
    case 'publisher':
    case 'recordLabel':
      return [
        'Organization',
        'Person'
      ];
    case 'audio':
      return ['AudioObject'];
    case 'image':
      return ['ImageObject'];
    case 'recordingOf':
      return ['MusicComposition'];
    case 'releaseOf':
      return ['MusicAlbum'];
    case 'track':
      return ['MusicRecording'];
    case 'license':
    case 'transferContract':
      return ['ContractAccount'];
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

function getCID(path: string, val: any): ?Object {
  const key = path.slice(-1)[0];
  const errors = validateSchema(Link, { [key]: val });
  return (!errors ? new CID(val) : null);
}

function resolveCID(cid: Object): Promise<any> {
  return new Promise((resolve, reject) => {
    if (cid.codec === 'dag-pb' && cid.version === 0) {
      return getFile(cid.multihash).then(resolve);
    }
    if (cid.codec === 'dag-cbor' && cid.version === 1) {
      return getCBOR(cid).then(resolve);
    }
    reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
  });
}

function validate(obj: Object): Promise<Object> {
  return new Promise((resolve, reject) => {
    const schema = getTypeSchema(obj['@type']);
    const errors = validateSchema(schema, obj);
    if (errors) {
      return reject(new Error(JSON.stringify(errors)));
    }
    const promises = [];
    traverse(obj, (path, val, result) => {
      const cid = getCID(path, val);
      if (!cid) return;
      result.push(
        resolveCID(cid).then((resolved) => {
          if ((resolved.type && resolved.type.match(/audio|image/))) {
            return resolved;
          } else if (isObject(resolved)) {
            const keys = path.split('/');
            let key = keys.pop();
            if (!key) {
              for (let i = 0; i < keys.length; i++) {
                if (i && !keys[i]) {
                  key = keys[i-1];
                  break;
                }
              }
            }
            const subType = resolved['@type'];
            const types = getPropertyTypes(key);
            if (!types.some((type) => isSubType(subType, type))) {
              return reject(new Error('invalid @type for ' + key +  ': ' + subType));
            }
            return validate(resolved);
          } else {
            return reject(new Error('unexpected resolved: ' + JSON.stringify(resolved)));
          }
        }).then((val) => {
          return [path, val];
        })
      );
    }, promises);
    const expanded = cloneObject(obj);
    Promise.all(promises).then((results) => {
      for (let i = 0; i < results.length; i++) {
        const keys = results[i][0].split('/').filter((key) => !!key);
        let lastKey = keys.pop();
        if (!lastKey) {
          keys.pop();
          lastKey = '/';
        }
        const val = results[i][1];
        const inner = keys.reduce((result, key) => {
          return result[key];
        }, expanded);
        inner[lastKey] = val;
      }
      resolve(expanded);
    });
  });
}

exports.getTypeSchema = getTypeSchema;
exports.validate = validate;
