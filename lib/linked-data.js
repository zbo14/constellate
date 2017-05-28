const CID = require('cids');
const {
    validateSchema
} = require('../lib/schema.js');
const {
    getDAGNode
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
    MusicRecording
} = require('../lib/meta.js');

const {
    MusicGroup,
    Organization
} = require('../lib/party.js');

const {
    arrayFromObject,
    isArray,
    isObject
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
        case 'Copyright':
            return Copyright;
        case 'CreativeWork':
            return CreativeWork;
        case 'ReviewAction':
            return ReviewAction;
        case 'Right':
            return Right;
        case 'RightsTransferAction':
            return RightsTransferAction;
            //..
        default:
            throw new Error('unexpected @type: ' + type);
    }
}

function getTypes(key) {
    switch (key) {
        case 'byArtist':
        case 'composer':
        case 'lyricist':
        case 'performer':
        case 'producer':
            return ['MusicGroup'];
        case 'publisher':
        case 'recordLabel':
            return ['Organization'];
        case 'audio':
            return ['AudioObject'];
        case 'contentUrl':
            return [];
        case 'image':
            return ['ImageObject'];
        case 'recordingOf':
            return ['MusicComposition'];
        case 'track':
            return ['MusicRecording'];
        case 'license':
        case 'transferContract':
            return ['CreativeWork'];
        case 'rightsOf':
            return [
                'AudioObject',
                'ImageObject',
                'MusicAlbum',
                'MusicComposition',
                'MusicRecording'
            ];
        case 'source':
            return ['Copyright'];
        case 'asserter':
            return ['MusicGroup', 'Organization'];
        case 'assertionSubject':
            return [
                'Copyright',
                'Right',
                'RightsTransferAction'
            ];
        default:
            throw new Error('unexpected key: ' + key);
    }
}

function getLinks(obj) {
    return arrayFromObject(obj).reduce((result, [key, val]) => {
        if (isObject(val) && val['/']) {
            result.push({
                cid: new CID(val['/']),
                name: key
            });
        } else if (isArray(val)) {
            val.forEach((v, i) => {
                if (isObject(v) && v['/']) {
                    result.push({
                        cid: new CID(v['/']),
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
        let parts;
        links.reduce((result, link) => {
            return result.then(() => {
                return getDAGNode(link.cid, format);
            }).then((dagNode) => {
                parts = link.name.split('-');
                const types = getTypes(parts[0]);
                if (!types.length) {
                    return {
                        '/': link.cid.toBaseEncodedString()
                    };
                }
                if (!types.includes(dagNode['@type'])) {
                    return reject(
                        new Error(`invalid @type for ${parts[0]}: ${dagNode['@type']}`)
                    );
                }
                return validate(dagNode, format);
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