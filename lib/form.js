'use strict';

const {
    Draft
} = require('../lib/schema.js');

const {
    getDAGNode,
    getFile,
    isMultihash
} = require('../lib/ipfs.js');

const {
    arrayFromObject,
    isArray,
    isBoolean,
    isNumber,
    isObject,
    isString,
    traverse
} = require('../lib/util.js');

// @flow

/**
 * @module constellate/src/form
 */

function newInput(type, value) {
    const input = document.createElement('input');
    input.type = type;
    if (value) input.value = value;
    return input;
}

function elementToSchema(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            return formToSchema(Array.from(elem.children));
        case 'INPUT':
            const input = (elem);
            switch (input.type) {
                case 'checkbox':
                    return {
                        type: 'boolean'
                    };
                case 'number':
                    return {
                        type: 'number'
                    };
                case 'text':
                    return {
                        type: 'string'
                    };
            }
        case 'OL':
            if (!elem.children.length) {
                throw new Error('<ol> has no children');
            }
            const li = Array.from(elem.children).find((child) => child.nodeName === 'LI');
            if (!li) throw new Error('<ol> has no <li>');
            if (!li.children.length) {
                throw new Error('<li> has no children');
            }
            const firstChild = (li.firstChild);
            const attrs = (elem.attributes);
            return {
                type: 'array',
                items: elementToSchema(firstChild)
            }
        case 'SELECT':
            if (!elem.children.length) {
                throw new Error('select has no children');
            }
            const option = (elem.firstChild);
            return {
                // 'type': typeof option.value,
                'enum': Array.from(elem.children)
            }
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function elementToValue(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            return formToObject(Array.from(elem.children));
        case 'INPUT':
            const input = (elem);
            switch (input.type) {
                case 'checkbox':
                    if (!isBoolean(input.checked)) {
                        throw new Error('input[type="checkbox"]:checked is not boolean');
                    }
                    return input.checked;
                case 'number':
                    if (!isNumber(input.valueAsNumber)) {
                        throw new Error('input[type="number"] has non-number value');
                    }
                    return input.valueAsNumber;
                case 'text':
                    if (!isString(input.value)) {
                        throw new Error('input[type="text"] has non-string value');
                    }
                    return input.value;
                default:
                    throw new Error('unexpected input type: ' + input.type);
            }
        case 'OL':
            if (!elem.children.length) {
                throw new Error('<ol> has no children');
            }
            return Array.from(elem.children).reduce((result, child) => {
                if (child.nodeName !== 'LI') {
                    return result;
                }
                return result.concat(elementToValue(child.children[0]));
            }, []);
        case 'SELECT':
            const select = (elem);
            return select.value;
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function schemaToElement(schema) {
    if (schema.hasOwnProperty('enum') && isArray(schema.enum)) {
        const select = document.createElement('select');
        schema.enum.forEach((val) => {
            const option = document.createElement('option');
            option.textContent = val;
            option.value = val;
            select.appendChild(option);
        });
        return select;
    }
    switch (schema.type) {
        case 'array':
            let li;
            const ol = document.createElement('ol');
            [].concat(schema.items).forEach((item) => {
                li = document.createElement('li');
                li.appendChild(schemaToElement(item));
                ol.appendChild(li);
            });
            return ol;
        case 'boolean':
            return newInput('checkbox');
        case 'integer':
        case 'number':
            return newInput('number');
        case 'object':
            const fieldset = document.createElement('fieldset');
            const divs = schemaToForm(schema);
            divs.forEach((div) => fieldset.appendChild(div));
            return fieldset;
        case 'string':
            return newInput('text');
        default:
            throw new Error('unexpected type: ' + schema.type);
    }
}

function valueToElement(val, key) {
    return new Promise((resolve, reject) => {
        if (isArray(val)) {
            const ol = document.createElement('ol');
            let li;
            return val.reduce((result, v) => {
                return result.then(() => {
                    return valueToElement(v);
                }).then((elem) => {
                    li = document.createElement('li');
                    li.appendChild(elem);
                    ol.appendChild(li);
                });
            }, Promise.resolve()).then(() => {
                resolve(ol);
            });
        }
        if (isBoolean(val)) {
            resolve(newInput('checkbox', val));
        }
        if (isNumber(val)) {
            resolve(newInput('number', val));
        }
        if (isObject(val)) {
            const fieldset = document.createElement('fieldset');
            if (val['/']) {
                if (isMultihash(val['/'])) {
                    return getFile(val['/']).then(resolve);
                }
                return getDAGNode(val['/'], 'dag-cbor').then((dagNode) => {
                    return objectToForm(dagNode);
                }).then((divs) => {
                    divs.forEach((div) => fieldset.appendChild(div));
                    resolve(fieldset);
                });
            }
            return objectToForm(val).then((divs) => {
                divs.forEach((div) => fieldset.appendChild(div));
                resolve(fieldset);
            });
        }
        if (isString(val)) {
            resolve(newInput('text', val));
        }
        reject(new Error('unexpected type: ' + typeof val));
    });
}

function getAttributes(elem, schema) {
    if (!elem.attributes) return schema;
    const result = Array.from(elem.attributes).reduce((result, attr) => {
        switch (attr.name) {
            case 'disabled':
            case 'hidden':
                return Object.assign({}, result, {
                    readonly: true
                });
            case 'max':
                return Object.assign({}, result, {
                    maximum: parseInt(attr.value)
                });
            case 'maxitems':
                return Object.assign({}, result, {
                    maxItems: parseInt(attr.value)
                });
            case 'min':
                return Object.assign({}, result, {
                    minimum: parseInt(attr.value)
                });
            case 'minitems':
                return Object.assign({}, result, {
                    minItems: parseInt(attr.value)
                });
            case 'pattern':
                return Object.assign({}, result, {
                    pattern: attr.textContent
                });
            case 'uniqueitems':
                return Object.assign({}, result, {
                    uniqueItems: true
                });
            case 'value':
                return Object.assign({}, result, {
                    default: attr.textContent
                });
                //..
            default:
                return result;
        }
    }, schema);
    if (elem.nodeName !== 'SELECT') return result;
    return Object.assign({}, result, {
        enum: Array.from(elem.children).map((child) => {
            const option = (child);
            return option.value;
        })
    });
}

function setAttribute(elem, key, val) {
    const input = (elem);
    switch (key) {
        case 'default':
            input.defaultValue = val;
            break;
        case 'maximum':
            input.max = val;
            break;
        case 'maxItems':
            elem.setAttribute('maxitems', val);
            break;
        case 'minimum':
            input.min = val;
            break;
        case 'minItems':
            elem.setAttribute('minitems', val);
            break;
        case 'pattern':
            input.pattern = val;
            break;
        case 'readonly':
            input.disabled = true;
            input.hidden = true;
            break;
        case 'required':
            input.required = true;
            if (!input.hasAttribute('required')) {
                elem.setAttribute('required', 'true');
            }
            break;
        case 'uniqueItems':
            elem.setAttribute('uniqueitems', 'true');
            break;
    }
    return elem;
}

// function definition(obj: Object, defs: Object): Object {
//  if (!isString(obj['$ref'])) {
//    throw new Error('$ref should be non-empty string');
//  }
//  const match = obj['$ref'].match(/^\#\/definitions\/([A-Za-z0-9]+?)$/);
//  if (!isArray(match)) {
//    throw new Error('no schema definition matches');
//  }
//  return Object.assign({}, defs[match[1]]);
// }

function formToObject(divs) {
    return divs.reduce((result, div) => {
        if (div.nodeName !== 'DIV') {
            throw new Error('expected <div>; got ' + div.nodeName);
        }
        if (!div.children.length) {
            throw new Error('<div> has no children');
        }
        const children = Array.from(div.children);
        if (children.length !== 2) {
            throw new Error('<div> should have 2 children; has ' + children.length);
        }
        const label = children[0];
        if (label.nodeName !== 'LABEL') {
            throw new Error('expected label; got ' + label.nodeName);
        }
        const val = elementToValue(children[1]);
        if (val == null || (isArray(val) && val.some((x) => x == null))) return result;
        return Object.assign({}, result, {
            [label.textContent]: val
        });
    }, {});
}

function formToSchema(divs) {
    return divs.reduce((result, div) => {
        if (div.nodeName !== 'DIV') {
            throw new Error('expected <div>; got ' + div.nodeName);
        }
        if (!div.children.length) {
            throw new Error('<div> has no children');
        }
        const children = Array.from(div.children);
        if (children.length !== 2) {
            throw new Error('<div> should have 2 children; has ' + children.length);
        }
        const label = children[0];
        if (label.nodeName !== 'LABEL') {
            throw new Error('expected label; got ' + label.nodeName);
        }
        const elem = children[1];
        const schema = elementToSchema(elem);
        const reqs = result.required;
        if (elem.hasAttribute('required')) reqs.push(label.textContent);
        return Object.assign({}, result, {
            properties: Object.assign({}, result.properties, {
                [label.textContent]: getAttributes(elem, schema)
            }),
            required: reqs
        });
    }, {
        $schema: Draft,
        properties: {},
        required: [],
        type: 'object'
    });
}

function objectToForm(obj) {
    const elems = traverse(obj, (val, key) => {
        return valueToElement(val, key);
    });
    const divs = [];
    return Object.keys(elems).reduce((result, key) => {
        return result.then(() => {
            return elems[key];
        }).then((elem) => {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = key;
            div.appendChild(label);
            div.appendChild(elem);
            divs.push(div);
        });
    }, Promise.resolve()).then(() => {
        return divs;
    });
}

function schemaToForm(schema) {
    if (!isObject(schema.properties)) {
        throw new Error('schema properties should be non-empty object');
    }
    const props = schema.properties;
    const reqs = schema.required;
    const elems = traverse(props, (schema, key) => {
        const elem = arrayFromObject(schema).reduce((result, [k, v]) => {
            return setAttribute(result, k, v);
        }, schemaToElement(schema));
        if (!isArray(reqs) || !reqs.includes(key)) return elem;
        return setAttribute(elem, 'required', 'true');
    });
    return Object.keys(elems).reduce((result, key) => {
        if (!elems[key]) return result;
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = key;
        if (elems[key].hasAttribute('hidden')) label.hidden = true;
        div.appendChild(label);
        div.appendChild(elems[key]);
        return result.concat(div);
    }, []);
}

exports.formToObject = formToObject;
exports.formToSchema = formToSchema;
exports.objectToForm = objectToForm;
exports.schemaToForm = schemaToForm;