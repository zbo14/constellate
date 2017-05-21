const { encodeKeypair } = require('./lib/crypto.js');
const ed25519 = require('./lib/ed25519.js');
const rsa = require('./lib/rsa.js');
const secp256k1 = require('./lib/secp256k1.js');
const FileSaver = require('file-saver');
const { generateForm, parseForm } = require('./lib/form.js');
const { generateFrames, readTags, writeTags } = require('./lib/id3.js');
const { encodeBase58, decodeBase58 } = require('./lib/util.js');

const {
  getClaimsSchema,
  newEd25519Header,
  newRsaHeader,
  newSecp256k1Header,
  setClaimsId,
  signClaims,
  timestamp,
  validateClaims,
  verifyClaims
} = require('./lib/jwt.js');

const {
  getMetaSchema,
  setMetaId,
  validateMeta
} = require('./lib/meta.js');

const {
  getPartySchema,
  setAddr,
  validateParty
} = require('./lib/party.js');

const audio = document.getElementById('audio');
const claims = document.getElementById('claims');
const form = document.querySelector('form');
const meta = document.getElementById('meta');
const mode = document.getElementById('mode');
const ols = document.getElementsByTagName('ol');
const party = document.getElementById('party');
const pub = document.getElementById('pub');
const sig = document.getElementById('sig');
const submit = document.createElement('input');
submit.type = 'submit';

const keySelect = document.getElementById('key-select');
const schemaSelect = document.getElementById('schema-select');

const newKeypairBtn = document.getElementById('new-keypair-btn');
const readTagsBtn = document.getElementById('read-tags-btn');
const signClaimsBtn = document.getElementById('sign-claims-btn');
const writeTagsBtn = document.getElementById('write-tags-btn');
const verifySigBtn = document.getElementById('verify-sig-btn');

readTagsBtn.addEventListener('click', () => {
  readTags(audio, (tags) => {
    console.log(tags);
  });
}, false);

writeTagsBtn.addEventListener('click', () => {
  const frames = generateFrames(JSON.parse(meta.textContent));
  console.log(frames);
  writeTags(audio, frames, (writer) => {
    console.log(writer.getBlob());
    FileSaver.saveAs(writer.getBlob(), 'test.mp3');
  });
}, false);

newKeypairBtn.addEventListener('click', () => {
  let keypair, publicKey;
  if (keySelect.value === 'ed25519') {
    const password = prompt('Please enter a password to generate ed25519 keypair', 'passwerd');
    if (!password) return;
    keypair = ed25519.keypairFromPassword(password);
    publicKey = encodeBase58(keypair.publicKey);
    console.log(encodeBase58(keypair.privateKey));
  }
  if (keySelect.value === 'rsa') {
    keypair = rsa.generateKeypair();
    publicKey = keypair.publicKey.toString();
    console.log(keypair.privateKey.toString());
  }
  if (keySelect.value === 'secp256k1') {
    keypair = secp256k1.generateKeypair();
    publicKey = encodeBase58(keypair.publicKey);
    console.log(encodeBase58(keypair.privateKey));
  }
  pub.textContent = publicKey;
}, false);

signClaimsBtn.addEventListener('click', () => {
  const encodedKey = prompt('Please enter your secret key to sign claims', '');
  if (!encodedKey) return;
  try {
    const claimsObj = JSON.parse(claims.textContent);
    let header, privateKey, publicKey;
    if (keySelect.value === 'ed25519') {
      privateKey = decodeBase58(encodedKey);
      publicKey = decodeBase58(pub.textContent);
      header = newEd25519Header(publicKey);
    }
    if (keySelect.value === 'rsa') {
      privateKey = rsa.importPrivateKey(encodedKey);
      publicKey = rsa.importPublicKey(pub.textContent);
      header = newRsaHeader(publicKey);
    }
    if (keySelect.value === 'secp256k1') {
      privateKey = decodeBase58(encodedKey);
      publicKey = decodeBase58(pub.textContent);
      header = newSecp256k1Header(publicKey);
    }
    sig.setAttribute('value', encodeBase58(signClaims(claimsObj, header, privateKey)));
  } catch(err) {
    console.error(err);
  }
}, false);

