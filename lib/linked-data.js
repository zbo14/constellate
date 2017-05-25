const {
    getDAGNode
} = require('../lib/ipfs.js');
const {
    getMetaSchema
} = require('../lib/meta.js');
const {
    getPartySchema
} = require('../lib/party.js');
const {
    getLinks,
    validateSchema
} = require('../lib/schema.js');

//      

/**
 * @module constellate/src/linked-data
 */

function getSchema(type) {
    switch (type) {
        case 'Artist':
        case 'Organization':
            return getPartySchema(type);
        case 'Album':
        case 'Audio':
        case 'Composition':
        case 'Image':
        case 'Recording':
            return getMetaSchema(type);
            //..
        default:
            throw new Error('unexpected @type: ' + type);
    }
}

function validateLinkedData(obj) {
    return new Promise((resolve, reject) => {
        const schema = getSchema(obj['@type']);
        if (!validateSchema(obj, schema)) {
            return reject(obj['@type'] + ' has invalid schema: ' + JSON.stringify(obj, null, 2));
        }
        const links = getLinks(obj, schema);
        if (!links || !links.length) resolve(obj);
        links.reduce((result, link) => {
            return result.then(() => {
                return getDAGNode(link.multihash);
            }).then((dagNode) => {
                const data = Buffer.from(dagNode.value._data).toString('utf8');
                return validateLinkedData(JSON.parse(data));
            }).then((val) => {
                const parts = link.name.split('-');
                if (parts.length !== 2) obj[link.name] = val;
                else {
                    if (parseInt(parts[1]) === 1) obj[parts[0]] = [];
                    obj[parts[0]].push(val);
                }
            });
        }, Promise.resolve()).then(() => {
            resolve(obj);
        });
    });
}

exports.getSchema = getSchema;
exports.validateLinkedData = validateLinkedData;