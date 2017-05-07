// const crypto = require('./lib/crypto.js');
const schema = require('./lib/schema.js');
const spec = require('./lib/spec.js');
const util = require('./lib/util.js');

const button = document.querySelector('button');
const form = document.querySelector('form');
const generateKeypair = document.getElementById('generate-keypair');
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
  Array.from(ols).forEach((ol, idx) => {
    const remover = document.createElement('button');
    remover.className = 'remover';
    remover.id = 'remover-' + idx;
    remover.textContent = '-';
    remover.addEventListener('click', (event) => {
      event.preventDefault();
      if (ol.children.length <= 3) { return; }
      ol.removeChild(ol.lastChild);
    })
    ol.prepend(remover);
    const adder = document.createElement('button');
    adder.className = 'adder';
    adder.id = 'adder-' + idx;
    adder.textContent = '+';
    adder.addEventListener('click', (event) => {
      event.preventDefault();
      ol.appendChild(ol.lastChild.cloneNode(true));
    });
    ol.prepend(adder);
  });
}

select.addEventListener('change', () => {
  form.innerHTML = null;
  generateKeypair.hidden = true;
  switch(select.value) {
    case 'artist':
      generateKeypair.hidden = false;
      _schema = schema.artist;
      break;
    case 'organization':
      generateKeypair.hidden = false;
      _schema = schema.organization;
      break;
    case 'composition':
      _schema = schema.composition;
      break;
    case 'recording':
      _schema = schema.recording;
      break;
    default:
      console.error(`unexpected type: ${select.value}`);
      return;
  }
  spec.generateForm(_schema).forEach((div) => form.appendChild(div));
  form.appendChild(submit);
  listModifiers();
}, false);

form.addEventListener('submit', (event) => {
  event.preventDefault();
  pre.textContent = JSON.stringify(spec.validateForm(Array.from(form.children).slice(0, -1)), null, 2);
}, false);
