'use strict';

const IpfsNode = require('../lib/ipfs-node.js');
const Schema = require('../lib/schema.js');

const {
    isArray,
    isString,
    orderObject,
    transform,
    traverse
} = require('../lib/gen-util.js');

// @flow

/**
 * @module constellate/src/translate
 */

module.exports = function() {
    const ipfs = new IpfsNode();
    this.fromCSV = (csv: string): Promise < Object[] > => {
        // from https://gist.github.com/jonmaim/7b896cf5c8cfe932a3dd
        const lines = csv.split('\n');
        const headers = lines[0].split(',');
        const objs = [];
        let idx, queryIdx, startIdx;
        let c, key, length, obj, row, v, vals;
        for (let i = 1; i < lines.length; i++) {
            idx = 0, queryIdx = 0, startIdx = 0;
            obj = {}, row = lines[i];
            if (!row.trim()) continue;
            while (idx < row.length) {
                c = row[idx];
                if (c === '"') {
                    while (idx < row.length - 1) {
                        c = row[++idx];
                        if (c === '"') break;
                    }
                }
                if (c === ',' || idx + 1 === row.length) {
                    length = idx - startIdx;
                    if (idx + 1 === row.length) length++;
                    v = row.substr(startIdx, length).replace(/\,\s/g, ',').trim();
                    if (v[0] === '"') {
                        v = v.substr(1);
                    }
                    if (v.substr(-1) === ',' || v.substr(-1) === '"') {
                        v = v.substr(0, v.length - 1);
                    }
                    key = headers[queryIdx++];
                    if (v) {
                        vals = v.split(',');
                        if (vals.length > 1) obj[key] = vals;
                        else obj[key] = v;
                    }
                    startIdx = idx + 1;
                }
                idx++;
            }
            objs.push(obj);
        }
        return ipldFromObjects(ipfs, objs);
    }
    this.fromJSON = (json: string): Promise < Object[] > => {
        const objs = JSON.parse(json);
        if (!isArray(objs)) throw new Error('expected JSON array');
        return ipldFromObjects(ipfs, objs);
    }
    this.start = (): Promise < * > => ipfs.start();
    this.stop = (): Promise < * > => ipfs.stop();
}

function ipldFromObjects(ipfs: Object, objs: Object[]): Promise < Object[] > {
    return new Promise((resolve, _) => {
        const hashes = {};
        const ipld = [];
        // schema
        orderObjects(objs).reduce((result, obj) => {
            return result.then(() => {
                obj = transform(obj, x => {
                    if (isString(x) && x[0] === '#') {
                        return {
                            '/': hashes[x.slice(1)]
                        };
                    }
                    return x;
                });
                obj['@context'] = getContext(obj.type);
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

function orderObjects(objs: Object[]): Object[] {
    if (!objs.length) throw new Error('no objects');
    const ordered = [];
    let queue = [];
    let obj, name, next;
    while (objs.length) {
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
            if (isString(val) && val[0] === '#') {
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

function getContext(type: string): string | string[] {
    switch (type) {
        case 'Account':
        case 'Block':
        case 'ContractAccount':
        case 'ExternalAccount':
        case 'Tx':
            return 'http://ethon.consensys.net/';
        case 'Copyright':
        case 'DigitalFingerprint':
        case 'ReviewAction':
        case 'Right':
        case 'RightsTransferAction':
            return [
                'http://coalaip.org/',
                'http://schema.org/'
            ];
        case 'Thing':
        case 'Action':
        case 'CreativeWork':
        case 'Intangible':
        case 'Organization':
        case 'Person':
        case 'MediaObject':
        case 'MusicComposition':
        case 'MusicPlaylist':
        case 'MusicRecording':
        case 'AudioObject':
        case 'ImageObject':
        case 'MusicAlbum':
        case 'MusicRecording':
        case 'MusicGroup':
        case 'TransferAction':
            return 'http://schema.org/';
        default:
            throw new Error('unexpected type:', type);
    }
}
