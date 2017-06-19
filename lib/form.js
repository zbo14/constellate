'use strict';

const Schema = require('../lib/schema.js');

const {
    arrayFromObject,
    cloneObject,
    isAncestor,
    isArray,
    isBoolean,
    isNumber,
    isObject,
    isString,
    newAnchor,
    transform,
    traverse,
    withoutIndex
} = require('../lib/gen-util.js');

const {
    ajv
} = require('../lib/schema-util.js');

//

/**
 * @module constellate/src/schema-form
 */

module.exports = function(argv) {
    let form,
        instance,
        schema;
    if (argv instanceof HTMLFormElement) {
        form = (argv);
        this.element = () => form;
        this.instance = () => formToInstance(form);
        this.schema = () => formToSchema(form);
    } else if (isObject(argv)) {
        instance = (argv);
        form = instanceToForm(instance);
        schema = formToSchema(form);
        this.element = () => form;
        this.instance = () => instance;
        this.schema = () => schema;
    } else if (isString(argv)) {
        schema = new Schema(argv);
        form = schemaToForm(schema);
        instance = formToInstance(form);
        this.element = () => form;
        this.instance = () => instance;
        this.schema = () => schema;
    } else {
        throw new Error('unexpected parameter: ' + JSON.stringify(argv));
    }
}

function newInput(type, val) {
    const input = document.createElement('input');
    input.type = type;
    if (val) input.value = val;
    return input;
}

