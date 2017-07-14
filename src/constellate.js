'use strict';

const aes = require('aes-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('xhr-request');

const Fingerprint = require('../lib/fingerprint.js');
const Ipfs = require('../lib/ipfs.js');
const Swarm = require('../lib/swarm.js');

const {
    clone,
    bufferToFile,
    isArray,
    isObject,
    isString,
    order,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/constellate
 */

module.exports = function(modName: string, serverAddr: string) {
    const ipfs = new Ipfs();
    let fileHashes, files, ipld, keys, meta, metaHashes, mod;
    if (!modName || modName === 'ipfs') {
      mod = ipfs;
    } else if (modName === 'swarm') {
      mod = new Swarm();
    } else {
      throw new Error('unexpected module name: ' + modName);
    }

    //-----------------------------------------------------------------------

    this.import = (files: File[]): Promise<*> => {
      if (!files || !files.length) throw new Error('no files');
      let file = files[0];
      const type = file.type;
      if (type !== 'application/json' && type !== 'text/csv') {
        throw new Error(`expected "application/json" or "text/csv", got "${type}"`);
      }
      const names = new Array(files.length);
      const promises = new Array(files.length);
      names[0] = file.name.split('.')[0];
      promises[0] = readFileAs(file, 'text');
      for (let i = 1; i < files.length; i++) {
        file = files[i];
        if (file.type !== type) {
          throw new Error(`expected type=${type}, got ` + file.type);
        }
        names[i] = file.name.split('.')[0];
        promises[i] = readFileAs(file, 'text');
      }
      return Promise.all(promises).then(texts => {
        if (type === 'application/json') {
          meta = parseJSONs(texts, names);
        }
        if (type === 'text/csv') {
          meta = parseCSVs(texts, names);
        }
      }).then(() => {
        console.log('Imported metadata');
      });
    }
    this.generate = (files?: File[], password?: string): Promise<*> => {
      let promise = Promise.resolve();
      if (files && files.length) {
        promise = this.processFiles(files, password);
      }
      return promise.then(this.metaToIPLD).then(() => {
        console.log('Generated ipld');
      });
    }
    this.upload = (): Promise<*> => {
      return this.pushIPLD().then(() => {
        if (files && files.length) {
          return this.uploadFiles();
        }
      });
    }

    this.metaToIPLD = (): Promise<*> => {
      if (!meta || !meta.length) throw new Error('no meta');
      for (let i = 0; i < meta.length; i++) {
        const hash = meta[i]['#'];
        if (meta[i].type === 'Hash' && isString(hash)) {
          meta[i] = ipfs.get(hash).then(obj => {
            return {
              '#': hash,
              name: obj.name,
              type: obj['@type']
            };
          });
        }
      }
      ipld = [], metaHashes = {};
      return Promise.all(meta).then(meta => {
        return orderObjects(meta).reduce((result, obj) => {
          const name = obj.name;
          if (obj['#']) {
            metaHashes[name] = obj['#'];
            return result;
          }
          return result.then(() => {
            obj = transform(obj, x => {
                if (isString(x)) {
                  if (x[0] === '@') {
                    return {
                      '/': metaHashes[x.slice(1)]
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
            // obj['@context'] = 'http://schema.org/';
            // obj['@type'] = obj.type;
            // delete obj.type;
            obj.name = obj.name.match(/^(.+?)(?:\s*?\(.*?\))?$/)[1];
            obj = order(obj);
            return ipfs.hashObject(obj);
          }).then(hash => {
            metaHashes[name] = hash;
            ipld.push(obj);
            return;
          });
        }, Promise.resolve());
      });
    }
    this.encryptFiles = (_files: File[], password: string): Promise<*> => {
      const promises = _files.map(file => encrypt(file, password));
      files = new Array(_files.length);
      keys = {};
      return Promise.all(promises).then(objs => {
        for (let i = 0; i < objs.length; i++) {
          const { file, key } = objs[i];
          files[i] = file;
          keys[file.name] = key;
        }
      });
    }
    this.fingerprint = (file: File): Promise<Object> => {
      if (!serverAddr) {
        throw new Error('no server address');
      }
      const type = file.type.split('/')[0];
      if (type !== 'audio') {
        throw new Error('expected audio, got ' + type);
      }
      return readFileAs(file, 'arraybuffer').then(ab => {
        const body = Buffer.from(ab).toString('binary');
        return new Promise((resolve, reject) => {
          request(
            serverAddr + '/fingerprint',
            { body, method: 'POST' },
            (err, data, res) => {
              if (err) return reject(err);
              if (res.statusCode !== 200) {
                return reject(new Error(data));
              }
              const fp = new Fingerprint(data);
              resolve(fp);
            }
          );
        });
      });
    }
    this.processFiles = (_files: File[], password?: string): Promise<*> => {
      if (!_files || !_files.length) throw new Error('no content');
      let promise;
      if (!password) {
        promise = Promise.resolve(files = _files);
      } else {
        promise = this.encryptFiles(_files, password);
      }
      return promise.then(() => {
        return Promise.all(files.map(file => {
          return readFileAs(file, 'arraybuffer').then(ab => {
            return mod.hashFile(Buffer.from(ab));
          });
        }));
      }).then(hashes => {
        fileHashes = {};
        let type;
        for (let i = 0; i < hashes.length; i++) {
          fileHashes[files[i].name] = hashes[i];
          type = files[i].type.split('/')[0];
          type = type.charAt(0).toUpperCase() + type.slice(1) + 'Object';
          meta.push({
            contentUrl: mod.contentUrl(hashes[i]),
            name: files[i].name, type
          });
        }
      });
    }
    this.get = (str: string, key?: string): Promise<File|Object> => {
      if (mod.isFileHash(str)) {
        return mod.getFile(str).then(data => {
          if (!key) return data;
          const aesCtr = new aes.ModeOfOperation.ctr(Buffer.from(key, 'hex'));
          return aesCtr.decrypt(data);
        }).then(data => {
          return bufferToFile(data, str);
        });
      }
      return ipfs.get(str).then(val => {
        if (!isObject(val)) return val;
        return ipfs.expand(val);
      });
    }
    this.pushIPLD = (): Promise<*> => {
      if (!ipld || !ipld.length) throw new Error('no ipld');
      return ipld.reduce((result, obj) => {
        const hash = metaHashes[obj.name];
        return result.then(() => {
          return ipfs.addObject(obj);
        }).then(h => {
          if (hash !== h) {
            throw new Error(`expected hash=${hash}, got ` + h);
          }
        });
      }, Promise.resolve()).then(() => {
        console.log('Pushed IPLD');
      });
    }
    this.uploadFiles = (): Promise<*> => {
      if (!files || !files.length) throw new Error('no files');
      return Promise.all(files.map(file => {
        const hash = fileHashes[file.name];
        return readFileAs(file, 'arraybuffer').then(ab => {
          return mod.addFile(Buffer.from(ab));
        }).then(h => {
          if (hash !== h) {
            throw new Error(`expected hash=${hash}, got ` + h);
          }
        })
      })).then(() => {
        console.log('Uploaded files');
      });
    }
    this.exportFiles = (): ?File[] => {
      return !files ? null : files;
    }
    this.exportHashes = (): Object => {
      return clone({ fileHashes, metaHashes });
    }
    this.exportIPLD = (): ?Object[] => {
      return !ipld ? null : ipld;
    }
    this.exportKeys = (): ?Object => {
      return !keys ? null : keys;
    }
    this.exportMeta = (): ?Object[] => {
      return !meta ? null : meta;
    }
    this.start = (): Promise<*> => ipfs.start();
    this.stop = (): Promise<*> => ipfs.stop();
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
        readFileAs(file, 'arraybuffer').then(ab => {
          const data = aesCtr.encrypt(Buffer.from(ab));
          file = new File([data], file.name, { type: file.type });
          key = key.toString('hex');
          resolve({ file, key });
        });
      });
    });
  });
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
        // if (!obj.type) throw new Error('no type specified');
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
    if (!isArray(arr = JSON.parse(json), isObject)) {
      throw new Error('expected array of objects');
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
      if (typeof val === 'string') { //isString(val)
        csv += val;
      } else if (isArray(val, isString)) {
        csv += '"';
        for (k = 0; k < val.length; k++) {
          csv += val[k];
        }
        csv += '"';
      } else {
        throw new Error('unexpected value: ' + JSON.stringify(val));
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
