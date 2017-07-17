'use strict';

const aes = require('aes-js');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const request = require('xhr-request');

const Fingerprint = require('../lib/fingerprint.js');
const Ipfs = require('../lib/ipfs.js');
const Swarm = require('../lib/swarm.js');

const {
    Tasks,
    assign,
    bufferToFile,
    clone,
    isArray,
    isObject,
    isString,
    order,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/constellate
 */

const encrypt = (file, password, t, id) => {
    bcrypt.genSalt(10, (err, salt) => {
        if (err) return t.error(err);
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) return t.error(err);
            let key = Buffer.concat([
                Buffer.from(hash.substr(-31), 'base64'),
                crypto.randomBytes(9)
            ]).slice(0, 32);
            const aesCtr = new aes.ModeOfOperation.ctr(key);
            const [name, ext] = file.name.split('.');
            readFileAs(file, 'arraybuffer').then(ab => {
                const data = aesCtr.encrypt(Buffer.from(ab));
                file = new File([data], file.name, {
                    type: file.type
                });
                key = key.toString('hex');
                t.run({
                    file,
                    key
                });
            });
        });
    });
}

const orderObjects = (objs) => {
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

const parseCSVs = (csvs, types) => {
    if (!csvs || !csvs.length) throw new Error('no csvs');
    if (!types || !types.length) throw new Error('no types');
    if (csvs.length !== types.length) {
        throw new Error('different number of csvs and types');
    }
    let i, j, k, keys, length = 0,
        obj, v;
    const combined = csvs.reduce((result, csv, idx) => {
        obj = parseCSV(csv, types[idx]);
        keys = Object.keys(obj);
        for (i = 0; i < keys.length; i++) {
            k = keys[i];
            if (!result[k]) {
                result[k] = (Array).apply(null, {
                    length
                }).map(() => null);
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

const parseCSV = (csv, type) => {
    // adapted from https://gist.github.com/jonmaim/7b896cf5c8cfe932a3dd
    const data = {};
    const lines = csv.replace(/\r/g, '').split('\n').filter(line => !!line);
    const headers = lines[0].split(',');
    let i;
    for (i = 0; i < headers.length; i++) {
        data[headers[i]] = new Array(lines.length - 1);
    }
    data.type = (Array).apply(null, {
        length: lines.length - 1
    }).map(() => type);
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
                    data[key][i - 1] = null;
                } else {
                    vals = v.split(',');
                    if (vals.length > 1) {
                        data[key][i - 1] = vals;
                    } else {
                        data[key][i - 1] = v;
                    }
                }
                startIdx = idx + 1;
            }
            idx++;
        }
    }
    return data;
}

const parseJSONs = (jsons, types) => {
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

const toCSV = (arr) => {
    let csv = '',
        i, j, k, val;
    for (i = 0; i < arr[0].length; i++) {
        for (j = 0; j < arr.length; j++) {
            val = arr[j][i];
            if (typeof val === 'string') { // isString(val)
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

// if (modName === 'ipfs') {
//   mod = ipfs;
// } else if (modName === 'swarm') {
//   mod = new Swarm();
// } else {
//   throw new Error('unexpected module name: ' + modName);
// }

module.exports = function(repoPath = '/tmp/constellate', serverAddr = 'http://127.0.0.1:8888') {

    const ipfs = new Ipfs(repoPath);
    let fileHashes, files, ipld, keys, meta, metaHashes, names;

    //-----------------------------------------------------------------------

    const metaToIPLD = (t, id) => {
        if (!meta || !meta.length) return t.error('no meta');
        const hashes = [];
        let count = 0,
            i, names = [],
            objs;
        t.prepend((hash, i) => {
            metaHashes[names[i]] = hash;
            if (++count === ipld.length) {
                t.next();
                t.run(id);
            }
        });
        t.prepend(() => {
            ipld = [], metaHashes = {};
            objs = orderObjects(meta);
            for (i = 0; i < objs.length; i++) {
                if (objs[i]['#']) {
                    metaHashes[objs[i].name] = objs[i]['#'];
                    continue;
                }
                objs[i] = transform(objs[i], v => {
                    if (!isString(v)) return v;
                    if (v[0] === '@') {
                        return {
                            '/': metaHashes[v.slice(1)]
                        };
                    }
                    if (v[0] === '#') {
                        return {
                            '/': v.slice(1)
                        };
                    }
                });
                names.push(objs[i].name);
                objs[i].name = objs[i].name.match(/^(.+?)(?:\s*?\(.*?\))?$/)[1];
                objs[i] = order(objs[i]);
                ipld.push(objs[i]);
            }
            t.next();
            for (i = 0; i < ipld.length; i++) {
                ipfs.hashObject(ipld[i], t, i);
            }
        });
        for (i = 0; i < meta.length; i++) {
            if (meta[i].type === 'Hash' && isString(meta[i]['#'])) {
                hashes.push(meta[i]['#']);
            }
        }
        if (!hashes.length) return t.run();
        t.prepend((obj, i) => {
            objs[i] = {
                '#': hashes[i],
                name: obj.name,
                type: obj.type
            }
            if (++count !== objs.length) return;
            count = 0;
            meta.push(...objs);
            t.next();
            t.run();
        });
        objs = new Array(hashes.length);
        for (i = 0; i < hashes.length; i++) {
            ipfs.get(hashes[i], t, i);
        }
    }

    const pushIPLD = (t, id) => {
        if (!ipld || !ipld.length) {
            return t.error(new Error('no ipld'));
        }
        let count = 0,
            i;
        t.prepend((hash, i) => {
            if (hash !== metaHashes[names[i]]) {
                return t.error(new Error(`expected hash=${metaHashes[names[i]]}, got ` + hash));
            }
            if (++count !== ipld.length) return;
            console.log('Pushed IPLD');
            t.next();
            t.run(id);
        });
        for (i = 0; i < ipld.length; i++) {
            ipfs.addObject(ipld[i], t, i);
        }
    }

    const uploadFiles = (t, id) => {
        if (!files || !files.length) {
            return t.error(new Error('no files'));
        }
        const datas = new Array(files.length);
        let count = 0,
            i;
        t.prepend((hash, i) => {
            if (hash !== fileHashes[files[i].name]) {
                return t.error(`expected hash=${fileHashes[files[i].name]}, got ` + hash);
            }
            if (++count !== files.length) return;
            console.log('Uploaded files');
            t.next();
            t.run(id);
        });
        t.prepend((ab, i) => {
            datas[i] = Buffer.from(ab);
            if (++count !== files.length) return;
            count = 0;
            t.next();
            for (i = 0; i < datas.length; i++) {
                ipfs.addFile(datas[i], t, i);
            }
        });
        for (i = 0; i < files.length; i++) {
            readFileAs(files[i], 'arraybuffer', t, i);
        }
    }

    //-----------------------------------------------------------------------

    this.exportHashes = () => {
        return clone({
            fileHashes,
            metaHashes
        });
    }

    this.exportIPLD = () => {
        return !ipld ? null : ipld;
    }

    this.exportKeys = () => {
        return !keys ? null : keys;
    }

    this.exportMeta = () => {
        return !meta ? null : meta;
    }

    this.exportFiles = () => {
        return !files ? null : files;
    }

    this.fingerprint = (file, t, id) => {
        if (!serverAddr) {
            return t.error(new Error('no server address'));
        }
        const type = file.type.split('/')[0];
        if (type !== 'audio') {
            return t.error(new Error('expected audio, got ' + type));
        }
        return readFileAs(file, 'arraybuffer').then(ab => {
            const body = Buffer.from(ab).toString('binary');
            request(
                serverAddr + '/fingerprint', {
                    body,
                    method: 'POST'
                },
                (err, data, res) => {
                    if (err) return t.error(err);
                    if (res.statusCode !== 200) {
                        return t.error(new Error(data));
                    }
                    const fp = new Fingerprint(data);
                    t.next();
                    t.run(fp, id);
                }
            );
        });
    }

    this.get = (query, key, t, id) => {
        t.prepend(obj => {
            t.next();
            t.run(obj, id);
        });
        if (!ipfs.isFileHash(query)) {
            t.prepend(obj => {
                t.next();
                this.expand(obj, t);
            });
            return ipfs.get(query, t);
        }
        t.prepend(data => {
            if (key) {
                const aesCtr = new aes.ModeOfOperation.ctr(Buffer.from(key, 'hex'));
                data = aesCtr.decrypt(data);
            }
            t.next();
            t.run(bufferToFile(data, query), id);
        });
        return ipfs.getFile(query, t);
    }

    this.importContent = (_files, password, t, id) => {
        if (!_files || !_files.length) {
            return t.error(new Error('no files'));
        }
        files = _files;
        const datas = new Array(files.length);
        let count = 0,
            i;
        t.prepend((hash, i) => {
            fileHashes[files[i].name] = hash;
            meta.push({
                contentUrl: ipfs.contentUrl(hash),
                name: files[i].name
            });
            if (++count !== files.length) return;
            console.log('Imported content');
            t.next();
            t.run(id);
        });
        t.prepend((ab, i) => {
            datas[i] = Buffer.from(ab);
            if (++count !== datas.length) return;
            count = 0;
            t.next();
            for (i = 0; i < datas.length; i++) {
                ipfs.hashFile(datas[i], t, i);
            }
        });
        t.prepend(() => {
            t.next();
            for (i = 0; i < files.length; i++) {
                readFileAs(files[i], 'arraybuffer', t, i);
            }
        });
        if (!password) return t.run();
        t.prepend((obj, i) => {
            files[i] = obj.file;
            keys[files[i].name] = obj.key;
            if (++count !== files.length) return;
            count = 0;
            t.next();
            t.run();
        });
        keys = {};
        for (i = 0; i < files.length; i++) {
            encrypt(files[i], password, t, i);
        }
    }

    this.importMeta = (files, t, id) => {
        if (!files || !files.length) {
            return t.error(new Error('no files'));
        }
        const type = files[0].type;
        if (type !== 'application/json' && type !== 'text/csv') {
            return t.error(new Error(`expected "application/json" or "text/csv", got "${type}"`));
        }
        const names = new Array(files.length);
        const texts = new Array(files.length);
        let count = 0,
            i;
        t.prepend((text, i) => {
            texts[i] = text;
            if (++count !== texts.length) return;
            if (type === 'application/json') {
                meta = parseJSONs(texts, names);
            }
            if (type === 'text/csv') {
                meta = parseCSVs(texts, names);
            }
            console.log('Imported metadata');
            t.next();
            t.run(id);
        });
        names[0] = files[0].name.split('.')[0];
        readFileAs(files[0], 'text', t, 0);
        for (i = 1; i < files.length; i++) {
            if (files[i].type !== type) {
                return t.error(new Error(`expected type=${type}, got ` + files[i].type));
            }
            names[i] = files[i].name.split('.')[0];
            readFileAs(files[i], 'text', t, i);
        }
    }

    this.start = ipfs.start;

    this.stop = ipfs.stop;

    this.upload = (t, id) => {
        t.prepend(() => {
            t.next();
            t.run(id);
        });
        if (files && files.length) {
            t.prepend(() => {
                t.next();
                uploadFiles(t);
            });
        }
        pushIPLD(t);
    }
}