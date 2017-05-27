const CID = require('cids');
const multibase = require('multibase');
// const ed25519 = require('./lib/ed25519.js');
const ipfs = require('./lib/ipfs.js');
// const rsa = require('./lib/rsa.js');
// const secp256k1 = require('./lib/secp256k1.js');
const { generateForm, parseForm } = require('./lib/form.js');
const { getSchema, validate } = require('./lib/linked-data.js');
require('setimmediate');

const {
  encodeBase58,
  isObject,
  recurse
} = require('./lib/util.js');

const dataHash = document.getElementById('data-hash');
const form = document.querySelector('form');
const ols = document.getElementsByTagName('ol');
const pub = document.getElementById('pub');
const submit = document.createElement('input');
submit.type = 'submit';
const textarea = document.querySelector('textarea');

const keySelect = document.getElementById('key-select');
const schemaSelect = document.getElementById('schema-select');

const addDataBtn = document.getElementById('add-data-btn');
const getDataBtn = document.getElementById('get-data-btn');
// const newKeypairBtn = document.getElementById('new-keypair-btn');
const startPeerBtn = document.getElementById('start-peer-btn');

startPeerBtn.addEventListener('click', () => {
    ipfs.startPeer().then((info) => {
        console.log('Peer info:', info);
        addDataBtn.addEventListener('click', () => {
          const obj = JSON.parse(textarea.textContent);
          ipfs.putDAGNode(obj, 'dag-cbor').then((cid) => {
            console.log(cid.toBaseEncodedString());
          });
        });
        getDataBtn.addEventListener('click', () => {
          ipfs.getDAGNode(dataHash.value).then((dagNode) => {
            const nodeValue = recurse(dagNode.value, (val, key) => {
              if (key === '/') {
                return new CID(val).toBaseEncodedString();
              }
              if (isObject(val) && val['/']) {
                return { '/': new CID(val['/']).toBaseEncodedString() };
              }
              return val;
            });
            console.log(nodeValue);
          });
        });
    });
});

/*
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
            if (!ol.children.length) return;
            if (ol.hasAttribute('required') &&
                ol.hasAttribute('minimum') &&
                parseInt(ol.attributes.minimum.value) === ol.children.length) {
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
    const schema = getSchema(schemaSelect.value);
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
        return div.nodeName === 'DIV' &&
               div.children.length === 2 &&
               includeElement(div.lastChild, div.firstChild);
    });
    const obj = parseForm(divs);
    validate(obj, 'dag-cbor').then((validated) => {
      console.log('validated:', JSON.stringify(validated, null, 2));
      textarea.textContent = JSON.stringify(obj, null, 2);
      return ipfs.calcHash(obj, 'dag-cbor');
    }).then((hash) => {
      dataHash.setAttribute('value', hash);
    });
});
