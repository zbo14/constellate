'use strict';

const util = require('./util.js');
const schema = require('./schema.js');

const { digestBase64, isNull, isArray, isBoolean, isNumber, isObject, isString, arrayFromObject, hasKeys, merge, orderObject, recurse, withoutKeys } = util;

/**
* @module constellate/src/spec
*/

// TODO: flow-types, move to `src/`

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
        const header = getHeader(obj.properties);
        if (isObject(header)) { obj = merge(obj, { properties: header }); }
        const form = generateForm(obj);
        form.forEach((div) => fieldset.appendChild(div));
        return fieldset;
      case 'string':
        return newInput('text');
      default:
        const def = definition(obj, defs);
        if (isObject(def)) { return generateElement(def, defs); }
    }
    throw new Error('unexpected type: ' + obj.type);
}

function evalElement(elem) {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return evalForm(Array.from(elem.children));
    case 'INPUT':
      switch(elem.type) {
        case 'checkbox':
          if (!isBoolean(elem.value)) {
            throw new Error('input[type="checkbox"] has non-boolean value');
          }
          return elem.value;
        case 'number':
          if (!isNumber(elem.value)) {
            throw new Error('input[type="number"] has non-number value');
          }
          return elem.value;
        case 'text':
          if (!isString(elem.value)) {
            throw new Error('input[type="text"] has non-string value');
          }
          return elem.value;
        default:
          throw new Error('unexpected type: ' + elem.type);
      }
    case 'OL':
      if (!elem.children.length) {
        throw new Error('<ol> has no children');
      }
      return Array.from(elem.children).reduce((result, child) => {
          if (child.nodeName !== 'LI') { return result; }
          return result.concat(evalElement(child.children[0]));
      }, []);
    case 'SELECT':
      return elem.value;
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}

function parseElement(elem) {
  switch(elem.nodeName) {
    case 'FIELDSET':
      if (!elem.children.length) {
        throw new Error('fieldset has no children');
      }
      return parseForm(Array.from(elem.children));
    case 'INPUT':
      switch(elem.type) {
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
      if (isNull(li)) {
        throw new Error('<ol> has no <li>');
      }
      if (!li.children.length) {
        throw new Error('<li> has no children');
      }
      return {
        'type': 'array',
        'items': parseElement(li.firstChild),
        'minItems': 1,
        'uniqueItems': true
      }
    case 'SELECT':
      if (!elem.children.length) {
        throw new Error('select has no children');
      }
      return {
        'type': typeof elem.firstChild.value,
        'enum': Array.from(elem.children)
      }
    default:
      throw new Error('unexpected nodeName: ' + elem.nodeName);
  }
}

function getAttributes(elem, obj) {
  if (isNull(elem.attributes)) { return obj; }
  const result = Array.from(elem.attributes).reduce((result, attr) => {
    switch(attr.name) {
      case 'disabled':
      case 'hidden':
        return merge(result, { readonly: true });
      case 'pattern':
        return merge(result, { pattern: attr.textContent });
      case 'value':
        return merge(result, { default: attr.textContent });
      //..
      default:
        return result;
    }
  }, obj);
  if (elem.nodeName !== 'SELECT') { return result; }
  return merge(result, { enum: Array.from(elem.children).map((option) => option.value) });
}

function setAttribute(elem, key, val) {
  switch(key) {
    case 'default':
      elem.defaultValue = val;
      break;
    case 'pattern':
      elem.pattern = val;
      break;
    case 'readonly':
      elem.disabled = val;
      elem.hidden = val;
      break;
    case 'required':
      elem.required = val;
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
  return merge(defs[match[1]]);
}

function isDescendant(parent, child) {
  if (isNull(child)) { return false; }
  if (parent == child) { return true; }
  return isDescendant(parent, child.parentElement);
}

function generateForm(_schema) {
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
      if (!isArray(reqs) || !reqs.includes(key)) { return elem; }
      return setAttribute(elem, 'required', true);
    });
    return Object.keys(elems).reduce((result, key) => {
      if (isNull(elems[key])) { return result; }
      const div = document.createElement('div');
      const label = document.createElement('label');
      label.textContent = key;
      if (elems[key].hasAttribute('hidden')) { label.hidden = true; }
      div.appendChild(label);
      div.appendChild(elems[key]);
      return result.concat(div);
    }, []);
  } catch(err) {
    console.error(err.message);
  }
}

function addRequired(reqs, elem, label) {
    if (!elem.hasAttribute('required')) { return reqs; }
    return reqs.concat(label.textContent);
  }

function addValue(obj, elem, label) {
  const val = evalElement(elem);
  if (isNull(val) || (isArray(val) && val.some((x) => isNull(x)))) { return obj; }
  return merge(obj, { [label.textContent]: val } );
}

function evalForm(form) {
  try {
    return form.reduce((result, div) => {
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
    console.error(err.message);
  }
}

function parseForm(form) {
  try {
    return form.reduce((result, div) => {
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
      return merge(result, {
        properties: merge(
          result.properties,
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
    console.error(err.message);
  }
}

function setId(obj) {
   return merge(obj, { '@id': digestBase64(orderObject(withoutKeys(obj, '@id'))) });
 }

function checkId(obj) {
  return obj['@id'] === setId(obj)['@id'];
}

function validate(obj, _schema) {
  if (!checkId(obj)) {
    console.log(obj);
    throw new Error('obj has invalid id: ' + obj['@id']);
  }
  if (!schema.validate(obj, _schema)) {
    throw new Error('obj has invalid schema: ' + JSON.stringify(obj, null, 2));
  }
  return true;
}

function validateForm(form) {
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
      const obj = parseElement(elem);
      if (!isObject(obj)) {
        throw new Error('expected non-empty object; got ' + JSON.stringify(obj));
      }
      return merge(result, {
        schema: {
          properties: merge(
            result.schema.properties,
            { [label.textContent]: getAttributes(elem, obj) }
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
    const valuesWithId = setId(result.values);
    validate(valuesWithId, result.schema);
    return valuesWithId;
  } catch(err) {
    console.error(err.message);
  }
}

function getHeader(obj) {
  if (!hasKeys(obj, '@type', '@id')) { return null; }
  return {
    '@type': obj['@type'],
    '@id': obj['@id']
  }
}

exports.checkId = checkId;
exports.getHeader = getHeader;
exports.setId = setId;
exports.validate = validate;

exports.evalForm = evalForm;
exports.generateForm = generateForm;
exports.parseForm = parseForm;
exports.validateForm = validateForm;
