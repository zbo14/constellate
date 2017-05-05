'use strict';

const bs58 = require('bs58');
const util = require('./util.js');
const { base64_digest, orderStringify } = util;
const schema = require('./schema.js');

/**
* @module constellate/src/spec
*/

const empty = (x) => x == null
const array = (arr) => !empty(arr) && typeof arr === 'object' && arr.length > 0
const boolean = (bool) => !empty(bool) && typeof bool === 'boolean';
const number = (num) => !empty(num) && typeof num === 'number';
const object = (obj) => !empty(obj) && typeof obj === 'object' && obj.constructor === Object && Object.keys(obj).length > 0;
const string = (str) => !empty(str) && typeof str === 'string' && str.length > 0;

const isEqual = (val1, val2) => orderStringify(val1) === orderStringify(val2);

const negate = (pred) => (...args) => !pred(...args);

const encodeBase58 = (publicKey) => {
  if (empty(publicKey)) { return null; }
  return bs58.encode(publicKey);
}

const orderObject = (obj) => JSON.parse(orderStringify(obj));

const merge = (...x) => Object.assign({}, ...x);

const hasKey = (obj, key) => object(obj) && obj.hasOwnProperty(key) && !empty(obj[key]);

const hasKeys = (obj, ...keys) => {
  if (!array(keys)) { return false; }
  return keys.every((key) => hasKey(obj, key));
}

const toArray = (x) => {
    if (empty(x)) { return null; }
    return [].concat(x);
}

const map = (arr, fn) => {
    if (!array(arr)) { return null; }
    return arr.map(fn);
}

const zip = (...arrs) => {
  if (!array(arrs)) { return null; }
  return arrs[0].map((_, i) => arrs.map((arr) => arr[i]));
}

const repeat = (x, n) => _repeat(x, n, []);

const _repeat = (x, n, arr) => {
  if (n === 0) { return arr; }
  return _repeat(x, n-1, arr.concat(x));
}

const returns = (preds, succeeds, fails) => (...args) => {
  return default_return(
    (arr) => arr.reduce((result, [pred, succeed, fail]) => {
      if (!array(result)) { return null; } //..
      return toArray(_return(pred, succeed, fail)(...result));
    }, args)),
  (default_return(zip)(preds, succeeds, fails));
}

const _return = (pred, succeed, fail) => (...args) => {
  if (!pred(...args)) { return fail(...args); }
  return succeed(...args);
}

const default_return = (fn) => _return(negate(empty), fn, null);

// console.log(returns(
//  repeat((x) => x < 8, 4),
//  repeat((x) => x + 1, 4),
//  repeat(null, 4)
// )(4));

const arrayToObject = (arr) => {
  return arr.reduce((result, [key, val]) => merge(result, {[key]: val}), {});
}

const arrayFromObject = (obj) => Object.keys(obj).map((key) => [key, obj[key]]);

const recurse = (x, fn) => {
  if (array(x)) { return x.map((y) => recurse(fn(y), fn)); }
  if (object(x)) { return merge(...Object.keys(x).map((k) => arrayToObject([[k, recurse(fn(x[k], k), fn)]]))); }
  return x;
}

const recurseFreeze = (x) => recurse(x, Object.freeze);

const addValues = (obj, arr) => {
  return arr.reduce((result, [key, val]) => addValue(result, key, val), merge(obj));
}

const removeValues = (obj, arr) => {
  return arr.reduce((result, [key, val]) => removeValue(result, key, val), obj);
}

const addValue = (obj, key, val) => {
  if (empty(val)) { return obj; }
  if (!hasKey(obj, key)) {
    return merge(obj, arrayToObject([[key, val]]));
  }
  return merge(obj, arrayToObject([[key, toArray(obj[key]).concat(val)]]));
}

const removeValue = (obj, key, val) => {
  if (!hasKey(obj, key)) { return obj; }
  let vals = toArray(obj[key]).reduce((result, _val) => {
    if (isEqual(val, _val)) { return result; }
    return result.concat(_val);
  }, []);
  if (!array(vals)) { return withoutKeys(obj, key); }
  return merge(obj, arrayToObject([[key, vals]]));
}

