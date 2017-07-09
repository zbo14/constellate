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
    isObject,
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

module.exports = function(modName: string, serverAddr: string) {
    const ipfs = new Ipfs();
    let mod, proj;
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
      if (!serverAddr) {
        throw new Error('no server address');
      }
      let data;
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
    this.newProject = (title: string): Object => {
      return (proj = new Project(title));
    }
    this.upload = (content: File[], ipld: File[]): Promise<File> => {
      if (!content || !content.length) throw new Error('no content');
      if (!ipld || !ipld.length) throw new Error('no ipld');
      const promises = new Array(content.length);
      for (let i = 0; i < content.length; i++) {
        promises[i] = readFileAs(content[i], 'arraybuffer').then(ab => {
          return mod.addFile(Buffer.from(ab));
        });
      }
      const hashes = {};
      let name;
      return Promise.all(promises).then(() => {
        return readFileAs(ipld[0], 'text');
      }).then(data => {
        const arr = JSON.parse(data);
        if (!isArray(arr, isObject)) {
          throw new Error('expected array of objects');
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
      promises[i] = readFileAs(file, 'arraybuffer').then(ab => {
        return mod.hashFile(Buffer.from(ab));
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
            return ipfs.hashObject(obj);
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

//---------------------------------------------------------------------------

function Project(title: string) {
  let sheets = [];
  this.newSheet = (type: string) => {
    if (sheets.every(sheet => sheet.getType() !== type)) {
      sheets.push(new Sheet(type));
    }
  }
  this.fromHTML = (html: string) => {
    let match = html.match(/^<div class="project"><h1 class="title">([A-Za-z0-9]+?)<\/h1>(.+?)<\/div>$/);
    if (!match || match.length !== 3) {
      throw new Error('Invalid html, could not match type');
    }
    const sheetz = [];
    const _title = match[1];
    html = match[2];
    let sheet;
    while(html) {
      sheet = new Sheet();
      html = sheet.fromHTML(html);
      sheetz.push(sheet);
    }
    sheets = sheetz;
    title = _title;
  }
  this.toHTML = (): string => {
    return sheets.reduce((result, sheet) => {
      return result + sheet.toHTML();
    }, `<div class="project"><h1 class="title">${title}</h1>`) + '</div>';
  }
  this.fromObjects = (objs: Object[]) => {
    if (!isArray(objs, isObject)) {
      throw new Error('expected array of objects');
    }
    const byType = {};
    let i, t;
    for (i = 0; i < objs.length; i++) {
      t = objs[i].type;
      if (!byType[t]) byType[t] = [];
      byType[t].push(objs[i]);
    }
    let sheet;
    sheets = Object.keys(byType).reduce((result, t) => {
      sheet = new Sheet();
      sheet.fromObjects(byType[t]);
      return result.concat(sheet);
    }, []);
  }
  this.toObjects = (): Object[] => {
    if (!title) throw new Error('no title');
    return sheets.reduce((result, sheet) => {
      return result.concat(sheet.toObjects());
    }, []);
  }
  this.getSheet = (type: string): Object => {
    for (let i = 0; i < sheets.length; i++) {
      if (sheets[i].getType() === type) {
        return sheets[i];
      }
    }
    throw new Error('no sheet with type=' + type);
  }
  this.getTitle = (): string => {
    if (!title) throw new Error('no title');
    return title;
  }
}

function Sheet(type?: string) {
  let cols = [], rows = [];
  this.addColumn = (col: string) => {
    if (!isString(col)) {
      throw new Error('expected string');
    }
    if (cols.includes(col)) return;
    rows = rows.reduce((result, row) => {
      return result.concat([row.concat('')]);
    }, []);
    cols.push(col);
  }
  this.addRow = (...row: string[]) => {
    if (!isArray(row, isString)) {
      throw new Error('expected array of strings');
    }
    if (row.length !== cols.length) {
      throw new Error('invalid row length');
    }
    rows.push(row);
  }
  this.fromHTML = (html: string): string => {
    let match = html.match(/^<div class="sheet">(.+?)$/);
    if (!match || match.length !== 2) {
      throw new Error('Invalid html, could not match sheet');
    }
    html = match[1];
    match = html.match(/^<h2 class="type">([A-Za-z0-9]+?)<\/h2>(.+?)$/);
    if (!match || match.length !== 3) {
      throw new Error('Invalid html, could not match type');
    }
    const _type = match[1];
    html = match[2];
    match = html.match(/^(<div class="columns">(?:<h2 class="column">[A-Za-z0-9]+?<\/h2>)+?<\/div>)(.+?)$/);
    if (!match || match.length !== 3) {
      throw new Error('Invalid html, could not match columns');
    }
    const colz = getSubMatches(/<h2 class="column">(.+?)<\/h2>/, match[1]);
    html = match[2];
    match = new RegExp(
      `^(<div class="rows">(?:<div class="row">(?:<input class="cell" type="text" value="[A-Za-z0-9@#\/\:\.;, _-]*?" \/>){${colz.length}}<\/div>)+?<\/div>)<\/div>(.*?)$`
    ).exec(html);
    if (!match || match.length !== 3) {
      throw new Error('Invalid html, could not match rows');
    }
    html = match[2] !== '</div>' ? match[2] : '';
    const rowz = getSubMatches(/<div class="row">(.+?)<\/div>/, match[1]).reduce((result, row) => {
      return result.concat([getSubMatches(/value="(.*?)"/, row)]);
    }, []);
    cols = colz;
    rows = rowz;
    type = _type;
    return html;
  }
  this.toHTML = (): string => {
    if (!type) throw new Error('no type');
    return [
      '<div class="sheet">',
      `<h2 class="type">${type}</h2>`,
      '<div class="columns">' + cols.map(col => {
        return `<h2 class="column">${col}</h2>`;
      }).join('') + '</div>',
      '<div class="rows">',
      ...rows.map(row => {
        return '<div class="row">' + row.map(val => {
          if (!val) return '<input class="cell" type="text" value="" />';
          return `<input class="cell" type="text" value="${val}" />`;
        }).join('') + '</div>';
      }),
      '</div>',
      '</div>',
    ].join('');
  }
  this.fromObjects = (objs: Object[]) => {
    if (!isArray(objs, isObject)) {
      throw new Error('expected array of objects');
    }
    let obj = objs[0];
    const _type = obj.type;
    if (!_type) throw new Error('no type');
    delete obj.type;
    let colz = Object.keys(obj);
    let i;
    for (i = 1; i < objs.length; i++) {
      obj = objs[i];
      if (obj.type !== _type) {
        throw new Error(`expected type=${_type}, got ` + obj.type);
      }
      delete obj.type;
      colz = Array.from(new Set(colz.concat(Object.keys(obj))));
    }
    const rowz = new Array(objs.length);
    for (i = 0; i < objs.length; i++) {
      obj = objs[i];
      rowz[i] = colz.reduce((result, col) => {
        if (!obj[col]) return result.concat('');
        return result.concat(obj[col]);
      }, []);
    }
    cols = colz;
    rows = rowz;
    type = _type;
  }
  this.toObjects = (): Object[] => {
    if (!type) throw new Error('no type');
    return rows.reduce((result, row) => {
      return result.concat(cols.reduce((result, col, idx) => {
        if (!row[idx]) return result;
        return Object.assign(result, { [col]: row[idx] });
      }, { type }));
    }, []);
  }
  this.getType = (): string => {
    if (!type) throw new Error('no type');
    return type;
  }
}

function getSubMatches(regex: RegExp, str: string): string[] {
  const subMatches = [];
  let match;
  while(true) {
    match = regex.exec(str);
    if (!match) break;
    subMatches.push(match[1]);
    str = str.substr(match.index + match[0].length);
  }
  return subMatches;
}
