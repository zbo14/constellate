'use strict';

const {
    Draft,
    validateSchema
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
    isDescendant,
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
                    return (isBoolean(input.checked) ? input.checked : null);
                case 'number':
                    return (isNumber(input.valueAsNumber) ? input.valueAsNumber : null);
                case 'text':
                    return (isString(input.value) ? input.value : null);
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
            const form = schemaToForm(schema);
            Array.from(form.children).forEach((div) => {
                if (div.nodeName === 'DIV') fieldset.appendChild(div)
            });
            return fieldset;
        case 'string':
            return newInput('text');
    }
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
    throw new Error('unexpected schema: ' + JSON.stringify(schema));
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
                }).then((form) => {
                    Array.from(form.children).forEach((div) => {
                        if (div.nodeName === 'DIV') fieldset.appendChild(div);
                    });
                    resolve(fieldset);
                });
            }
            return objectToForm(val).then((form) => {
                Array.from(form.children).forEach((div) => {
                    if (div.nodeName === 'DIV') fieldset.appendChild(div);
                });
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
            if (input.type === 'checkbox') input.checked = val;
            else input.defaultValue = val;
            break;
        case 'enum':
            if (isArray(val) && elem.hasAttribute('type')) {
                if (input.type === 'checkbox') input.checked = val[0];
                else input.value = val[0];
            }
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
        if (elem.hasAttribute('required')) result.required.push(label.textContent);
        return Object.assign({}, result, {
            properties: Object.assign({}, result.properties, {
                [label.textContent]: getAttributes(elem, schema)
            }),
            required: result.required
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
    const form = document.createElement('form');
    return Object.keys(elems).reduce((result, key) => {
        return result.then(() => {
            return elems[key];
        }).then((elem) => {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.textContent = key;
            div.appendChild(label);
            div.appendChild(elem);
            form.appendChild(div);
        });
    }, Promise.resolve()).then(() => {
        form.appendChild(newInput('submit'));
        return form;
    });
}

function getInputs(elem) {
    if (elem.nodeName === 'INPUT') {
        const input = (elem);
        return [input];
    }
    if (!elem.children) return [];
    return Array.from(elem.children).reduce((result, child) => {
        return result.concat(getInputs(child));
    }, []);
}

function hasInputValue(input) {
    return (input.type === 'checkbox' ? input.checked : !!input.value);
}

function addPropertyDependencies(elem, elems, negate) {
    let input;
    const handler = (evt) => {
        if (!(input = (evt.target)) ||
            input.nodeName !== 'INPUT') return;
        const hasValue = hasInputValue(input);
        elems.forEach((el) => {
            Array.from(document.querySelectorAll('div')).forEach((div) => {
                if (isDescendant(div, el) &&
                    div.parentElement &&
                    div.parentElement.nodeName === 'FORM') {
                    div.hidden = (negate ? hasValue : false);
                    const remover = (div.previousElementSibling);
                    if (remover && remover.nodeName === 'BUTTON') {
                        const adder = (remover.previousElementSibling);
                        if (!adder) throw new Error('expected adder and remover btns');
                        adder.hidden = remover.hidden = (negate ? hasValue : false);
                    }
                }
            });
            getInputs(el).forEach((input) => {
                input.disabled = (negate ? hasValue : false);
                input.required = (negate ? !hasValue : hasValue);
            });
        });
    }
    elem.addEventListener('change', handler);
    elem.addEventListener('input', handler);
}

function addSchemaDependencies(elem, objs, negate) {
    let input;
    objs.map((obj) => {
        const el = (obj.elem);
        const schema = (obj.schema);
        const handler = (evt) => {
            if (!(input = (evt.target)) ||
                input.nodeName !== 'INPUT' ||
                !hasInputValue(input)) return;
            const value = elementToValue(el);
            if (negate === validateSchema(schema, value)) {
                arrayFromObject(schema).reduce((result, [k, v]) => {
                    return setAttribute(result, k, v);
                }, el);
            }
        }
        elem.addEventListener('change', handler);
        elem.addEventListener('input', handler);
        el.addEventListener('change', () => {
            elem.dispatchEvent(new Event('change'));
        });
        el.addEventListener('input', () => {
            elem.dispatchEvent(new Event('input'));
        });
    });
}

function addNotSchema(form, not, objs) {
    const handler = (evt) => {
        if (evt.target.nodeName !== 'INPUT') return;
        let obj = objs.reduce((result, obj) => {
            const value = elementToValue(obj.elem);
            return Object.assign({}, result, {
                [obj.key]: value
            });
        }, {});
        if (validateSchema(not, obj)) {
            objs.forEach((obj) => {
                arrayFromObject(obj.schema).reduce((result, [k, v]) => {
                    return setAttribute(result, k, v);
                }, obj.elem);
            });
        }
    }
    form.addEventListener('change', handler);
    form.addEventListener('input', handler);
}

function schemaToForm(schema) {
    if (!isObject(schema.properties)) {
        throw new Error('schema properties should be non-empty object');
    }
    let properties = schema.properties;
    let required = schema.required;
    let elem;
    const elems = traverse(properties, (schema, key) => {
        elem = arrayFromObject(schema).reduce((result, [k, v]) => {
            return setAttribute(result, k, v);
        }, schemaToElement(schema));
        if (!isArray(required) || !required.includes(key)) return elem;
        return setAttribute(elem, 'required', 'true');
    });
    const form = document.createElement('form');
    let deps;
    Object.keys(elems).reduce((result, key) => {
        if (!(elem = elems[key])) return result;
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = key;
        if (elem.hasAttribute('hidden')) label.hidden = true;
        div.appendChild(label);
        div.appendChild(elem);
        form.appendChild(div);
        if (isObject(schema.dependencies) &&
            (deps = schema.dependencies[key])) {
            if (isArray(deps)) {
                addPropertyDependencies(elem, deps.map((dep) => elems[dep]), false);
            } else if (isObject(deps)) {
                if (!isObject(deps.properties)) {
                    throw new Error('expected non-empty object for deps.properties');
                }
                addSchemaDependencies(elem, arrayFromObject(deps.properties).map(([key, schema]) => {
                    return {
                        elem: elems[key],
                        schema
                    };
                }), false);
            } else {
                throw new Error('expected non-empty array/object for deps; got ' + JSON.stringify(deps));
            }
        }
        if (isObject(schema.not)) {
            const keys = [];
            if (isObject(schema.not.properties)) {
                keys.push(...Object.keys(schema.not.properties));
            }
            if (isArray(schema.not.required)) {
                keys.push(...schema.required);
            }
            if (keys.length) {
                addNotSchema(form, schema.not, keys.map((key) => {
                    return {
                        elem: elems[key],
                        key,
                        schema: properties[key]
                    };
                }));
            }
            if (isObject(schema.not.dependencies) &&
                (deps = schema.not.dependencies[key])) {
                if (isArray(deps)) {
                    addPropertyDependencies(elem, deps.map((dep) => elems[dep]), true);
                } else if (isObject(deps)) {
                    if (!isObject(deps.properties)) {
                        throw new Error('expected non-empty object for deps.properties');
                    }
                    addSchemaDependencies(elem, arrayFromObject(deps.properties).map(([key, schema]) => {
                        return {
                            elem: elems[key],
                            schema
                        };
                    }), true);
                } else {
                    throw new Error('expected non-empty array/object for deps; got ' + JSON.stringify(deps));
                }
            }
        }
    }, []);
    form.appendChild(newInput('submit'));
    return form;
}

exports.formToObject = formToObject;
exports.formToSchema = formToSchema;
exports.getInputs = getInputs;
exports.objectToForm = objectToForm;
exports.schemaToForm = schemaToForm;