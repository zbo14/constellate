'use strict';

const util = require('./util.js');
const schema = require('./schema.js');

const {
    digestBase64,
    isArray,
    isBoolean,
    isNumber,
    isObject,
    isString,
    arrayFromObject,
    hasKeys,
    orderStringify,
    recurse,
    withoutKeys
} = util;

// @flow

/**
 * @module constellate/src/spec
 */

function newInput(type) {
    const input = document.createElement('input');
    input.type = type;
    return input;
}

function generateElement(obj, defs) {
    if (obj.hasOwnProperty('enum') && isArray(obj.enum)) {
        const select = document.createElement('select');
        obj.enum.forEach((val) => {
            const option = document.createElement('option');
            option.textContent = val;
            option.value = val;
            select.appendChild(option);
        });
        return select;
    }
    switch (obj.type) {
        case 'array':
            const ol = document.createElement('ol');
            const li = document.createElement('li');
            li.appendChild(generateElement(obj.items, defs));
            ol.appendChild(li);
            return ol;
        case 'boolean':
            return newInput('checkbox');
        case 'integer':
        case 'number':
            return newInput('number');
        case 'object':
            const fieldset = document.createElement('fieldset');
            const header = getHeader(obj.properties);
            if (isObject(header)) {
                obj = Object.assign({}, obj, {
                    properties: header
                });
            }
            const form = generateForm(obj);
            if (form != null) {
                form.forEach((div) => {
                    if (div != null) {
                        fieldset.appendChild(div);
                    }
                });
            }
            return fieldset;
        case 'string':
            return newInput('text');
        default:
            const def = definition(obj, defs);
            if (isObject(def)) {
                return generateElement(def, defs);
            }
    }
    throw new Error('unexpected type: ' + obj.type);
}

