'use strict';

const aes = require('aes-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('xhr-request');

const Fingerprint = require('../lib/fingerprint.js');
const Ipfs = require('../lib/ipfs.js');
const Swarm = require('../lib/swarm.js');

const {
    bufferToFile,
    isArray,
    isString,
    orderObject,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/constellate
 */

module.exports = function(modName: string, serverUrl?: string) {
    const ipfs = new Ipfs();
    let mod;
    if (!modName || modName === 'ipfs') {
      mod = ipfs;
    } else if (modName === 'swarm') {
      mod = new Swarm();
    } else {
      throw new Error('unexpected module name: ' + modName);
    }
    const processContent = _processContent(mod);
    const processMetadata = _processMetadata(ipfs);
    this.fingerprint = (file: File): Promise<string> => {
      if (!serverUrl) {
        throw new Error('no url for fingerprint server');
      }
      let data;
      return readFileAs(file, 'arraybuffer').then(ab => {
        const body = Buffer.from(ab).toString('binary');
        return new Promise((resolve, reject) => {
          request(
            serverUrl + '/fingerprint',
            { body, method: 'POST' },
            (err, data, res) => {
              if (err) return reject(err);
              if (res.statusCode !== 200) {
                return reject(new Error(data));
              }
              resolve(data);
            }
          );
        });
      });
    }
    this.generate = (content: File[], metadata: File[], name: string, password?: string): Promise<File|Object> => {
      if (!content || !content.length) throw new Error('no content');
      if (!metadata || !metadata.length) throw new Error('no metadata');
      const format = metadata[0].type.split('/')[1];
      if (!password) {
        return processContent(content, format).then(file => {
          return processMetadata(metadata.concat(file), name);
        });
      } else {
        const encrypted = new Array(content.length);
        const keysObj = {};
        const promises = new Array(content.length);
        let i;
        for (i = 0; i < content.length; i++) {
          promises[i] = encrypt(content[i], password);
        }
        return Promise.all(promises).then(objs => {
          for (i = 0; i < objs.length; i++) {
            const { file, key } = objs[i];
            encrypted[i] = file;
            keysObj[file.name] = key;
          }
          const keys = new File([JSON.stringify(keysObj, null, 2)], name + '_keys.json', { type: 'application/json' });
          return processContent(encrypted, format).then(file => {
            return processMetadata(metadata.concat(file), name);
          }).then(ipld => {
            return { encrypted, ipld, keys };
          })
        });
      }
    }
    this.get = (hash: string, key?: string): Promise<File|Object> => {
      if (mod.isFileHash(hash)) {
        return mod.getFile(hash).then(data => {
          if (!key) return data;
          const aesCtr = new aes.ModeOfOperation.ctr(Buffer.from(key, 'hex'));
          return aesCtr.decrypt(data);
        }).then(data => {
          return bufferToFile(data, hash);
        });
      }
      if (ipfs.isObjectHash(hash)) {
        return ipfs.getObject(hash).then(ipfs.expand);
      }
      throw new Error('Invalid hash: ' + hash);
    }
    this.match = (encoded1: Object, encoded2: Object): Object => {
      const fp1 = new Fingerprint(encoded1);
      const fp2 = new Fingerprint(encoded2);
      return fp1.match(fp2);
    }
    this.upload = (content: File[], ipld: File[]): Promise<File> => {
      if (!content || !content.length) throw new Error('no content');
      if (!ipld || !ipld.length) throw new Error('no ipld');
      const promises = new Array(content.length);
      for (let i = 0; i < content.length; i++) {
        promises[i] = readFileAs(content[i], 'array-buffer').then(ab => {
          return mod.addFile(Buffer.from(ab));
        });
      }
      const hashes = {};
      let name;
      return Promise.all(promises).then(() => {
        return readFileAs(ipld[0], 'text');
      }).then(data => {
        const arr = JSON.parse(data);
        if (!isArray(arr)) {
          throw new Error('expected array');
        }
        return arr.reduce((result, obj) => {
          return result.then(() => {
            if (!(name = obj.name)) throw new Error('no name');
            return ipfs.addObject(obj);
          }).then(hash => {
            hashes[name] = hash;
          });
        }, Promise.resolve());
      }).then(() => {
        name = ipld[0].name.split('.')[0] + '_hashes.json';
        return new File(
          [JSON.stringify(hashes, null, 2)],
          name, { type: 'application/json' }
        );
      });
    }
    this.start = (): Promise<*> => ipfs.start();
    this.stop = (): Promise<*> => ipfs.stop();
    // for testing..
    const ipldFromObjects = _ipldFromObjects(ipfs);
    this.ipldFromCSVs = (csvs: string[], types: string[]): Promise<Object[]> => {
      const objs = parseCSVs(csvs, types);
      return ipldFromObjects(objs);
    }
    this.ipldFromJSONs = (jsons: string[], types: string[]): Promise<Object[]> => {
      const objs = parseJSONs(jsons, types);
      return ipldFromObjects(objs);
    }
}

function encrypt(file: File, password: string): Promise<Object> {
  return new Promise((resolve, reject) => {
    bcrypt.genSalt(10, (err, salt) => {
      if (err) return reject(err);
      bcrypt.hash(password, salt, (err, hash) => {
        if (err) return reject(err);
        let key = Buffer.concat([
          Buffer.from(hash.substr(-31), 'base64'),
          crypto.randomBytes(9)
        ]).slice(0, 32);
        const aesCtr = new aes.ModeOfOperation.ctr(key);
        const [name, ext] = file.name.split('.');
        readFileAs(file, 'array-buffer').then(ab => {
          const data = aesCtr.encrypt(Buffer.from(ab));
          file = new File([data], file.name, { type: file.type });
          key = key.toString('hex');
          resolve({ file, key });
        });
      });
    });
  });
}

function _processContent(mod: Object) {
  return (files: File[], format: string): Promise<File> => {
    if (format !== 'csv' && format !== 'json') {
      throw new Error('expected csv or json, got format=' + format);
    }
    const promises = new Array(files.length);
    let i, file, filename, filetype;
    for (i = 0; i < files.length; i++) {
      file = files[i];
      if (!filetype) {
        filetype = file.type.split('/')[0];
        if (!filetype) {
          throw new Error('could not get file type');
        }
        if (filetype !== 'audio' && filetype !== 'image') {
          throw new Error('expected audio or image, got ' + filetype);
        }
        filename = filetype.charAt(0).toUpperCase() + filetype.slice(1) + 'Object.' + format;
      }
      if (filetype !== file.type.split('/')[0]) {
        throw new Error(`expected ${filetype}, got ` + file.type.split('/')[0]);
      }
      promises[i] = readFileAs(file, 'array-buffer').then(ab => {
        return mod.hash(Buffer.from(ab));
      });
    }
    return Promise.all(promises).then(hashes => {
      let data, type;
      if (format === 'csv') {
        const contentUrl = new Array(files.length + 1);
        const name = new Array(files.length + 1);
        contentUrl[0] = 'contentUrl';
        name[0] = 'name';
        for (i = 0; i < hashes.length; i++) {
          contentUrl[i+1] = mod.contentUrl(hashes[i]);
          name[i+1] = files[i].name;
        }
        data = toCSV([contentUrl, name]);
        type = 'text/csv';
      }
      if (format === 'json') {
        data = JSON.stringify(hashes.reduce((result, hash, idx) => {
          return result.concat({
            contentUrl: mod.contentUrl(hash),
            name: files[idx].name
          });
        }, []), null, 2);
        type = 'application/json';
      }
      return new File([data], filename, { type });
    });
  }
}

function _processMetadata(ipfs: Object) {
  return (files: File[], name: string): Promise<File> => {
    if (!files.length) throw new Error('no files');
    const datas = new Array(files.length);
    const types = new Array(files.length);
    const ipldFromObjects = _ipldFromObjects(ipfs);
    let filetype;
    return files.reduce((result, file, i) => {
      return result.then(() => {
        if (!filetype) {
          if (file.type !== 'text/csv' && file.type !== 'application/json') {
            throw new Error(`expected "text/csv" or "application/json", got "${file.type}"`);
          }
          filetype = file.type;
        }
        if (file.type !== filetype) {
          throw new Error(`expected "${filetype}", got "${file.type}"`);
        }
        return readFileAs(file, 'text');
      }).then(data => {
        datas[i] = data;
        types[i] = file.name.split('.')[0];
      });
    }, Promise.resolve()).then(() => {
      if (filetype === 'text/csv') {
        return parseCSVs(datas, types);
      }
      return parseJSONs(datas, types);
    }).then(objs => {
      return ipldFromObjects(objs);
    }).then(ipld => {
      return new File(
        [JSON.stringify(ipld, null, 2)],
        name + '.ipld',
        { type: 'application/json' }
      );
    });
  }
}

function _ipldFromObjects(ipfs: Object): Function {
  return (objs: Object[]): Promise<Object[]> => {
      for (let i = 0; i < objs.length; i++) {
        const hash = objs[i]['#'];
        if (objs[i].type === 'Hash' && isString(hash)) {
          objs[i] = ipfs.getObject(hash).then(obj => {
            return {
              '#': hash,
              name: obj.name,
              type: obj['@type']
            };
          });
        }
      }
      const hashes = {};
      const ipld = [];
      return Promise.all(objs).then(objs => {
        return orderObjects(objs).reduce((result, obj) => {
          if (obj['#']) {
            hashes[obj.name] = obj['#'];
            return result;
          }
          return result.then(() => {
            obj = transform(obj, x => {
                if (isString(x)) {
                  if (x[0] === '@') {
                    return {
                      '/': hashes[x.slice(1)]
                    };
                  }
                  if (x[0] === '#') {
                    return {
                      '/': x.slice(1)
                    };
                  }
                }
                return x;
            });
            obj['@context'] = 'http://coalaip.org';
            obj['@type'] = obj.type;
            delete obj.type;
            return ipfs.addObject(obj);
          }).then(hash => {
            hashes[obj.name] = hash;
            ipld.push(orderObject(obj));
          });
      }, Promise.resolve());
    }).then(() => {
      return ipld;
    });
  }
}

function orderObjects(objs: Object[]): Object[] {
    const length = objs.length;
    if (!length) throw new Error('no objects');
    const ordered = [];
    let queue = [];
    let obj, name, next;
    while (ordered.length !== length) {
        if (next) {
            const idx = objs.findIndex(obj => obj.name === next);
            if (idx < 0) throw new Error(`could not find "${next}"`);
            obj = objs.splice(idx, 1)[0];
        } else {
            obj = objs.shift();
        }
        if (!obj.name) throw new Error('no name specified');
        if (!obj.type) throw new Error('no type specified');
        next = '';
        traverse(obj, (_, val) => {
            if (isString(val) && val[0] === '@') {
                name = val.slice(1);
                if (!next && ordered.every(obj => obj.name !== name)) {
                    if (queue.includes(name)) {
                        throw new Error(`circular reference between "${name}" and "${obj.name}"`);
                    }
                    objs.push(obj);
                    next = name;
                    queue.push(obj.name);
                }
            }
        });
        if (next) continue;
        ordered.push(obj);
        queue = [];
    }
    return ordered;
}

function parseCSVs(csvs: string[], types: string[]): Object[] {
  if (!csvs || !csvs.length) throw new Error('no csvs');
  if (!types || !types.length) throw new Error('no types');
  if (csvs.length !== types.length) {
    throw new Error('different number of csvs and types');
  }
  let i, j, k, keys, length = 0, obj, v;
  const combined = csvs.reduce((result, csv, idx) => {
    obj = parseCSV(csv, types[idx]);
    keys = Object.keys(obj);
    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      if (!result[k]) {
        result[k] = (Array : any).apply(null, { length }).map(() => null);
      }
      result[k] = result[k].concat(obj[k]);
    }
    length += obj[k].length;
    return result;
  }, {});
  const objs = new Array(combined['name'].length);
  keys = Object.keys(combined);
  for (i = 0; i < objs.length; i++) {
    obj = {};
    for (j = 0; j < keys.length; j++) {
      k = keys[j];
      v = combined[k][i];
      if (v) obj[k] = v;
    }
    objs[i] = obj;
  }
  return objs;
}

function parseCSV(csv: string, type: string): Object {
  // adapted from https://gist.github.com/jonmaim/7b896cf5c8cfe932a3dd
  const data = {};
  const lines = csv.replace(/\r/g, '').split('\n').filter(line => !!line);
  const headers = lines[0].split(',');
  let i;
  for (i = 0; i < headers.length; i++) {
    data[headers[i]] = new Array(lines.length-1);
  }
  data.type = (Array : any).apply(null, { length: lines.length - 1 }).map(() => type);
  let idx, queryIdx, startIdx;
  let key, length, obj, row, v, vals;
  for (i = 1; i < lines.length; i++) {
    idx = 0, queryIdx = 0, startIdx = 0;
    obj = {}, row = lines[i];
    if (!row.trim()) continue;
    while (idx < row.length) {
        if (row[idx] === '"') {
            while (idx < row.length - 1) {
                if (row[++idx] === '"') break;
            }
        }
        if (row[idx] === ',' || idx + 1 === row.length) {
            length = idx - startIdx;
            if (idx + 1 === row.length) length++;
            v = row.substr(startIdx, length).replace(/\,\s+/g, ',').trim();
            if (v[0] === '"') {
                v = v.substr(1);
            }
            if (v.substr(-1) === ',' || v.substr(-1) === '"') {
                v = v.substr(0, v.length - 1);
            }
            const key = headers[queryIdx++];
            if (!v) {
              data[key][i-1]= null;
            } else {
              vals = v.split(',');
              if (vals.length > 1) {
                data[key][i-1] = vals;
              } else {
                data[key][i-1] = v;
              }
            }
            startIdx = idx + 1;
        }
        idx++;
    }
  }
  return data;
}

function parseJSONs(jsons: string[], types: string[]): Object[] {
  if (!jsons || !jsons.length) throw new Error('no jsons');
  if (!types || !types.length) throw new Error('no types');
  if (jsons.length !== types.length) {
    throw new Error('different number of jsons and types');
  }
  let arr, i;
  return jsons.reduce((result, json, idx) => {
    if (!isArray(arr = JSON.parse(json))) {
      throw new Error('expected array');
    }
    for (i = 0; i < arr.length; i++) {
      arr[i].type = types[idx];
    }
    return result.concat(arr);
  }, []);
}

function toCSV(arr: Array<Array<string|string[]>>): string {
  let csv = '', i, j, k, val;
  for (i = 0; i < arr[0].length; i++) {
    for (j = 0; j < arr.length; j++) {
      val = arr[j][i];
      if (typeof val === 'string') {
        csv += val;
      } else if (Array.isArray(val)) {
        csv += '"';
        for (k = 0; k < val.length; k++) {
          if (typeof val[k] === 'string') {
            csv += val[k];
          } else {
            throw new Error('unexpected type: ' + typeof val);
          }
        }
        csv += '"';
      } else {
        throw new Error('unexpected type: ' + typeof val);
      }
      if (j === arr.length - 1) {
        csv += '\n';
      } else {
        csv += ',';
      }
    }
  }
  return csv;
}

//---------------------------------------------------------------------------