const withKeys = (obj, ...keys) => keys.reduce((result, key) => {
  if (!hasKey(obj, key)) { return result; }
  return merge(result, arrayToObject([[key, obj[key]]]));
  }, {});

const withoutKeys = (obj, ...keys) => Object.keys(obj).reduce((result, key) => {
  if (keys.includes(key)) { return result; }
  return merge(result, arrayToObject([[key, obj[key]]]));
}, {});

//--------------------------------------------------------------------------------

const input = (type) => {
  let input = document.createElement('input');
  input.type = type;
  return input;
}

const generateElement = (obj, defs) => {
  if (!object(obj)) { return null; }
    switch(obj.type) {
      case 'array':
        const elem = generateElement(obj.items, defs);
        if (empty(elem)) { return null; }
        let ol = document.createElement('ol');
        let li = document.createElement('li');
        li.appendChild(elem);
        ol.appendChild(li);
        return ol;
      case 'boolean':
        return input('checkbox');
      case 'integer':
      case 'number':
        return input('number');
      case 'object':
        let fieldset = document.createElement('fieldset');
        const form = generateForm(obj);
        if (empty(form)) { return null; }
        form.forEach((div) => fieldset.appendChild(div));
        return fieldset;
      case 'string':
        return input('text');
      default:
        const def = definition(obj, defs);
        if (object(def)) { return generateElement(def, defs); }
    }
    return null;
}

const evalElement = (elem) => {
  switch(elem.nodeName) {
    case 'FIELDSET':
      const form = Array.from(elem.children);
      if (!array(form)) { return null; }
      return evalForm(form);
    case 'INPUT':
      switch(elem.type) {
        case 'checkbox':
          if (!boolean(elem.value)) { return null; }
          return elem.value;
        case 'number':
          if (!number(elem.value)) { return null; }
          return elem.value;
        case 'text':
          if (!string(elem.value)) { return null; }
          return elem.value;
        default:
          return null;
      }
    case 'OL':
      const list = Array.from(elem.children);
      if (!array(list)) { return null; }
      return list.map((li) => evalElement(li.children[0]));
    default:
      return null;
  }
}

const parseElement = (elem) => {
  switch(elem.nodeName) {
    case 'FIELDSET':
      const form = Array.from(elem.children);
      if (!array(form)) { return null; }
      return parseForm(form);
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
      const list = Array.from(elem.children);
      if (!array(list)) { return null; }
      return {
        'type': 'array',
        'items': parseElement(list[0].children[0]),
        'minItems': 1,
        'uniqueItems': true
      }
    default:
      return null;
  }
}

const attributes = (elem, obj) => {
  if (empty(elem) || empty(elem.attributes)) { return obj; }
  return Array.from(elem.attributes).reduce((result, attr) => {
    switch(attr.name) {
      case 'disabled':
      case 'hidden':
        return merge(result, {readonly: true});
      case 'pattern':
        return merge(result, {pattern: attr.textContent});
      //..
      default:
        return result;
    }
  }, obj);
}

