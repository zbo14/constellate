const CID = require('cids');
const { validateSchema } = require('../lib/schema.js');

const {
  getCBOR,
  getFile
} = require('../lib/ipfs.js');

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
  Id
} = require('../lib/schema.js');

const {
  arrayFromObject,
  cloneObject,
  getLastItem,
  isArray,
  isObject,
  transform,
  traverse
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/linked-data
*/

function getTypeSchema(type: string, format: string): Object {
  switch(type) {
    case 'MusicGroup':
      return MusicGroup(format);
    case 'Organization':
      return Organization(format);
    case 'Person':
      return Person(format);
    case 'AudioObject':
      return AudioObject(format);
    case 'ImageObject':
      return ImageObject(format);
    case 'MusicAlbum':
      return MusicAlbum(format);
    case 'MusicComposition':
      return MusicComposition(format);
    case 'MusicPlaylist':
      return MusicPlaylist(format);
    case 'MusicRecording':
      return MusicRecording(format);
    case 'MusicRelease':
      return MusicRelease(format);
    case 'Copyright':
      return Copyright(format);
    case 'CreativeWork':
      return CreativeWork(format);
    case 'ReviewAction':
      return ReviewAction(format);
    case 'Right':
      return Right(format);
    case 'RightsTransferAction':
      return RightsTransferAction(format);
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

function resolveCID(cid: Object): Promise<any> {
  return new Promise((resolve, reject) => {
    if (cid.codec === 'dag-pb' && cid.version === 0) {
      return getFile(cid.multihash).then((url) => {
        resolve(url);
      });
    }
    if (cid.codec === 'dag-cbor' && cid.version === 1) {
      return getCBOR(cid).then((dagNode) => {
        resolve(dagNode);
      });
    }
    reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
  });
}

function hashFromId(id: string): string {
  const cid = new CID(id.split('/').pop());
  if ((cid.codec !== 'dag-pb' || cid.version !== 0)
      && (cid.codec !== 'dag-cbor' || cid.version !== 1)) {
    throw new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`);
  }
  return cid.toBaseEncodedString();
}

function hashToId(hash: string): string {
  const cid = new CID(hash);
  if (cid.codec === 'dag-pb' && cid.version === 0) {
    return 'ipfs:/ipfs/' + cid.toBaseEncodedString();
  }
  if (cid.codec === 'dag-cbor' && cid.version === 1) {
    return 'ipfs:/ipld/' + cid.toBaseEncodedString();
  }
  reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
}

function convertObject(obj: Object, from: string, to: string): Object {
  let fn;
  if (from === 'ipld' && to === 'json-ld') {
    fn = (val) => {
      const errors = validateSchema(Link, val);
      if (!!errors) return val;
      return hashToId(val['/']);
    }
  } else if (from === 'json-ld' && to === 'ipld') {
    fn = (val) => {
      const errors = validateSchema(Id, val);
      if (!!errors) return val;
      return { '/': hashFromId(val) };
    }
  } else {
    throw new Error(`invalid formats: from=${from}, to=${to}`)
  }
  return transform(obj, fn);
}

function validate(obj: Object, format: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    let getCID = () => {};
    if (format === 'ipld') {
      getCID = (val, path) => {
        const key = path.slice(-1)[0];
        const errors = validateSchema(Link, { [key] : val });
        if (!!errors) return null;
        return new CID(val);
      }
    } else if (format === 'json-ld') {
      getCID = (val) => {
        const errors = validateSchema(Id, val);
        if (!!errors) return null;
        return new CID(val.split('/').pop());
      }
    } else {
      return reject(new Error('unexpected format: ' + format));
    }
    const schema = getTypeSchema(obj['@type'], format);
    const errors = validateSchema(schema, obj);
    if (errors) {
      return reject(new Error(JSON.stringify(errors)));
    }
    const promises = [];
    traverse(obj, (path, val, result) => {
      const cid = getCID(val, path);
      if (!cid) return;
      result.push(
        resolveCID(cid).then((resolved) => {
          // if (resolved instanceof Blob) {}
          if (resolved.type && (resolved.type.match(/audio|image/))) {
            return resolved;
          } else if (!isObject(resolved)) {
            return reject(new Error('expected non-empty object; got ' + JSON.stringify(resolved)));
          } else {
            if (!!path.match(/@context/)) {
              if (format === 'ipld') {
                return { '/': val };
              }
              if (format === 'json-ld') {
                return val;
              }
              // return resolved;
            }
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
            return validate(resolved, 'ipld');
          }
        }).then((val) => {
          return [path, val];
        })
      );
    }, promises);
    const newObj = cloneObject(obj);
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
        }, newObj);
        inner[lastKey] = val;
      }
      resolve(newObj);
    });
  });
}

exports.convertObject = convertObject;
exports.getTypeSchema = getTypeSchema;
exports.hashFromId = hashFromId;
exports.hashToId = hashToId;
exports.validate = validate;
