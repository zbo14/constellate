const CID = require('cids');
const isBuffer = require('is-buffer');

const {
  cloneObject,
  isObject,
  isString,
  orderObject,
  traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/ipld
 */

function dereference(cid: Object, ipfs: Object): Promise<Object> {
  return new Promise((resolve, reject) => {
    if (cid.codec === 'dag-pb' && cid.version === 0) {
      return ipfs.getFile(cid.multihash).then(resolve);
    }
    if (cid.codec === 'dag-cbor' && cid.version === 1) {
      return ipfs.getObject(cid).then(resolve);
    }
    reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
  });
}

function expand(obj: Object, ipfs: Object): Promise<Object> {
  return new Promise((resolve, reject) => {
    const promises = [];
    traverse(obj, (path, val, result) => {
      if (path.substr(-1) !== '/') return;
      const cid = new CID(val);
      result.push(
        dereference(cid, ipfs).then(deref => {
          if (deref.type && deref.type.match(/audio|image/)) {
            return deref;
          }
          if (isObject(deref)) {
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
            return expand(deref, ipfs);
          }
          return reject(new Error('unexpected deref: ' + JSON.stringify(deref)));
        }).then(v => {
          return [path, v];
        })
      );
    }, promises);
    const expanded = cloneObject(obj);
    let i, inner, keys, lastKey;
    Promise.all(promises).then(results => {
      for (let i = 0; i < results.length; i++) {
        keys = results[i][0].split('/').filter(key => !!key);
        lastKey = keys.pop();
        if (!lastKey) {
          keys.pop();
          lastKey = '/';
        }
        inner = keys.reduce((result, key) => {
          return result[key];
        }, expanded);
        inner[lastKey] = results[i][1];
      }
      resolve(expanded);
    });
  });
}

function flatten(obj: Object, ipfs: Object): Promise<Object> {
  return new Promise((resolve, _) => {
    const promises = [];
    traverse(obj, (path, val, result) => {
      if (isObject(val)) {
        if (isBuffer(val.data) && val.type && val.type.match(/audio|image/)) {
          promises.push(
            ipfs.addFile(val.data).then(hash => {
              return [path, { hash }];
            })
          );
        } else if (isString(val['@type']) && isString(val['@context'])) {
          promises.push(
            flatten(val, ipfs).then(v => {
              return [path, v];
            })
          );
        }
      }
    }, promises);
    let flattened = cloneObject(obj);
    if (!promises.length) {
      return ipfs.addObject(orderObject(obj)).then(cid => {
        flattened = orderObject(flattened);
        const hash = cid.toBaseEncodedString();
        resolve({ flattened, hash });
      });
    }
    Promise.all(promises).then(results => {
      let i, inner, keys, lastKey;
      for (i = 0; i < results.length; i++) {
        keys = results[i][0].split('/');
        lastKey = keys.pop();
        inner = keys.reduce((result, key) => {
          return result[key];
        }, flattened);
        inner[lastKey] = { '/': results[i][1].hash };
      }
      flattened = orderObject(flattened);
      ipfs.addObject(flattened).then(cid => {
        const hash = cid.toBaseEncodedString();
        resolve({ flattened, hash });
      });
    });
  });
}

exports.dereference = dereference;
exports.expand = expand;
exports.flatten = flatten;
