const CID = require('cids');
const Schema = require('../lib/schema.js');

const {
    cloneObject,
    isObject,
    isString,
    transform,
    traverse
} = require('../lib/gen-util.js');

const {
    getTypesForProperty,
    isAncestorType
} = require('../lib/ontology.js');

const {
    Link
} = require('../lib/schema-util.js');

//      

/**
 * @module constellate/src/linked-data
 */

const linkSchema = new Schema(Link);

function getCID(path, val) {
    const key = path.slice(-1)[0];
    const errors = linkSchema.validate({
        [key]: val
    });
    return (!errors ? new CID(val) : null);
}

function dereference(cid, node) {
    return new Promise((resolve, reject) => {
        if (cid.codec === 'dag-pb' && cid.version === 0) {
            return node.getFile(cid.multihash).then(resolve);
        }
        if (cid.codec === 'dag-cbor' && cid.version === 1) {
            return node.getObject(cid).then(resolve);
        }
        reject(new Error(`unexpected cid: codec=${cid.codec}, version=${cid.version}`));
    });
}

function validate(instance, node) {
    return new Promise((resolve, reject) => {
        const schema = new Schema(instance['@type']);
        const errors = schema.validate(instance);
        if (errors) {
            return reject(new Error(errors));
        }
        const promises = [];
        traverse(instance, (path, val, result) => {
            const cid = getCID(path, val);
            if (!cid) return;
            result.push(
                dereference(cid, node).then(deref => {
                    if ((deref.type && deref.type.match(/audio|image/))) {
                        return deref;
                    }
                    if (isObject(deref)) {
                        const keys = path.split('/');
                        let key = keys.pop();
                        if (!key) {
                            for (let i = 0; i < keys.length; i++) {
                                if (i && !keys[i]) {
                                    key = keys[i - 1];
                                    break;
                                }
                            }
                        }
                        const descendant = deref['@type'];
                        const types = getTypesForProperty(key);
                        if (!types.some((type) => isAncestorType(type, descendant))) {
                            return reject(new Error('invalid type for ' + key + ': ' + descendant));
                        }
                        return validate(deref, node);
                    }
                    return reject(new Error('unexpected deref: ' + JSON.stringify(deref)));
                }).then(val => {
                    return [path, val];
                })
            );
        }, promises);
        const expanded = cloneObject(instance);
        Promise.all(promises).then(results => {
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

exports.dereference = dereference;
exports.validate = validate;