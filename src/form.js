'use strict';

const meta = require('../lib/meta.js');
const util = require('../lib/util.js');

const {
  arrayFromObject,
  isArray,
  isBoolean,
  isNumber,
  isObject,
  isString,
  recurse
} = util;

// @flow

/**
* @module constellate/src/form
*/

function newInput(type: string): HTMLElement {
  const input = document.createElement('input');
  input.type = type;
  return input;
}

function generateElement(obj: Object, defs: Object): HTMLElement {
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
    switch(obj.type) {
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
        const header = meta.getHeader(obj.properties);
        if (isObject(header)) { obj = Object.assign({}, obj, { properties: header }); }
        const form = generateForm(obj);
        if (form != null) {
          form.forEach((div) => {
            if (div != null) { fieldset.appendChild(div); }
          });
        }
        return fieldset;
      case 'string':
        return newInput('text');
      default:
        const def = definition(obj, defs);
        if (isObject(def)) return generateElement(def, defs);
    }
    throw new Error('unexpected type: ' + obj.type);
}

function parseElement(elem: HTMLElement): any {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return parseForm(Array.from(elem.children));
    case 'INPUT':
      const input: HTMLInputElement = (elem: any);
      switch(input.type) {
        case 'checkbox':
          if (!isBoolean(input.value)) {
            throw new Error('input[type="checkbox"] has non-boolean value');
          }
          return input.value;
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
          return result.concat(parseElement(child.children[0]));
      }, []);
    case 'SELECT':
      const select: HTMLSelectElement = (elem: any);
      return select.value;
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}


function schemafyElement(elem: HTMLElement): Object {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return schemafyForm(Array.from(elem.children));
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
      if (li == null) {
        throw new Error('<ol> has no <li>');
      }
      if (!li.children.length) {
        throw new Error('<li> has no children');
      }
      const firstChild: HTMLElement = (li.firstChild: any);
      const attributes: Object = (elem.attributes: any);
      return {
        type: 'array',
        items: schemafyElement(firstChild),
        minItems: parseInt(attributes.minimum.value),
        uniqueItems: elem.hasAttribute('unique')
      }
    case 'SELECT':
      if (!elem.children.length) {
        throw new Error('select has no children');
      }
      const option: HTMLOptionElement = (elem.firstChild: any);
      return {
        'type': typeof option.value,
        'enum': Array.from(elem.children)
      }
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}

function getAttributes(elem: HTMLElement, obj: Object): Object {
  if (elem.attributes == null) return obj;
  const result = Array.from(elem.attributes).reduce((result, attr) => {
    switch(attr.name) {
      case 'disabled':
      case 'hidden':
        return Object.assign({}, result, { readonly: true });
      case 'minimum':
        return Object.assign({}, result, { minItems: parseInt(attr.value) });
      case 'pattern':
        return Object.assign({}, result, { pattern: attr.textContent });
      case 'unique':
        return Object.assign({}, result, { uniqueItems: true });
      case 'value':
        return Object.assign({}, result, { default: attr.textContent });
      //..
      default:
        return result;
    }
  }, obj);
  if (elem.nodeName !== 'SELECT') return result;
  return Object.assign({}, result, {
    enum: Array.from(elem.children).map((child) => {
      const option: HTMLOptionElement = (child: any);
      return option.value;
    })
  });
}

function setAttribute(elem: HTMLElement, key: string, val : string): HTMLElement {
  const input: HTMLInputElement = (elem: any);
  switch(key) {
    case 'default':
      input.defaultValue = val;
      break;
    case 'minItems':
      elem.setAttribute('minimum', val);
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
      elem.setAttribute('unique', 'true');
      break;
  }
  return elem;
}

function definition(obj: Object, defs: Object): Object {
  if (!isString(obj['$ref'])) {
    throw new Error('$ref should be non-empty string');
  }
  const match = obj['$ref'].match(/^\#\/definitions\/([A-Za-z0-9]+?)$/);
  if (!isArray(match)) {
    throw new Error('no schema definition matches');
  }
  return Object.assign({}, defs[match[1]]);
}

function isDescendant(parent: HTMLElement, child: HTMLElement): boolean {
  if (child == null) return false;
  if (parent == child) return true;
  const _parent: HTMLElement = (child.parentElement: any);
  return isDescendant(parent, _parent);
}

function generateForm(schema: Object): HTMLElement[] {
  let form: HTMLElement[] = [];
  try {
    if (!isObject(schema.properties)) {
      throw new Error('schema properties should be object');
    }
    const defs = schema.definitions;
    const props = schema.properties;
    const reqs = schema.required;
    const elems = recurse(props, (obj, key) => {
      const elem = arrayFromObject(obj).reduce((result, [k, v]) => {
        return setAttribute(result, k, v);
      }, generateElement(obj, defs));
      if (!isArray(reqs) || !reqs.includes(key)) return elem;
      return setAttribute(elem, 'required', 'true');
    });
    form = Object.keys(elems).reduce((result, key) => {
      if (elems[key] == null) return result;
      const div = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = key;
      if (elems[key].hasAttribute('hidden')) label.hidden = true;
      div.appendChild(label);
      div.appendChild(elems[key]);
      return result.concat(div);
    }, []);
  } catch(err) {
    console.error(err);
  }
  return form;
}

function addValue(obj: Object, elem: HTMLElement, label: HTMLElement): Object {
  const val = parseElement(elem);
  if (val == null || (isArray(val) && val.some((x) => x == null))) return obj;
  return Object.assign({}, obj, { [label.textContent]: val } );
}

function parseForm(form: HTMLElement[]): Object {
  let obj = {};
  try {
    obj = form.reduce((result, div) => {
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
  } catch(err) {
    console.error(err);
  }
  return obj;
}

function schemafyForm(form: HTMLElement[]): Object  {
  let schema = {};
  try {
    schema = form.reduce((result, div) => {
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
        properties: Object.assign({}, result.properties,
          { [label.textContent]: getAttributes(elem, obj) }
        ),
        required: addRequired(result.required, elem, label)
      });
    }, {
      properties: {},
      required: [],
      type: 'object'
    });
  } catch(err) {
    console.error(err);
  }
  return schema;
}

exports.generateForm = generateForm;
exports.parseForm = parseForm;
exports.schemafyForm = schemafyForm;
