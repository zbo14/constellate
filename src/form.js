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
  traverse,
  withoutIndex
} = require('../lib/util.js');

// @flow

/**
* @module constellate/src/form
*/

function newInput(type: string, val?: any): HTMLInputElement {
  const input = document.createElement('input');
  input.type = type;
  if (val) input.value = val;
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
          return (isBoolean(input.checked) ? input.checked: null);
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
  let elem : HTMLElement = document.createElement('null');
  switch(schema.type) {
    case 'array':
      elem = document.createElement('ol');
      let li : HTMLLIElement;
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
      return elem;
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

function setAttribute(elem: HTMLElement, key: string, val: any) {
  const input: HTMLInputElement = (elem: any);
  switch(key) {
    case 'enum':
      if (val && val.length && elem.hasAttribute('type')) {
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
      input.disabled = val;
      input.hidden = val;
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
    if (elem.hasAttribute('required')) result.required.push(label.textContent);
    return Object.assign({}, result, {
      properties: Object.assign({}, result.properties,
        { [label.textContent]: getAttributes(elem, schema) }
      ),
      required: result.required
    });
  }, {
    $schema: Draft,
    properties: {},
    required: [],
    type: 'object'
  });
}

function objectToForm(obj: Object): Promise<HTMLFormElement> {
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

function propertyDependencyHandler(div2: HTMLElement, negate: boolean): Function {
  return (evt) => {
    const input : HTMLInputElement = (evt.target : any);
    if (!input || input.nodeName !== 'INPUT') return;
    const elem2 : HTMLElement = (div2.lastChild : any);
    if (!elem2) throw new Error('expected element');
    const hasVal = hasInputValue(input);
    const hidden = (negate ? hasVal: false);
    const disabled = (negate ? hasVal: false);
    const required = (negate ? !hasVal : hasVal);
    div2.hidden = hidden;
    const remover : HTMLElement = (div2.previousElementSibling : any);
    if (remover && remover.nodeName === 'BUTTON') {
      const adder : HTMLElement = (remover.previousElementSibling : any);
      if (!adder) throw new Error('expected adder and remover btns');
      adder.hidden = remover.hidden = hidden;
    }
    getInputs(elem2).forEach((input) => {
      input.disabled = disabled;
      input.required = required;
    });
  }
}

function schemaDependencyHandler1(div2 : HTMLElement, negate: boolean, schema: Object): Function {
  return (evt) => {
    const input : HTMLInputElement = (evt.target : any);
    if (!input || input.nodeName !== 'INPUT' || !hasInputValue(input)) return;
    const elem2 : HTMLElement = (div2.lastChild : any);
    if (!elem2) throw new Error('expected element');
    const errors = validateSchema(schema, elementToValue(elem2));
    if (!errors === negate) {
      div2.replaceChild(schemaToElement(schema), elem2);
    }
  }
}

function schemaDependencyHandler2(div1: HTMLElement, div2: HTMLElement, negate: boolean, schema : Object): Function {
  return (evt) => {
    const input : HTMLInputElement = (evt.target : any);
    if (!input || input.nodeName !== 'INPUT') return;
    const elem1 : HTMLElement = (div1.lastChild : any);
    if (!elem1) throw new Error('expected element');
    if (!getInputs(elem1).some(hasInputValue)) return;
    const elem2 : HTMLElement = (div2.lastChild : any);
    if (!elem2) throw new Error('expected element');
    const errors = validateSchema(schema, elementToValue(elem2));
    if (!errors === negate) {
      div2.replaceChild(schemaToElement(schema), elem2);
    }
  }
}

function schemaHandler(divs: HTMLElement[], isValid: Function, subschemas: Object[]): Function {
  return (evt) => {
    if (evt.target.nodeName !== 'INPUT') return;
    let elem : HTMLElement,
        label : HTMLLabelElement;
    const val = divs.reduce((result, div) => {
      if (!(elem = (div.lastChild : any))) {
        throw new Error('expected element');
      }
      if (!(label = (div.firstChild : any)) || label.nodeName !== 'LABEL') {
        throw new Error('expected label');
      }
      return Object.assign({}, result, {
        [label.textContent]: elementToValue(elem)
      });
    }, {});
    if (!isValid(val)) {
      divs.forEach((div, i) => {
        if (!(elem = (div.lastChild : any))) {
          throw new Error('expected element');
        }
        div.replaceChild(schemaToElement(subschemas[i]), elem);
      });
    }
  }
}

function setDependencies(deps: Object, form: HTMLFormElement, negate: boolean) {
  const divs : HTMLElement[] = Array.from(form.children).filter((child) => {
    if (child && child.nodeName === 'DIV') return (child : any);
  });
  const keys = Object.keys(deps);
  divs.forEach((div1, i) => {
    const label1 : HTMLLabelElement = (div1.firstChild : any);
    if (!label1 || label1.nodeName !== 'LABEL') throw new Error('expected label');
    if (!keys.includes(label1.textContent)) return;
    const dep = deps[label1.textContent];
    if (isArray(dep)) {
      withoutIndex(divs, i).forEach((div2) => {
        const label2 : HTMLLabelElement = (div2.firstChild : any);
        if (!label2 || label2.nodeName !== 'LABEL') throw new Error('expected label');
        if (!dep.includes(label2.textContent)) return;
        const handler = propertyDependencyHandler(div2, negate);
        div1.addEventListener('input', handler);
        // div1.addEventListener('change', handler);
      });
    } else if (isObject(dep)) {
      if (!isObject(dep.properties)) {
        throw new Error('expected non-empty object for dep properties');
      }
      withoutIndex(divs, i).forEach((div2) => {
        const label2 : HTMLLabelElement = (div2.firstChild : any);
        if (!label2 || label2.nodeName !== 'LABEL') throw new Error('expected label');
        const schema : Object = (dep.properties[label2.textContent] : any);
        if (!isObject(schema)) return;
        const handler1 = schemaDependencyHandler1(div2, negate, schema)
        const handler2 = schemaDependencyHandler2(div1, div2, negate, schema);
        div1.addEventListener('input', handler1);
        div2.addEventListener('input', handler2);
        // div1.addEventListener('change', handler1);
        // div2.addEventListener('change', handler2);
      });
    } else {
      throw new Error('expected array/object for dep; got ' + typeof dep);
    }
  });
}

function setSchema(form: HTMLFormElement, negate: boolean, schema: Object, subschemas: Object[], keyword?: string) {
  const divs : HTMLElement[] = Array.from(form.children).filter((child) => {
    if (child && child.nodeName === 'DIV') return (child : any);
  });
  let isValid: Function;
  if (!keyword) {
    isValid = (val: Object): boolean => {
      const errors = validateSchema(schema, val);
      return !!errors === negate;
    }
  } else {
    const schemas: Object[] = (schema[keyword] : any);
    if (!isArray(schemas)) return;
    switch(keyword) {
      case 'allOf':
        isValid = (val: Object): boolean => {
          return schemas.every((schema) => {
            const errors = validateSchema(schema, val);
            return !!errors === negate;
          });
        }
        break;
      case 'anyOf':
        isValid = (val: Object): boolean => {
          return schemas.some((schema) => {
            const errors = validateSchema(schema, val);
            return !!errors === negate;
          });
        }
        break;
      case 'oneOf':
        isValid = (val: Object): boolean => {
          return schemas.filter((schema) => {
            const errors = validateSchema(schema, val);
            return !errors;
          }).length === 1;
        }
        break;
      //..
      default:
        throw new Error('unexpected keyword: ' + JSON.stringify(keyword));
    }
  }
  const handler = schemaHandler(divs, isValid, subschemas);
  form.addEventListener('input', handler);
  // form.addEventListener('change', handler);
}

function schemaToForm(schema: Object): HTMLFormElement {
  if (!isObject(schema.properties)) {
    throw new Error('schema properties should be non-empty object');
  }
  const form = document.createElement('form');
  const props = schema.properties;
  const reqs = schema.required;
  const subschemas = [];
  let div : HTMLDivElement, elem : HTMLElement, label : HTMLLabelElement;
  arrayFromObject(props).forEach(([key, subschema]) => {
    elem = schemaToElement(subschema);
    if (isArray(reqs) && reqs.includes(key)) setAttribute(elem, 'required');
    div = (document.createElement('div') : any);
    label = (document.createElement('label') : any);
    label.textContent = key;
    label.hidden = elem.hidden;
    div.appendChild(label);
    div.appendChild(elem);
    form.appendChild(div);
    subschemas.push(subschema);
  });
  if (isObject(schema.dependencies)) {
    setDependencies(schema.dependencies, form, false);
  }
  if (isObject(schema.not)) {
    setSchema(form, true, schema.not, subschemas);
    if (isObject(schema.not.dependencies)) {
      setDependencies(schema.not.dependencies, form, true);
    }
  }
  setSchema(form, false, schema, subschemas, 'allOf');
  setSchema(form, false, schema, subschemas, 'anyOf');
  setSchema(form, false, schema, subschemas, 'oneOf');
  form.appendChild(newInput('submit'));
  return form;
}

exports.formToObject = formToObject;
exports.formToSchema = formToSchema;
exports.getInputs = getInputs;
exports.objectToForm = objectToForm;
exports.schemaToForm = schemaToForm;