const attribute = (elem, key, val) => {
  switch(key) {
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

const definition = (obj, defs) => {
  if (!object(defs) || !string(obj['$ref'])) { return null; }
  const match = obj['$ref'].match(/^\#\/definitions\/([A-Za-z0-9]+?)$/);
  if (!array(match)) { return null; }
  return merge(defs[match[1]]);
}

/*
const input = (type) => `<input type="${type}" />`;

const generateElement = (obj, defs) => {
  if (!object(obj)) { return null; }
  switch(obj.type) {
    case 'array':
      const elem = generateElement(obj.items, defs);
      if (empty(elem)) { return null; }
      return `<ol><li>${elem}</li></ol>`;
    case 'boolean':
      return input('checkbox');
    case 'integer':
    case 'number':
      return input('number');
    case 'object':
      return `<fieldset>${_form(obj)}</fieldset>`;
    case 'string':
      return input('text');
    default:
      const def = definition(obj, defs);
      if (object(def)) { return generateElement(def, defs); }
  }
  return null;
}

const attribute = (elem, str) => {
  const match = elem.match(/^(\<input.*)(\/\>)$/);
  if (!array(match)) { return elem; }
  return toArray(match[1]).concat([[str], match[2]]).join(' ');
}

const attributes = (elem, ...strs) => strs.reduce((result, str) => attribute(result, str), elem);

const include = (elem, str) => {
  const match = elem.match(/^(.*?\>)(.*)(\<.*)$/);
  if (!array(match)) { return elem; }
  return toArray(match[1]).concat([[match[2] + str], match[3]]).join('');
}

const field = (elem, key, val) => {
  switch(key) {
    case 'pattern':
      return attribute(elem, `pattern="${val}"`);
    case 'readonly':
      return attributes(elem, `disabled="${val}"`, `hidden="${val}"`);
    case 'required':
      return attribute(elem, `required="${val}"`);
    default:
      return elem;
  }
}

function generateForm(schema) {
  if (!object(schema) || !object(schema.properties)) { return null; }
  const divs = generateDIVs(schema);
  if (empty(divs)) { return null; }
  const form = document.createElement('form');
  if (string(schema.title)) { form.title = schema.title; }
  divs.forEach((div) => form.appendChild(div));
  const submit = document.createElement('input');
  submit.type = 'submit';
  form.appendChild(submit);
  return form;
  // return `<form>${form}</form>`;
}

function evalForm(form) {
  if (empty(form.children) || form.nodeName !== 'FORM') { return null; }
  const divs = Array.from(form.children);
  return evalDIVs(divs);
}

function parseForm(form) {
  if (empty(form.children) || form.nodeName !== 'FORM') { return null; }
  const divs = Array.from(form.children);
  const parsed = parseDIVs(divs);
  if (empty(parsed)) { return null; }
  return addValues(parsed, [
    ['schema', schema.SCHEMA],
    ['title', form.title],
    ['type', 'object']
  ]);
};
*/

const generateForm = (schema) => {
  if (!object(schema) || !object(schema.properties)) { return null; }
  const defs = recurseFreeze(schema.definitions);
  const props = recurseFreeze(schema.properties);
  const reqs = recurseFreeze(schema.required);
  const elems = recurse(props, (obj, key) => {
    let elem = generateElement(obj, defs);
    if (empty(elem)) { return null; }
    elem = arrayFromObject(obj).reduce((result, [k, v]) => {
      return attribute(result, k, v);
    }, elem);
    if (!array(reqs) || !reqs.includes(key)) { return elem; }
    return attribute(elem, 'required', true);
  });
  if (empty(elems)) { return null; }
  return Object.keys(elems).map((key) => {
    const div = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = key;
    div.appendChild(label);
    div.appendChild(elems[key]);
    return div;
  });
}

const evalForm = (form) => {
  if (!array(form)) { return null; }
  return form.reduce((result, div) => {
    if (empty(result) || empty(div.children) || div.nodeName !== 'DIV') { return null; }
    const children = Array.from(div.children);
    if (children.length !== 2) { return null; }
    const label = children[0];
    if (label.nodeName !== 'LABEL') { return null; }
    const elem = children[1];
    if (elem.hasAttribute('disabled') && elem.hasAttribute('hidden')) { return result; }
    const value = evalElement(elem);
    if (empty(value)) {
      if (elem.hasAttribute('required')) { return null; }
      return result;
    }
    return addValue(result, label.textContent, value);
  }, {});
}

const parseForm = (form) => {
  if (!array(form)) { return null; }
  const required = (elem, label, reqs) => {
    if (!elem.hasAttribute('required')) { return reqs; }
    return reqs.concat(label.textContent);
  }
  return form.reduce((result, div) => {
    if (empty(result) || empty(div.children) || div.nodeName !== 'DIV') { return null; }
    const children = Array.from(div.children);
    if (children.length !== 2) { return null; }
    const label = children[0];
    if (label.nodeName !== 'LABEL') { return null; }
    const elem = children[1];
    const obj = parseElement(elem);
    if (!object(obj)) { return null; }
    return merge(result, {
      properties: addValue(
        result.properties,
        label.textContent,
        attributes(elem, obj)
      ),
      required: required(elem, label, result.required)
    });
  }, {
    properties: {},
    required: [],
    type: 'object'
  });
}

// console.log(generateForm(schema.composition));

//--------------------------------------------------------------------------------

const removeURLs = (obj) => recurse(obj, (x) => {
  if (!object(x)) { return x; }
  return withoutKeys(x, 'url');
})

const setId = (obj) => merge(obj, {id: base64_digest(orderObject(withoutHeader(removeURLs(obj))))});

const checkId = (obj) => obj.id === setId(obj).id;

const validate = (obj, _schema) => {
  if (!checkId(obj)) { throw new Error(`Has invalid id: ${obj.id}`); }
  if (!schema.validate(obj, _schema)) { throw new Error(`Has invalid schema: ${obj}`); }
  return null;
}

const newHeader = (id, url) => merge({id: id, url: url});

const getHeader = (obj) => {
  if (!hasKeys(obj, 'id', 'url')) { return null; }
  return {id: obj.id, url: obj.url};
}

const withoutHeader = (obj) => withoutKeys(obj, 'id', 'url');

const setHeader = (obj, url) => merge(setId(obj), {url: url});

const newModel = (array, url) => setHeader(addValues({}, array), url);

const newUser = (email, isni, name, publicKey, url) => newModel(
  [
    ['email', email],
    ['isni', isni],
    ['name', name],
    ['publicKey', encodeBase58(publicKey)]
  ], url
);

const validateUser = (user) => validate(user, schema.user);

const newComposition = (
  arranger, composer, iswc, lyricist, publisher, recordedAs, title, url) => newModel(
  [
    ['arranger', map(toArray(arranger), getHeader)],
    ['composer', map(toArray(composer), getHeader)],
    ['iswc', iswc],
    ['lyricist', map(toArray(lyricist), getHeader)],
    ['publisher', map(toArray(publisher), getHeader)],
    ['recordedAs', map(toArray(recordedAs), getHeader)],
    ['title', title]
  ], url
);

let composer = newUser(
  'composer@email.com', '000000012150090X',
  'composer', null, 'http://www.composer.com'
);

let lyricist = newUser(
  'lyricist@email.com', '000000012250078X',
  'lyricist', null, 'http://www.lyricist.com'
);

let publisher = newUser(
  'publisher@email.com', '301006507115002X',
  'publisher', null, 'http://www.publisher.com'
);

let composition = newComposition(
  null, composer, 'T-034.524.680-1', lyricist, publisher,
  null, 'fire-song', 'http://www.composition.com'
);

const addCompositionValue = (comp, key, val) => {
  switch(key) {
    case 'arranger':
    case 'composer':
    case 'lyricist':
    case 'publisher':
    case 'recordedAs':
    return setId(addValue(comp, key, toArray(getHeader(val))));
  }
  return comp;
}

const removeCompositionValue = (comp, key, val) => {
  switch(key) {
    case 'arranger':
    case 'composer':
    case 'lyricist':
    case 'publisher':
    case 'recordedAs':
    return setId(removeValue(comp, key, getHeader(val)));
  }
  return comp;
}

const validateComposition = (comp) => validate(comp, schema.composition);

const newRecording = (
  isrc, performer, producer, recordingOf, recordLabel, url) => newModel(
  [
    ['isrc', isrc],
    ['performer', map(toArray(performer), getHeader)],
    ['producer', map(toArray(producer), getHeader)],
    ['recordingOf', getHeader(recordingOf)],
    ['recordLabel', map(toArray(recordLabel), getHeader)]
  ], url
);

const addRecordingValue = (rec, key, val) => {
  switch(key) {
    case 'performer':
    case 'producer':
    case 'recordLabel':
    return setId(addValue(rec, key, toArray(getHeader(val))));
  }
  return rec;
}

const removeRecordingValue = (rec, key, val) => {
  switch(key) {
    case 'performer':
    case 'producer':
    case 'recordLabel':
    return setId(removeValue(rec, key, getHeader(val)));
  }
  return rec;
}

const validateRecording = (rec) => validate(rec, schema.recording);

exports.evalForm = evalForm;
exports.generateForm = generateForm;
exports.parseForm = parseForm;

exports.newHeader = newHeader;
exports.newUser = newUser;
exports.newComposition = newComposition;
exports.newRecording = newRecording;

exports.addCompositionValue = addCompositionValue;
exports.addRecordingValue = addRecordingValue;

exports.removeCompositionValue = removeCompositionValue;
exports.removeRecordingValue = removeRecordingValue;

exports.validateUser = validateUser;
exports.validateComposition = validateComposition;
exports.validateRecording = validateRecording;
