'use strict';

const CID = require('cids');
const IpfsNode = require('../lib/ipfs-node.js');
const Ipld = require('../lib/ipld.js');

const {
    isArray,
    isString,
    orderObject,
    readFileAs,
    transform,
    traverse
} = require('../lib/util.js');

//      

/**
 * @module constellate/src/constellate
 */

module.exports = function() {
    const ipfs = new IpfsNode();
    const ipld = new Ipld(ipfs);
    this.generate = (content, metadata, name) => {
        if (!content || !content.length) throw new Error('no content');
        if (!metadata || !metadata.length) throw new Error('no metadata');
        const format = metadata[0].type.split('/')[1];
        return this.processContent(content, format).then(file => {
            return this.processMetadata([...Array.from(metadata), file], name);
        });
    }
    this.get = (hash) => {
        const cid = new CID(hash);
        return ipld.dereference(cid).then(obj => {
            if (cid.codec === 'dag-cbor') {
                return ipld.expand(obj);
            }
            const ext = obj.type.split('/').pop();
            return new File(
                [obj.data],
                hash + '.' + ext, {
                    type: obj.type
                }
            );
        });
    }
    this.upload = (content, ipld) => {
        if (!content || !content.length) throw new Error('no content');
        if (!ipld || !ipld.length) throw new Error('no ipld');
        const promises = new Array(content.length);
        for (let i = 0; i < content.length; i++) {
            promises[i] = readFileAs(content[i], 'array-buffer').then(ab => {
                const buf = Buffer.from(ab);
                return ipfs.addFile(buf);
            });
        }
        let hashes, name;
        return Promise.all(promises).then(multihashes => {
            console.log(JSON.stringify(multihashes, null, 2));
            hashes = multihashes.reduce((result, multihash, idx) => {
                if (!(name = content[idx].name)) throw new Error('no name');
                return Object.assign(result, {
                    [name]: multihash
                });
            }, {});
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
                }).then(cid => {
                    hashes[name] = cid.toBaseEncodedString();
                });
            }, Promise.resolve());
        }).then(() => {
            name = ipld[0].name.split('.')[0] + '_hashes.json';
            return new File(
                [JSON.stringify(hashes, null, 2)],
                name, {
                    type: 'application/json'
                }
            );
        });
    }
    this.processContent = _processContent(ipfs);
    this.processMetadata = _processMetadata(ipfs);
    this.start = () => ipfs.start();
    this.stop = () => ipfs.stop();
    // for testing..
    this.ipldFromCSVs = (csvs, types) => {
        const objs = parseCSVs(csvs, types);
        return ipldFromObjects(ipfs, objs);
    }
    this.ipldFromJSONs = (jsons, types) => {
        const objs = parseJSONs(jsons, types);
        return ipldFromObjects(ipfs, objs);
    }
}

function _processContent(ipfs) {
    return (files, format) => {
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
                filename = filetype.charAt(0).toUpperCase() + filetype.slice(1) + '.' + format;
            }
            if (filetype !== file.type.split('/')[0]) {
                throw new Error(`expected ${filetype}, got ` + file.type.split('/')[0]);
            }
            promises[i] = readFileAs(file, 'array-buffer').then(ab => {
                const buf = Buffer.from(ab);
                return ipfs.multihash(buf);
            });
        }
        return Promise.all(promises).then(multihashes => {
            let data, type;
            if (format === 'csv') {
                const file = new Array(files.length);
                const name = new Array(files.length);
                file[0] = 'file';
                name[0] = 'name';
                for (i = 0; i < multihashes.length; i++) {
                    file[i + 1] = '#' + multihashes[i];
                    name[i + 1] = files[i].name;
                }
                data = toCSV([file, name]);
                type = 'text/csv';
            }
            if (format === 'json') {
                data = JSON.stringify(multihashes.reduce((result, multihash, idx) => {
                    return result.concat({
                        file: '#' + multihash,
                        name: files[idx].name
                    });
                }, []), null, 2);
                type = 'application/json';
            }
            return new File([data], filename, {
                type
            });
        });
    }
}

function _processMetadata(ipfs) {
    return (files, name) => {
        if (!files.length) throw new Error('no files');
        const datas = new Array(files.length);
        const types = new Array(files.length);
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
            return ipldFromObjects(ipfs, objs);
        }).then(ipld => {
            return new File(
                [JSON.stringify(ipld, null, 2)],
                name + '.ipld', {
                    type: 'application/json'
                }
            );
        });
    }
}

function ipldFromObjects(ipfs, objs) {
    return new Promise((resolve, _) => {
        const hashes = {};
        const ipld = [];
        orderObjects(objs).reduce((result, obj) => {
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
                            }
                        }
                    }
                    return x;
                });
                obj['@context'] = 'http://coalaip.org';
                obj['@type'] = obj.type;
                delete obj.type;
                return ipfs.addObject(obj);
            }).then(cid => {
                hashes[obj.name] = cid.toBaseEncodedString();
                ipld.push(orderObject(obj));
            });
        }, Promise.resolve()).then(() => {
            resolve(ipld);
        });
    });
}

function orderObjects(objs) {
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

function parseCSVs(csvs, types) {
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

function parseCSV(csv, type) {
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

function parseJSONs(jsons, types) {
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
        if (types) {
            for (i = 0; i < arr.length; i++) {
                arr[i].type = types[idx];
            }
        }
        return result.concat(arr);
    }, []);
}

function toCSV(arr) {
    let csv = '',
        i, j, k, val;
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