function includeElement(elem, label) {
    switch (elem.nodeName) {
        case 'INPUT':
            const input = (elem);
            return input.type === 'checkbox' ||
                (!input.disabled && !input.hidden && !!input.value);
        case 'FIELDSET':
            if (!elem.children || !elem.children.length) return false;
            return Array.from(elem.children).every((div) => {
                if (!div.children && !div.children.length) {
                    if (!elem.hasAttribute('required')) return false;
                    throw new Error(label.textContent + ' is required');
                }
                elem = (div.lastChild);
                label = (div.firstChild);
                return includeElement(elem, label);
            });
        case 'OL':
            if (!elem.children && !elem.children.length) {
                if (!elem.hasAttribute('required')) return false;
                throw new Error(label.textContent + ' is required');
            }
            return Array.from(elem.children).some((li) => {
                if (!li.children || !li.children.length) return false;
                elem = (li.firstChild);
                return includeElement(elem, label);
            });
        case 'SELECT':
            const select = (elem);
            return !!select.value;
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function elementToSchema(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            const divs = (Array.from(elem.children).filter((child) => {
                return child.nodeName === 'DIV';
            }));
            return divsToSchema(divs);
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
                throw new Error('ol has no children');
            }
            const li = Array.from(elem.children).find((child) => child.nodeName === 'LI');
            if (!li) throw new Error('ol has no li');
            if (!li.children.length) {
                throw new Error('li has no children');
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

function elementToInstance(elem) {
    switch (elem.nodeName) {
        case 'FIELDSET':
            if (!elem.children.length) {
                throw new Error('fieldset has no children');
            }
            const divs = (Array.from(elem.children).filter((child) => {
                return child.nodeName === 'DIV';
            }));
            return divsToInstance(divs);
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
                throw new Error('ol has no children');
            }
            return Array.from(elem.children).reduce((result, child) => {
                if (child.nodeName !== 'LI') {
                    return result;
                }
                return result.concat(elementToInstance(child.children[0]));
            }, []);
        case 'SELECT':
            const select = (elem);
            return select.value;
        default:
            throw new Error('unexpected nodeName: ' + elem.nodeName);
    }
}

function schemaToElement(schema) {
    let elem = document.createElement('null');
    switch (schema.type) {
        case 'array':
            elem = document.createElement('ol');
            let li;
            [].concat(schema.items).forEach((item) => {
                li = document.createElement('li');
                li.appendChild(schemaToElement(item));
                elem.appendChild(li);
            });
            break;
        case 'boolean':
            elem = newInput('checkbox');
            break;
        case 'integer':
        case 'number':
            elem = newInput('number');
            break;
        case 'object':
            elem = document.createElement('fieldset');
            const form = schemaToForm(schema);
            Array.from(form.children).forEach((div) => {
                if (div.nodeName === 'DIV') elem.appendChild(div)
            });
            break;
        case 'string':
            elem = newInput('text');
            break;
        default:
            if (!schema.hasOwnProperty('enum') || !isArray(schema.enum)) {
                throw new Error('unexpected schema: ' + JSON.stringify(schema));
            }
            elem = document.createElement('select');
            schema.enum.forEach((val) => {
                const option = document.createElement('option');
                option.textContent = val;
                option.value = val;
                elem.appendChild(option);
            });
    }
    arrayFromObject(schema).forEach(([k, v]) => setAttribute(elem, k, v));
    return elem;
}

function instanceToElement(instance) {
    if (isArray(instance.data) && isString(instance.type)) {
        const data = (instance.data);
        const type = (instance.type);
        return newAnchor(data, type);
    }
    if (isArray(instance)) {
        const ol = document.createElement('ol');
        let elem, li;
        instance.forEach((v) => {
            elem = instanceToElement(v);
            li = document.createElement('li');
            li.appendChild(elem);
            ol.appendChild(li);
        });
        return ol;
    }
    if (isBoolean(instance)) {
        return newInput('checkbox', instance);
    }
    if (isNumber(instance)) {
        return newInput('number', instance);
    }
    if (isObject(instance)) {
        const fieldset = document.createElement('fieldset');
        const form = instanceToForm(instance);
        Array.from(form.children).forEach((div) => {
            if (div.nodeName === 'DIV') fieldset.appendChild(div);
        });
        return fieldset;
    }
    if (isString(instance)) {
        return newInput('text', instance);
    }
    throw new Error('unexpected instance: ' + JSON.stringify(instance));
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
            else input.value = val;
        case 'enum':
            if (val && val.length) {
                if (input.type === 'checkbox') input.checked = val[0];
                else input.value = val[0];
            }
            return;
        case 'maximum':
            input.max = val;
            return;
        case 'maxItems':
            elem.setAttribute('maxitems', val);
            break;
        case 'minimum':
            input.min = val;
            return;
        case 'minItems':
            elem.setAttribute('minitems', val);
            return;
        case 'pattern':
            input.pattern = val;
            return;
        case 'readonly':
            elem.hidden = val;
            getInputs(elem).forEach((input) => {
                input.disabled = val;
            });
            return;
        case 'required':
            input.required = val;
            if (!input.hasAttribute('required')) {
                elem.setAttribute('required', JSON.stringify(val));
            }
            return;
        case 'uniqueItems':
            elem.setAttribute('uniqueitems', JSON.stringify(val));
            return;
            //..
    }
}

function formToInstance(form) {
    if (!form.children.length) {
        throw new Error('form has no children');
    }
    const divs = (Array.from(form.children).filter((child) => {
        return child.nodeName === 'DIV';
    }));
    return divsToInstance(divs);
}

function divsToInstance(divs) {
    let elem, label;
    return divs.reduce((result, div) => {
        if (!(elem = (div.lastChild))) {
            throw new Error('expected element');
        }
        if (!(label = (div.firstChild)) || label.nodeName !== 'LABEL') {
            throw new Error('expected label');
        }
        if (!includeElement(elem, label)) {
            return result;
        }
        const instance = elementToInstance(elem);
        if (instance == null || (isArray(instance) && instance.some((x) => x == null))) return result;
        return Object.assign({}, result, {
            [label.textContent]: instance
        });
    }, {});
}

function formToSchema(form) {
    if (!form.children.length) {
        throw new Error('form has no children');
    }
    const divs = (Array.from(form.children).filter((child) => {
        return child.nodeName === 'DIV';
    }));
    return divsToSchema(divs);
}

function divsToSchema(divs) {
    let elem, label;
    const schema = divs.reduce((result, div) => {
        if (!(elem = (div.lastChild))) {
            throw new Error('expected element');
        }
        if (!(label = (div.firstChild)) || label.nodeName !== 'LABEL') {
            throw new Error('expected label');
        }
        if (!includeElement(elem, label)) {
            return result;
        }
        const schema = elementToSchema(elem);
        if (elem.hasAttribute('required')) {
            result.required.push(label.textContent);
        }
        return Object.assign({}, result, {
            properties: Object.assign({}, result.properties, {
                [label.textContent]: getAttributes(elem, schema)
            }),
            required: result.required
        });
    }, {
        type: 'object',
        properties: {},
        required: []
    });
    return new Schema(schema);
}

function addButtons(form) {
    const ols = form.querySelectorAll('ol');
    Array.from(ols).forEach((ol, i) => {
        if (!ol.hidden && isAncestor(form, ol)) {
            const remover = document.createElement('button');
            remover.className = 'remover';
            remover.id = 'remover-' + i;
            remover.textContent = '-';
            form.insertBefore(remover, ol.parentElement);
            const adder = document.createElement('button');
            adder.className = 'adder';
            adder.id = 'adder-' + i;
            adder.textContent = '+';
            form.insertBefore(adder, remover);
        }
    });
}

function addButtonListener(form) {
    form.addEventListener('click', (evt) => {
        const btn = (evt.target);
        if (btn.nodeName !== 'BUTTON') return;
        evt.preventDefault();
        let div;
        if (!(div = (btn.nextElementSibling))) {
            throw new Error('expected div; got ' + JSON.stringify(div));
        }
        if (div.nodeName !== 'DIV') {
            div = div.nextElementSibling;
            if (!div || div.nodeName !== 'DIV') {
                throw new Error('expected div; got ' + (!div ? JSON.stringify(div) : div.nodeName));
            }
        }
        const ol = (div.lastChild);
        if (!ol || ol.nodeName !== 'OL') {
            throw new Error('expected ol; got ' + (!ol ? JSON.stringify(ol) : ol.nodeName));
        }
        if (!ol.children || !ol.children.length) {
            throw new Error('ol has no children');
        }
        if (btn.className === 'remover') {
            let minitems;
            if (ol.hasAttribute('required') &&
                ol.hasAttribute('minitems') &&
                (minitems = (ol.getAttribute('minitems'))) &&
                parseInt(minitems) === ol.children.length) {
                const label = (div.firstChild);
                if (!label || label.nodeName !== 'LABEL') {
                    throw new Error('expected label; got ' + (!label ? JSON.stringify(label) : label.nodeName));
                }
                alert(label.textContent + ' is required');
            } else if (ol.children.length === 1) {
                const li = (ol.firstChild);
                if (!li || li.nodeName !== 'LI') {
                    throw new Error('expected li; got ' + (!li ? JSON.stringify(li) : li.nodeName));
                }
                const inputs = (Array.from(li.querySelectorAll('input')));
                for (let i = 0; i < inputs.length; i++) {
                    inputs[i].disabled = true;
                    inputs[i].value = '';
                }
                li.hidden = true;
            } else {
                ol.removeChild((ol.lastChild));
            }
        } else if (btn.className === 'adder') {
            const li = (ol.firstChild);
            if (!li || li.nodeName !== 'LI') {
                throw new Error('expected li; got ' + (!li ? JSON.stringify(li) : li.nodeName));
            }
            if (ol.children.length === 1 && li.hidden) {
                const inputs = Array.from(li.querySelectorAll('input'));
                for (let i = 0; i < inputs.length; i++) {
                    (inputs[i]).disabled = false;
                }
                li.hidden = false;
            } else {
                const clone = li.cloneNode(true);
                const inputs = (Array.from(clone.querySelectorAll('input')));
                for (let i = 0; i < inputs.length; i++) {
                    if (inputs[i].type === 'checkbox') inputs[i].checked = false;
                    else if (inputs[i].type === 'text') inputs[i].value = '';
                    else throw new Error('unexpected input type: ' + inputs[i].type);
                }
                ol.appendChild(clone);
            }
        } else {
            throw new Error('expected adder or remover btn; got ' + btn.className);
        }
    });
}

function instanceToForm(instance) {
    const elems = transform(instance, (subInstance) => {
        return instanceToElement(subInstance);
    });
    const form = document.createElement('form');
    Object.keys(elems).forEach((key) => {
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = key;
        div.appendChild(label);
        div.appendChild(elems[key]);
        form.appendChild(div);
    });
    form.appendChild(newInput('submit'));
    addButtonListener(form);
    return form;
}

function getInputs(elem) {
    if (elem.nodeName === 'INPUT') {
        const input = (elem);
        return [input];
    }
    return (Array.from(elem.querySelectorAll('input')));
}

function hasInputValue(input) {
    return (input.type === 'checkbox' ? input.checked : !!input.value);
}

function isInputEvent(evt, input) {
    return (input.type === 'checkbox' ? evt.type === 'click' : evt.type === 'input');
}

function propertyDependencyHandler(div2, negate) {
    return (evt) => {
        const input = (evt.target);
        if (!input || input.nodeName !== 'INPUT') return;
        if (!isInputEvent(evt, input)) return;
        const elem2 = (div2.lastChild);
        if (!elem2) throw new Error('expected element');
        const hasVal = hasInputValue(input);
        const hidden = (negate ? hasVal : false);
        const disabled = (negate ? hasVal : false);
        const required = (negate ? !hasVal : hasVal);
        div2.hidden = hidden;
        const remover = (div2.previousElementSibling);
        if (remover && remover.nodeName === 'BUTTON') {
            const adder = (remover.previousElementSibling);
            if (!adder) throw new Error('expected adder and remover btns');
            adder.hidden = remover.hidden = hidden;
        }
        getInputs(elem2).forEach((input) => {
            input.disabled = disabled;
            input.required = required;
        });
    }
}

function schemaDependencyHandler1(div2, negate, schema) {
    return (evt) => {
        const input = (evt.target);
        if (!input || input.nodeName !== 'INPUT' || !hasInputValue(input)) return;
        if (!isInputEvent(evt, input)) return;
        const elem2 = (div2.lastChild);
        if (!elem2) throw new Error('expected element');
        const validate = ajv.compile(schema);
        validate(elementToInstance(elem2));
        console.log(!validate.errors === negate);
        if (!validate.errors === negate) {
            div2.replaceChild(schemaToElement(schema), elem2);
        }
    }
}

function schemaDependencyHandler2(div1, div2, negate, schema) {
    return (evt) => {
        const input = (evt.target);
        if (!input || input.nodeName !== 'INPUT') return;
        if (!isInputEvent(evt, input)) return;
        const elem1 = (div1.lastChild);
        if (!elem1) throw new Error('expected element');
        if (!getInputs(elem1).some(hasInputValue)) return;
        const elem2 = (div2.lastChild);
        if (!elem2) throw new Error('expected element');
        const validate = ajv.compile(schema);
        validate(elementToInstance(elem2));
        console.log(!validate.errors === negate);
        if (!validate.errors === negate) {
            div2.replaceChild(schemaToElement(schema), elem2);
        }
    }
}

function schemaHandler(divs, finder, subSchemas, validator) {
    return (evt) => {
        const input = (evt.target);
        if (!input || input.nodeName !== 'INPUT') return;
        if (!isInputEvent(evt, input)) return;
        let elem,
            label,
            promises = [],
            key = '',
            val = {};
        for (let i = 0; i < divs.length; i++) {
            if (!(elem = (divs[i].lastChild))) {
                throw new Error('expected element');
            }
            if (!(label = (divs[i].firstChild)) || label.nodeName !== 'LABEL') {
                throw new Error('expected label');
            }
            promises.push(finder(label.textContent));
            if (includeElement(elem, label)) {
                Object.assign(val, {
                    [label.textContent]: elementToInstance(elem)
                });
            }
        }
        if (validator(val)) return;
        Promise.all(promises).then((finds) => {
            for (let i = 0; i < divs.length; i++) {
                if (finds[i]) {
                    elem = (divs[i].lastChild);
                    label = (divs[i].firstChild);
                    if (includeElement(elem, label)) {
                        divs[i].replaceChild(schemaToElement(subSchemas[i]), elem);
                    }
                }
            }
        });
    }
}

function setDependencies(deps, form, negate) {
    const divs = Array.from(form.children).filter((child) => {
        if (child && child.nodeName === 'DIV') return (child);
    });
    const keys = Object.keys(deps);
    divs.forEach((div1, i) => {
        const label1 = (div1.firstChild);
        if (!label1 || label1.nodeName !== 'LABEL') throw new Error('expected label');
        if (!keys.includes(label1.textContent)) return;
        const dep = deps[label1.textContent];
        if (isArray(dep)) {
            withoutIndex(divs, i).forEach((div2) => {
                const label2 = (div2.firstChild);
                if (!label2 || label2.nodeName !== 'LABEL') throw new Error('expected label');
                if (!dep.includes(label2.textContent)) return;
                const handler = propertyDependencyHandler(div2, negate);
                div1.addEventListener('click', handler);
                div1.addEventListener('input', handler);
            });
        } else if (isObject(dep)) {
            if (!isObject(dep.properties)) {
                throw new Error('expected non-empty object for dep properties');
            }
            withoutIndex(divs, i).forEach((div2) => {
                const label2 = (div2.firstChild);
                if (!label2 || label2.nodeName !== 'LABEL') throw new Error('expected label');
                const schema = (dep.properties[label2.textContent]);
                if (!isObject(schema)) return;
                const handler1 = schemaDependencyHandler1(div2, negate, schema)
                const handler2 = schemaDependencyHandler2(div1, div2, negate, schema);
                div1.addEventListener('click', handler1);
                div2.addEventListener('click', handler2);
                div1.addEventListener('input', handler1);
                div2.addEventListener('input', handler2);
            });
        } else {
            throw new Error('expected array/object for dep; got ' + typeof dep);
        }
    });
}

function findInSchema(schema) {
    return (key) => {
        return new Promise((resolve, _) => {
            traverse(schema, (path, val) => {
                if (key === val) {
                    resolve(true);
                }
                if (path) {
                    const keys = path.split('/');
                    if (keys && keys.includes(key)) {
                        resolve(true);
                    }
                }
            });
            resolve(false);
        });
    }
}

function findInSchemas(schemas) {
    return (key) => {
        return new Promise((resolve, _) => {
            const promises = schemas.map((schema) => {
                return findInSchema(schema)(key);
            });
            Promise.all(promises).then((finds) => {
                resolve(finds.some((found) => found));
            });
        });
    }
}

function validate(schema, negate) {
    const validate = ajv.compile(schema);
    return (instance) => {
        validate(instance);
        return !!validate.errors === negate;
    }
}

function validateAllOf(schemas, negate) {
    const validates = schemas.map(schema => ajv.compile(schema));
    return (instance) => {
        return validates.some(validate => {
            validate(instance);
            return !!validate.errors === negate;
        });
    }
}

function validateAnyOf(schemas, negate) {
    const validates = schemas.map(schema => ajv.compile(schema));
    return (instance) => {
        return validates.some(validate => {
            validate(instance);
            return !!validate.errors === negate;
        });
    }
}

function validateOneOf(schemas, negate) {
    const validates = schemas.map(schema => ajv.compile(schema));
    return (instance) => {
        return validates.filter(validate => {
            validate(instance);
            return !!validate.errors === negate;
        }).length === 1;
    }
}

function setSchema(form, negate, schema, subSchemas, keyword) {
    const divs = Array.from(form.children).filter((child) => {
        if (child && child.nodeName === 'DIV') return (child);
    });
    let finder, validator;
    if (!keyword) {
        finder = findInSchema(schema);
        validator = validate(schema, negate);
    } else {
        const schemas = (schema[keyword]);
        if (!isArray(schemas)) return;
        finder = findInSchemas(schemas);
        switch (keyword) {
            case 'allOf':
                validator = validateAllOf(schemas, negate);
                break;
            case 'anyOf':
                validator = validateAnyOf(schemas, negate);
                break;
            case 'oneOf':
                console.log(1);
                validator = validateOneOf(schemas, negate);
                break;
                //..
            default:
                throw new Error('unexpected keyword: ' + JSON.stringify(keyword));
        }
    }
    const handler = schemaHandler(divs, finder, subSchemas, validator);
    form.addEventListener('click', handler);
    form.addEventListener('input', handler);
}

function schemaToForm(schema) {
    if (!isObject(schema.properties)) {
        throw new Error('schema properties should be non-empty object');
    }
    const form = document.createElement('form');
    const props = schema.properties;
    const reqs = schema.required;
    const subSchemas = [];
    let div, elem, label;
    arrayFromObject(props).forEach(([key, subSchema]) => {
        elem = schemaToElement(subSchema);
        if (isArray(reqs) && reqs.includes(key)) setAttribute(elem, 'required', true);
        div = (document.createElement('div'));
        label = (document.createElement('label'));
        label.textContent = key;
        label.hidden = elem.hidden;
        div.appendChild(label);
        div.appendChild(elem);
        form.appendChild(div);
        subSchemas.push(subSchema);
    });
    if (isObject(schema.dependencies)) {
        setDependencies(schema.dependencies, form, false);
    }
    if (isObject(schema.not)) {
        setSchema(form, true, schema.not, subSchemas);
        if (isObject(schema.not.dependencies)) {
            setDependencies(schema.not.dependencies, form, true);
        }
    }
    setSchema(form, false, schema, subSchemas, 'allOf');
    setSchema(form, false, schema, subSchemas, 'anyOf');
    setSchema(form, false, schema, subSchemas, 'oneOf');
    form.appendChild(newInput('submit'));
    addButtons(form);
    addButtonListener(form);
    return form;
}
