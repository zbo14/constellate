// const crypto = require('./lib/crypto.js');
const schema = require('./lib/schema.js');
const spec = require('./lib/spec.js');
const util = require('./lib/util.js');

const button = document.querySelector('button');
const form = document.querySelector('form');
// const generateKeypair = document.getElementById('generate-keypair');
const ols = document.getElementsByTagName('ol');
const password = document.querySelector('input[type="password"]');
const pre = document.querySelector('pre');

let _schema;
const select = document.querySelector('select');
const submit = document.createElement('input');
submit.type = 'submit';

/*
button.addEventListener('click', () => {
  if (password.value == null) {
    console.error('password required to generate keypair');
    return;
  }
  const keypair = crypto.generateKeypairFromPassword(password.value);
  if (keypair == null) {
    console.error('failed to generate keypair');
    return;
  }
  pre.textContent = JSON.stringify({
    privateKey: util.encode_base58(keypair.privateKey),
    publicKey: util.encode_base58(keypair.publicKey)
  });
})
*/

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
      if (!ol.children.length) { return; }
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
  // generateKeypair.hidden = true;
  switch(select.value) {
    case 'artist':
      // generateKeypair.hidden = false;
      _schema = schema.Artist;
      break;
    case 'organization':
      // generateKeypair.hidden = false;
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
}, false);

function includeElement(elem) {
  switch (elem.nodeName) {
    case 'INPUT':
      if (elem.type === 'text' && !elem.value) { return false; }
      return true;
    case 'FIELDSET':
      if (!elem.children.length) { return false; }
      return Array.from(elem.children).map((div) => {
        if (!div.children.length) { return false; }
        return includeElement(div.lastChild);
      }).every((bool) => bool);
    case 'OL':
      if (!elem.children.length) { return false; }
      return Array.from(elem.children).map((li) => {
        if (!li.children.length) { return false; }
        return includeElement(li.firstChild);
      }).every((bool) => bool);
    case 'SELECT':
      return true;
    default:
      return false;
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const divs = Array.from(form.children).filter((div) => {
    return div.nodeName === 'DIV' && includeElement(div.lastChild);
  });
  pre.textContent = JSON.stringify(spec.validateForm(divs), null, 2);
}, false);