verifySigBtn.addEventListener('click', () => {
  try {
    const claimsObj = JSON.parse(claims.textContent);
    let header, publicKey;
    if (keySelect.value === 'ed25519') {
      publicKey = decodeBase58(pub.textContent);
      header = newEd25519Header(publicKey);
    }
    if (keySelect.value === 'rsa') {
      publicKey = rsa.importPublicKey(pub.textContent);
      header = newRsaHeader(publicKey);
    }
    if (keySelect.value === 'secp256k1') {
      publicKey = decodeBase58(pub.textContent);
      header = newSecp256k1Header(publicKey);
    }
    const metaObj = JSON.parse(meta.textContent);
    const signature = decodeBase58(sig.value);
    console.log(verifyClaims(claimsObj, header, metaObj, signature));
  } catch(err) {
    console.error(err);
  }
}, false);

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
    });
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

schemaSelect.addEventListener('change', () => {
  form.innerHTML = null;
  mode.setAttribute('value', schemaSelect.selectedOptions[0].parentNode.label);
  keySelect.hidden = true;
  newKeypairBtn.hidden = true;
  signClaimsBtn.hidden = true;
  verifySigBtn.hidden = true;
  let schema;
  try {
    switch(mode.value) {
      case 'party':
        schema = getPartySchema(schemaSelect.value);
        keySelect.hidden = false;
        newKeypairBtn.hidden = false;
        break;
      case 'meta':
        schema = getMetaSchema(schemaSelect.value);
        break;
      case 'claims':
        schema = getClaimsSchema(schemaSelect.value);
        signClaimsBtn.hidden = false;
        verifySigBtn.hidden = false;
        break;
      default:
        throw new Error('unexpected mode: ' + mode.value);
    }
    generateForm(schema).forEach((div) => form.appendChild(div));
    form.appendChild(submit);
    listModifiers();
  } catch(err) {
    console.error(err);
  }
}, false);

function includeElement(elem, label) {
  switch (elem.nodeName) {
    case 'INPUT':
      if (!elem.value) return false;
      return true;
    case 'FIELDSET':
      if (!elem.children.length) return false;
      return Array.from(elem.children).map((div) => {
        if (!div.children.length) {
          if (!elem.hasAttribute('required')) return false;
          throw new Error(label.textContent + ' is required');
        }
        return includeElement(div.lastChild);
      }).every((bool) => bool);
    case 'OL':
      if (!elem.children.length) {
        if (!elem.hasAttribute('required')) return false;
        throw new Error(label.textContent + ' is required');
      }
      return Array.from(elem.children).map((li) => {
        if (!li.children.length) return false;
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
    const obj = parseForm(divs);
    if (!obj) return;
    switch(mode.value) {
      case 'party':
        let publicKey;
        if (keySelect.value === 'ed25519' || keySelect.value === 'secp256k1') {
          publicKey = decodeBase58(pub.textContent);
        }
        if (keySelect.value === 'rsa') {
          publicKey = rsa.importPublicKey(pub.textContent);
        }
        const partyObj = setAddr(obj, publicKey);
        if (validateParty(partyObj, publicKey)) {
          party.textContent = JSON.stringify(partyObj, null, 2);
        }
        return;
      case 'meta':
        const metaObj = setMetaId(obj);
        if (validateMeta(metaObj)) {
          meta.textContent = JSON.stringify(metaObj, null, 2);
        }
        return;
      case 'claims':
        const claimsObj = setClaimsId(timestamp(obj));
        if (validateClaims(claimsObj, JSON.parse(meta.textContent))) {
          claims.textContent = JSON.stringify(claimsObj, null, 2);
        }
        return;
      default:
        throw new Error('unexpected mode: ' + mode.value);
      }
  } catch(err) {
    console.error(err);
  }
}, false);