function evalElement(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            return evalForm(Array.from(elem.children));
        case 'INPUT':
            const input = (elem);
            switch (input.type) {
                case 'checkbox':
                    if (!isBoolean(input.value)) {
                        throw new Error('input[type="checkbox"] has non-boolean value');
                    }
                    return input.value;
                case 'number':
                    if (!isNumber(input.value)) {
                        throw new Error('input[type="number"] has non-number value');
                    }
                    return input.value;
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
                return result.concat(evalElement(child.children[0]));
            }, []);
        case 'SELECT':
            const select = (elem);
            return select.value;
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function parseElement(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            return parseForm(Array.from(elem.children));
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
            if (li == null) {
                throw new Error('<ol> has no <li>');
            }
            if (!li.children.length) {
                throw new Error('<li> has no children');
            }
            const firstChild = (li.firstChild);
            return {
                type: 'array',
                items: parseElement(firstChild),
                minItems: 1,
                uniqueItems: true
            }
        case 'SELECT':
            if (!elem.children.length) {
                throw new Error('select has no children');
            }
            const option = (elem.firstChild);
            return {
                'type': typeof option.value,
                'enum': Array.from(elem.children)
            }
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function getAttributes(elem, obj) {
    if (elem.attributes == null) {
        return obj;
    }
    const result = Array.from(elem.attributes).reduce((result, attr) => {
        switch (attr.name) {
            case 'disabled':
            case 'hidden':
                return Object.assign({}, result, {
                    readonly: true
                });
            case 'pattern':
                return Object.assign({}, result, {
                    pattern: attr.textContent
                });
            case 'value':
                return Object.assign({}, result, {
                    default: attr.textContent
                });
                //..
            default:
                return result;
        }
    }, obj);
    if (elem.nodeName !== 'SELECT') {
        return result;
    }
    return Object.assign({}, result, {
        enum: Array.from(elem.children).map((child) => {
            const option = (child);
            return option.value;
        })
    });
}

function setAttribute(elem, key, val) {
    switch (key) {
        case 'default':
            elem.defaultValue = val;
            break;
        case 'pattern':
            elem.pattern = val;
            break;
        case 'readonly':
            elem.disabled = true;
            elem.hidden = true;
            break;
        case 'required':
            elem.required = true;
            if (!elem.hasAttribute('required')) {
                elem.setAttribute('required', true);
            }
            break;
    }
    return elem;
}

function definition(obj, defs) {
    if (!isString(obj['$ref'])) {
        throw new Error('$ref should be non-empty string');
    }
    const match = obj['$ref'].match(/^\#\/definitions\/([A-Za-z0-9]+?)$/);
    if (!isArray(match)) {
        throw new Error('no schema definition matches');
    }
    return Object.assign({}, defs[match[1]]);
}

function isDescendant(parent, child) {
    if (child == null) {
        return false;
    }
    if (parent == child) {
        return true;
    }
    const _parent = (child.parentElement);
    return isDescendant(parent, _parent);
}

function generateForm(_schema) {
    let form = [];
    try {
        if (!isObject(_schema.properties)) {
            throw new Error('schema properties should be object');
        }
        const defs = _schema.definitions;
        const props = _schema.properties;
        const reqs = _schema.required;
        const elems = recurse(props, (obj, key) => {
            const elem = arrayFromObject(obj).reduce((result, [k, v]) => {
                return setAttribute(result, k, v);
            }, generateElement(obj, defs));
            if (!isArray(reqs) || !reqs.includes(key)) {
                return elem;
            }
            return setAttribute(elem, 'required');
        });
        form = Object.keys(elems).reduce((result, key) => {
            if (elems[key] == null) {
                return result;
            }
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = key;
            if (elems[key].hasAttribute('hidden')) {
                label.hidden = true;
            }
            div.appendChild(label);
            div.appendChild(elems[key]);
            return result.concat(div);
        }, []);
    } catch (err) {
        console.error(err.message);
    }
    return form;
}

function addRequired(reqs, elem, label) {
    if (!elem.hasAttribute('required')) {
        console.log(elem);
        return reqs;
    }
    return reqs.concat(label.textContent);
}

function addValue(obj, elem, label) {
    const val = evalElement(elem);
    if (val == null || (isArray(val) && val.some((x) => x == null))) {
        return obj;
    }
    return Object.assign({}, obj, {
        [label.textContent]: val
    });
}

function evalForm(form) {
    let values = {};
    try {
        values = form.reduce((result, div) => {
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
            return addValue(result, elem, label);
        }, {});
    } catch (err) {
        console.error(err.message);
    }
    return values;
}

function parseForm(form) {
    let parsed = {};
    try {
        parsed = form.reduce((result, div) => {
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
            const obj = parseElement(elem);
            if (!isObject(obj)) {
                throw new Error('expected valid object; got ' + JSON.stringify(obj));
            }
            return Object.assign({}, result, {
                properties: Object.assign({}, result.properties, {
                    [label.textContent]: getAttributes(elem, obj)
                }),
                required: addRequired(result.required, elem, label)
            });
        }, {
            properties: {},
            required: [],
            type: 'object'
        });
    } catch (err) {
        console.error(err.message);
    }
    return parsed;
}

function setId(obj) {
    return Object.assign({}, obj, {
        '@id': digestBase64(orderStringify(withoutKeys(obj, '@id')))
    });
}

function checkId(obj) {
    return obj['@id'] === setId(obj)['@id'];
}

function validate(obj, _schema) {
    if (!checkId(obj)) {
        throw new Error('obj has invalid id: ' + obj['@id']);
    }
    if (!schema.validate(obj, _schema)) {
        throw new Error('obj has invalid schema: ' + JSON.stringify(obj, null, 2));
    }
    return true;
}

function validateForm(form) {
    let valuesWithId = {};
    try {
        const result = form.reduce((result, div) => {
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
            console.log(elem);
            const obj = parseElement(elem);
            if (!isObject(obj)) {
                throw new Error('expected non-empty object; got ' + JSON.stringify(obj));
            }
            return Object.assign({}, result, {
                schema: {
                    properties: Object.assign({},
                        result.schema.properties, {
                            [label.textContent]: getAttributes(elem, obj)
                        }
                    ),
                    required: addRequired(result.schema.required, elem, label)
                },
                values: addValue(result.values, elem, label)
            });
        }, {
            schema: {
                properties: {},
                required: [],
                type: 'object'
            },
            values: {}
        });
        console.log(result.schema.required);
        valuesWithId = setId(result.values);
        validate(valuesWithId, result.schema);
    } catch (err) {
        console.error(err.message);
    }
    return valuesWithId;
}

function getHeader(obj) {
    let header = {};
    if (hasKeys(obj, '@type', '@id')) {
        header = {
            '@type': obj['@type'],
            '@id': obj['@id']
        }
    }
    return header;
}

exports.checkId = checkId;
exports.getHeader = getHeader;
exports.setId = setId;
exports.validate = validate;

exports.evalForm = evalForm;
exports.generateForm = generateForm;
exports.parseForm = parseForm;
exports.validateForm = validateForm;