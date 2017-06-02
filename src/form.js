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

function newInput(type: string, value?: any): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  if (value) input.value = value;
  return input;
}

function elementToSchema(elem: HTMLElement): Object {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return formToSchema(Array.from(elem.children));
    case 'INPUT':
      const input: HTMLInputElement = (elem: any);
      switch(input.type) {
        case 'checkbox':
          return {type: 'boolean'};
        case 'number':
          return {type: 'number'};
        case 'text':
          return {type: 'string'};
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
      const firstChild: HTMLElement = (li.firstChild: any);
      const attrs: Object = (elem.attributes: any);
      return {
        type: 'array',
        items: elementToSchema(firstChild)
      }
    case 'SELECT':
      if (!elem.children.length) {
        throw new Error('select has no children');
      }
      const option: HTMLOptionElement = (elem.firstChild: any);
      return {
        // 'type': typeof option.value,
        'enum': Array.from(elem.children)
      }
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}

function elementToValue(elem: HTMLElement): any {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return formToObject(Array.from(elem.children));
    case 'INPUT':
      const input: HTMLInputElement = (elem: any);
      switch(input.type) {
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
          if (child.nodeName !== 'LI') { return result; }
          return result.concat(elementToValue(child.children[0]));
      }, []);
    case 'SELECT':
      const select: HTMLSelectElement = (elem: any);
      return select.value;
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}

function schemaToElement(schema: Object): HTMLElement {
  switch(schema.type) {
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

function valueToElement(val: any, key?: string): Promise<HTMLElement> {
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

function getAttributes(elem: HTMLElement, schema: Object): Object {
  if (!elem.attributes) return schema;
  const result = Array.from(elem.attributes).reduce((result, attr) => {
    switch(attr.name) {
      case 'disabled':
      case 'hidden':
        return Object.assign({}, result, { readonly: true });
      case 'max':
        return Object.assign({}, result, { maximum: parseInt(attr.value) });
      case 'maxitems':
        return Object.assign({}, result, { maxItems: parseInt(attr.value) });
      case 'min':
        return Object.assign({}, result, { minimum: parseInt(attr.value) });
      case 'minitems':
        return Object.assign({}, result, { minItems: parseInt(attr.value) });
      case 'pattern':
        return Object.assign({}, result, { pattern: attr.textContent });
      case 'uniqueitems':
        return Object.assign({}, result, { uniqueItems: true });
      case 'value':
        return Object.assign({}, result, { default: attr.textContent });
      //..
      default:
        return result;
    }
  }, schema);
  if (elem.nodeName !== 'SELECT') return result;
  return Object.assign({}, result, {
    enum: Array.from(elem.children).map((child) => {
      const option: HTMLOptionElement = (child: any);
      return option.value;
    })
  });
}

function setAttribute(elem: HTMLElement, key: string, val: any): HTMLElement {
  const input: HTMLInputElement = (elem: any);
  switch(key) {
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

function formToObject(divs: HTMLElement[]): Object {
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
    return Object.assign({}, result, { [label.textContent]: val } );
  }, {});
}

function formToSchema(divs: HTMLElement[]): Object  {
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
      properties: Object.assign({}, result.properties,
        { [label.textContent]: getAttributes(elem, schema) }
      ),
      required: reqs
    });
  }, {
    $schema: Draft,
    properties: {},
    required: [],
    type: 'object'
  });
}

