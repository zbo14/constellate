const schema = require('./lib/schema.js');
const spec = require('./lib/spec.js');
const util = require('./lib/util.js');

const button = document.querySelector('button');
const form = document.querySelector('form');
const ols = document.getElementsByTagName('ol');
const password = document.querySelector('input[type="password"]');
const pre = document.querySelector('pre');

let _schema;
const select = document.querySelector('select');
const submit = document.createElement('input');
submit.type = 'submit';

function listModifiers() {
  const lis = Array.from(document.getElementsByTagName('li')).map((li) => {
    return li.cloneNode(true);
  });
  Array.from(ols).forEach((ol, idx) => {
    const remover = document.createElement('button');
    remover.className = 'remover';
    remover.id = 'remover-' + idx;
    remover.textContent = '-';
    remover.addEventListener('click', (event) => {
      event.preventDefault();
      if (!ol.children.length) return;
      if (ol.hasAttribute('required')
          && ol.hasAttribute('minimum')
          && parseInt(ol.attributes.minimum.value) === ol.children.length) {
        const label = ol.previousElementSibling;
        alert(label.textContent + ' is required');
        return;
      }
      ol.removeChild(ol.lastChild);
    })
    form.insertBefore(remover, ol.parentElement);
    const adder = document.createElement('button');
    adder.className = 'adder';
    adder.id = 'adder-' + idx;
    adder.textContent = '+';
    adder.addEventListener('click', (event) => {
      event.preventDefault();
      ol.appendChild(lis[idx].cloneNode(true));
    });
    form.insertBefore(adder, remover);
  });
}

select.addEventListener('change', () => {
  form.innerHTML = null;
  switch(select.value) {
    case 'artist':
      _schema = schema.Artist;
      break;
    case 'organization':
      _schema = schema.Organization;
      break;
    case 'composition':
      _schema = schema.Composition;
      break;
    case 'recording':
      _schema = schema.Recording;
      break;
    case 'album':
      _schema = schema.Album;
      break;
    default:
      console.error('unexpected type:', select.value);
      return;
  }
  spec.generateForm(_schema).forEach((div) => form.appendChild(div));
  form.appendChild(submit);
  listModifiers();
  pre.textContent = null;
}, false);

function includeElement(elem, label) {
  switch (elem.nodeName) {
    case 'INPUT':
      if (elem.type === 'text' && !elem.value) {
        return false;
      }
      return true;
    case 'FIELDSET':
      if (!elem.children.length) {
        return false;
      }
      return Array.from(elem.children).map((div) => {
        if (!div.children.length) {
          if (!elem.hasAttribute('required')) {
            return false;
          }
          throw new Error(label.textContent + ' is required');
        }
        return includeElement(div.lastChild);
      }).every((bool) => bool);
    case 'OL':
      if (!elem.children.length) {
        if (!elem.hasAttribute('required')) {
          return false;
        }
        throw new Error(label.textContent + ' is required');
      }
      return Array.from(elem.children).map((li) => {
        if (!li.children.length) {
          return false;
        }
        return includeElement(li.firstChild);
      }).every((bool) => bool);
    case 'SELECT':
      return true;
    default:
      return false;
  }
}

form.addEventListener('submit', (event) => {
  try {
    event.preventDefault();
    const divs = Array.from(form.children).filter((div) => {
      return div.nodeName === 'DIV'
             && div.children.length === 2
             && includeElement(div.lastChild, div.firstChild);
    });
    pre.textContent = JSON.stringify(spec.validateForm(divs), null, 2);
  } catch(err) {
    console.error(err);
  }
}, false);
