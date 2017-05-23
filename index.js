const { encodeKeypair } = require('./lib/crypto.js');
const ed25519 = require('./lib/ed25519.js');
const ipfsNode = require('./lib/ipfs-node.js');
const rsa = require('./lib/rsa.js');
const secp256k1 = require('./lib/secp256k1.js');
const FileSaver = require('file-saver');
const { generateForm, parseForm } = require('./lib/form.js');
const { generateFrames, readTags, writeTags } = require('./lib/id3.js');
require('setimmediate');

const {
  encodeBase58,
  decodeBase58,
  orderStringify,
  withoutKeys
} = require('./lib/util.js');

const {
  getClaimsSchema,
  newClaims,
  newEd25519Header,
  newRsaHeader,
  newSecp256k1Header,
  signClaims,
  validateClaims,
  verifyClaims
} = require('./lib/jwt.js');

const {
  getMetaSchema,
  newMeta,
  validateMeta
} = require('./lib/meta.js');

const {
  getPartySchema,
  newParty,
  validateParty
} = require('./lib/party.js');

// const claims = document.getElementById('claims');
const content = document.getElementById('content');
const create = document.getElementById('create');
const createSig = document.getElementById('create-sig');
const form = document.querySelector('form');
const license = document.getElementById('license');
const licenseSig = document.getElementById('license-sig');
const meta = document.getElementById('meta');
const mode = document.getElementById('mode');
const ols = document.getElementsByTagName('ol');
const party = document.getElementById('party');
const pub = document.getElementById('pub');
const submit = document.createElement('input');
submit.type = 'submit';

const keySelect = document.getElementById('key-select');
const schemaSelect = document.getElementById('schema-select');

const addFileBtn = document.getElementById('add-file-btn');
const addMetaBtn = document.getElementById('add-meta-btn');
const getFileBtn = document.getElementById('get-file-btn');
const newKeypairBtn = document.getElementById('new-keypair-btn');
// const readTagsBtn = document.getElementById('read-tags-btn');
const signClaimsBtn = document.getElementById('sign-claims-btn');
const startNodeBtn = document.getElementById('start-node-btn');
// const writeTagsBtn = document.getElementById('write-tags-btn');
const verifySigBtn = document.getElementById('verify-sig-btn');

startNodeBtn.addEventListener('click', () => {
  ipfsNode.startNode().then((info) => {
    console.log('Peer info:', info);
    addFileBtn.addEventListener('click', () => {
      if (content.files && schemaSelect.value) {
        if (schemaSelect.value.toLowerCase() === content.files[0].type.split('/')[0]) {
          ipfsNode.addFileInput(content).then((result) => {
            console.log('Added file:', result);
            multihash.value = result.hash;
            const label = Array.from(document.querySelectorAll('label')).find((label) => {
              return label.textContent === 'contentUrl'
                     && label.nextElementSibling.type === 'text'
                     && !label.nextElementSibling.value
            });
            label.nextElementSibling.value = result.hash;
          }, console.error);
        }
      }
    });
    getFileBtn.addEventListener('click', () => {
      if (multihash.value) {
        ipfsNode.getFile(multihash.value).then((link) => {
          links.appendChild(link);
        }, console.error);
      }
    });
  });
});

addMetaBtn.addEventListener('click', () => {
  const metaObj = withoutKeys(JSON.parse(meta.textContent), '@id');
  const buf = new Buffer.from(orderStringify(metaObj));
  ipfsNode.addFile(buf, '').then((result) => {
    console.log('Added meta:', result);
  }, console.error);
});

/*
readTagsBtn.addEventListener('click', () => {
  readTags(content).then((tags) => {
    console.log(tags);
  }, console.error);
});

writeTagsBtn.addEventListener('click', () => {
  const frames = generateFrames(JSON.parse(meta.textContent));
  console.log(frames);
  writeTags(content, frames).then((writer) => {
    FileSaver.saveAs(writer.getBlob(), 'test.mp3');
  }, console.error);
});
*/

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
});

signClaimsBtn.addEventListener('click', () => {
  const encodedKey = prompt('Please enter your secret key to sign claims', '');
  if (!encodedKey) return;
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
  if (schemaSelect.value === 'Create') {
    const createObj = JSON.parse(create.textContent);
    createSig.setAttribute('value', encodeBase58(signClaims(createObj, header, privateKey)));
  }
  if (schemaSelect.value === 'License') {
    const licenseObj = JSON.parse(license.textContent);
    licenseSig.setAttribute('value', encodeBase58(signClaims(licenseObj, header, privateKey)));
  }
});

verifySigBtn.addEventListener('click', () => {
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
  const createObj = JSON.parse(create.textContent);
  const createSignature = decodeBase58(createSig.value);
  const metaObj = JSON.parse(meta.textContent);
  if (schemaSelect.value === 'Create') {
    verifyClaims(createObj, header, metaObj, createSignature).then(() => {
      console.log('Verified create claims:', JSON.stringify(createObj, null, 2));
    }, console.error);
  }
  if (schemaSelect.value === 'License') {
    const licenseObj = JSON.parse(license.textContent);
    const licenseSignature = decodeBase58(licenseSig.value);
    verifyClaims(licenseObj, header, metaObj, licenseSignature, createObj, createSignature).then(() => {
      console.log('Verified license claims:', JSON.stringify(licenseObj, null, 2));
    }, console.error);
  }
});

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
  addMetaBtn.hidden = true;
  keySelect.hidden = true;
  newKeypairBtn.hidden = true;
  signClaimsBtn.hidden = true;
  verifySigBtn.hidden = true;
  let schema;
  switch(mode.value) {
    case 'party':
      schema = getPartySchema(schemaSelect.value);
      keySelect.hidden = false;
      newKeypairBtn.hidden = false;
      break;
    case 'meta':
      schema = getMetaSchema(schemaSelect.value);
      addMetaBtn.hidden = false;
      break;
    case 'claims':
      schema = getClaimsSchema(schemaSelect.value);
      signClaimsBtn.hidden = false;
      verifySigBtn.hidden = false;
      break;
    default:
      return console.error('unexpected mode: ' + mode.value);
  }
  generateForm(schema).forEach((div) => form.appendChild(div));
  form.appendChild(submit);
  listModifiers();
});

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
      newParty(obj).then((partyObj) => {
        return validateParty(partyObj);
      }).then((partyObj) => {
        party.textContent = JSON.stringify(partyObj, null, 2);
      }, console.error);
      return;
    case 'meta':
      newMeta(obj).then((metaObj) => {
        return validateMeta(metaObj);
      }).then((metaObj) => {
        meta.textContent = JSON.stringify(metaObj, null, 2);
      }, console.error);
      return;
    case 'claims':
      const metaObj = JSON.parse(meta.textContent)
      if (schemaSelect.value === 'Create') {
        newClaims(obj).then((createObj) => {
          return validateClaims(createObj, metaObj);
        }).then((createObj) => {
          create.textContent = JSON.stringify(createObj, null, 2);
        }, console.error);
      }
      if (schemaSelect.value === 'License') {
        const createObj = JSON.parse(create.textContent);
        newClaims(obj).then((licenseObj) => {
          return validateClaims(licenseObj, metaObj, createObj);
        }).then((licenseObj) => {
          license.textContent = JSON.stringify(licenseObj, null, 2);
        }, console.error);
      }
      return;
    default:
      console.error('unexpected mode: ' + mode.value);
  }
});
