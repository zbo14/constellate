const {
    getDAGNode
} = require('../lib/ipfs.js');
const {
    validateSchema
} = require('../lib/schema.js');

const {
    AudioObject,
    ImageObject,
    MusicAlbum,
    MusicComposition,
    MusicRecording
} = require('../lib/meta.js');

const {
    MusicGroup,
    Organization
} = require('../lib/party.js');

const {
    arrayFromObject,
    isArray,
    isObject,
    recurse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/linked-data
 */

function getSchema(type) {
    switch (type) {
        case 'MusicGroup':
            return MusicGroup;
        case 'Organization':
            return Organization;
        case 'AudioObject':
            return AudioObject;
        case 'ImageObject':
            return ImageObject;
        case 'MusicAlbum':
            return MusicAlbum;
        case 'MusicComposition':
            return MusicComposition;
        case 'MusicRecording':
            return MusicRecording;
            //..
        default:
            throw new Error('unexpected @type: ' + type);
    }
}

function getType(key) {
    switch (key) {
        case 'byArtist':
        case 'composer':
        case 'lyricist':
        case 'performer':
        case 'producer':
            return 'MusicGroup';
        case 'publisher':
        case 'recordLabel':
            return 'Organization';
        case 'audio':
            return 'AudioObject';
        case 'image':
            return 'ImageObject';
        case 'recordingOf':
            return 'MusicComposition';
        case 'track':
            return 'MusicRecording';
        default:
            throw new Error('unexpected key: ' + key);
    }
}

function getLinks(obj) {
    return arrayFromObject(obj).reduce((result, [key, val]) => {
        if (isObject(val) && val['/']) {
            result.push({
                multihash: val['/'],
                name: key
            });
        }
        if (isArray(val)) {
            val.forEach((v, i) => {
                if (isObject(v) && v['/']) {
                    result.push({
                        multihash: v['/'],
                        name: key + '-' + (i + 1)
                    });
                }
            });
        }
        return result;
    }, []);
}

function validate(obj, format) {
    return new Promise((resolve, reject) => {
        const schema = getSchema(obj['@type']);
        if (!validateSchema(obj, schema)) {
            return reject(obj['@type'] + ' has invalid schema: ' + JSON.stringify(obj, null, 2));
        }
        const links = getLinks(obj);
        if (!links || !links.length) resolve(obj);
        let nodeValue, parts;
        links.reduce((result, link) => {
            return result.then(() => {
                return getDAGNode(link.multihash);
            }).then((dagNode) => {
                if (format === 'dag-cbor') {
                    nodeValue = recurse(dagNode.value, (val, key) => {
                        if (key === '/') {
                            return multibase.encode('base58btc', Buffer.from(val)).toString('utf8');
                        }
                        if (isObject(val) && val['/']) {
                            return multibase.encode('base58btc', Buffer.from(val['/'])).toString('utf8');
                        }
                        return val;
                    });
                } else if (format === 'dag-pb') {
                    nodeValue = JSON.parse(Buffer.from(dagNode.value._data).toString('utf8'));
                } else {
                    return reject(new Error('unexpected format: ' + format));
                }
                parts = link.name.split('-');
                const type = getType(parts[0]);
                if (type !== nodeValue['@type']) {
                    return reject(new Error(
                        `invalid @type for ${parts[0]}\n
                      expected ${type}; got ${nodeValue['@type']}`));
                }
                return validate(nodeValue, format);
            }).then((validated) => {
                if (parts.length === 1) {
                    obj = Object.assign({}, obj, {
                        [link.name]: validated
                    });
                } else if (parseInt(parts[1]) === 1) {
                    obj = Object.assign({}, obj, {
                        [parts[0]]: [validated]
                    });
                } else {
                    obj = Object.assign({}, obj, {
                        [parts[0]]: obj[parts[0]].concat(validated)
                    });
                }
            });
        }, Promise.resolve()).then(() => {
            resolve(obj);
        });
    });
}

exports.getSchema = getSchema;
exports.validate = validate;