function objectToForm(obj: Object): Promise<HTMLElement[]> {
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

function getInputs(elem: HTMLElement): HTMLInputElement[] {
  if (elem.nodeName === 'INPUT') {
    const input: HTMLInputElement = (elem: any);
    return [input];
  }
  if (!elem.children) return [];
  return Array.from(elem.children).reduce((result, child) => {
    return result.concat(getInputs(child));
  }, []);
}

function hasInputValue(input: HTMLInputElement): boolean {
  return (input.type === 'checkbox' ? input.checked : !!input.value);
}

function addPropertyDependencies(elem: HTMLElement, elems: HTMLElement[], negate: boolean) {
  let input : HTMLInputElement;
  const handler = (event) => {
    if (!(input = (event.target : any)) ||
        input.nodeName !== 'INPUT') return;
    const hasValue = hasInputValue(input);
    elems.forEach((el) => {
      Array.from(document.querySelectorAll('div')).forEach((div) => {
        if (isDescendant(div, el) &&
            div.parentElement &&
            div.parentElement.nodeName === 'FORM') {
          div.hidden = (negate ? hasValue: false);
          const remover: HTMLElement = (div.previousElementSibling: any);
          if (remover && remover.nodeName === 'BUTTON') {
            const adder : HTMLElement = (remover.previousElementSibling: any);
            if (!adder) throw new Error('expected adder and remover btns');
            adder.hidden = remover.hidden = (negate ? hasValue: false);
          }
        }
      });
      getInputs(el).forEach((input) => {
        input.disabled = (negate ? hasValue: false);
        input.required = (negate ? !hasValue : hasValue);
      });
    });
  }
  elem.addEventListener('change', handler);
  elem.addEventListener('input', handler);
}

function addSchemaDependencies(elem: HTMLElement, objs: Object[], negate: boolean) {
  let input : HTMLInputElement;
  objs.map((obj) => {
    const el: HTMLElement = (obj.elem : any);
    const schema: Object = (obj.schema : any);
    const handler = (event) => {
      if (!(input = (event.target : any)) ||
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

function schemaToForm(schema: Object): HTMLElement[] {
  if (!isObject(schema.properties)) {
    throw new Error('schema properties should be non-empty object');
  }
  const props = schema.properties;
  const reqs = schema.required;
  let elem;
  let elems = traverse(props, (schema, key) => {
    elem = arrayFromObject(schema).reduce((result, [k, v]) => {
      return setAttribute(result, k, v);
    }, schemaToElement(schema));
    if (!isArray(reqs) || !reqs.includes(key)) return elem;
    return setAttribute(elem, 'required', 'true');
  });
  let deps;
  return Object.keys(elems).reduce((result, key) => {
    if (!(elem = elems[key])) return result;
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = key;
    if (elem.hasAttribute('hidden')) label.hidden = true;
    div.appendChild(label);
    div.appendChild(elem);
    if (isObject(schema.dependencies) &&
        (deps = schema.dependencies[key])) {
      if (isArray(deps)) {
        addPropertyDependencies(elem, deps.map((dep) => elems[dep]), false);
      } else if (isObject(deps)) {
        if (!isObject(deps.properties)) {
          throw new Error('expected non-empty object for deps.properties');
        }
        addSchemaDependencies(elem, arrayFromObject(deps.properties).map(([key, schema]) => {
          return { elem: elems[key], schema };
        }), false);
      } else {
        throw new Error('expected non-empty array/object for deps; got ' + JSON.stringify(deps));
      }
    }
    if (isObject(schema.not) &&
        isObject(schema.not.dependencies) &&
        (deps = schema.not.dependencies[key])) {
      if (isArray(deps)) {
        addPropertyDependencies(elem, deps.map((dep) => elems[dep]), true);
      } else if (isObject(deps)) {
        if (!isObject(deps.properties)) {
          throw new Error('expected non-empty object for deps.properties');
        }
        addSchemaDependencies(elem, arrayFromObject(deps.properties).map(([key, schema]) => {
          return { elem: elems[key], schema };
        }), true);
      } else {
        throw new Error('expected non-empty array/object for deps; got ' + JSON.stringify(deps));
      }
    }
    return result.concat(div);
  }, []);
}

exports.formToObject = formToObject;
exports.formToSchema = formToSchema;
exports.objectToForm = objectToForm;
exports.schemaToForm = schemaToForm;
