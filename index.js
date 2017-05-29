const CID = require('cids');
const ipfs = require('./lib/ipfs.js');
const { isDescendant } = require('./lib/util.js');
require('setimmediate');

const {
  formToObject,
  objectToForm,
  schemaToForm
} = require('./lib/form.js');

const {
  getSchema,
  validate
} = require('./lib/linked-data.js');

const data = document.getElementById('data');
const dataHash = document.getElementById('data-hash');
const exportHashes = document.getElementById('export-hashes');
const fileHash = document.getElementById('file-hash');
const fileInput = document.getElementById('file-input');
const files = document.getElementById('files');
const form = document.querySelector('form');
const importHashes = document.getElementById('import-hashes');
const ols = document.getElementsByTagName('ol');
const submit = document.createElement('input');
submit.type = 'submit';
const textarea = document.querySelector('textarea');

const keySelect = document.getElementById('key-select');
const schemaSelect = document.getElementById('schema-select');

const addDataBtn = document.getElementById('add-data-btn');
const addFileBtn = document.getElementById('add-file-btn');
const clearDataBtn = document.getElementById('clear-data-btn');
const clearFilesBtn = document.getElementById('clear-files-btn');
const exportHashesBtn = document.getElementById('export-hashes-btn');
const getDataBtn = document.getElementById('get-data-btn');
const getFileBtn = document.getElementById('get-file-btn');
const importHashesBtn = document.getElementById('import-hashes-btn');
const saveDataHashBtn = document.getElementById('save-data-hash-btn');
const saveFileHashBtn = document.getElementById('save-file-hash-btn');
const startPeerBtn = document.getElementById('start-peer-btn');

let hashes = {};

clearDataBtn.addEventListener('click', () => {
  data.innerHTML = null;
});

clearFilesBtn.addEventListener('click', () => {
  files.innerHTML = null;
});

exportHashesBtn.addEventListener('click', () => {
  if (Object.keys(hashes).length) {
    const blob = new Blob([JSON.stringify(hashes, null, 2)], { type: 'application/json' });
    exportHashes.href = URL.createObjectURL(blob);
  }
});

importHashesBtn.addEventListener('click', () => {
  if (importHashes.files) {
    const reader = new FileReader();
    reader.onload = () => {
      hashes = JSON.parse(reader.result);
      console.log('hashes:', JSON.stringify(hashes, null, 2));
    }
    reader.readAsText(importHashes.files[0]);
  }
});

saveDataHashBtn.addEventListener('click', () => {
  const hash = dataHash.value;
  if (hash) {
    const name = prompt('Enter a name for the hash', '');
    if (name && name.length) {
      hashes[name] = hash;
      console.log('Saved data hash: ', JSON.stringify({name, hash}, null, 2));
    }
  }
});

saveFileHashBtn.addEventListener('click', () => {
  const hash = fileHash.value;
  if (hash) {
    const name = prompt('Enter a name for the hash', '');
    if (name && name.length) {
      hashes[name] = hash;
      console.log('Saved file hash: ', JSON.stringify({name, hash}, null, 2));
    }
  }
});

startPeerBtn.addEventListener('click', () => {
  ipfs.startPeer().then((info) => {
    console.log('Peer info:', info);
    addDataBtn.addEventListener('click', () => {
      const obj = JSON.parse(textarea.textContent);
      ipfs.putDAGNode(obj, 'dag-cbor').then((cid) => {
        console.log('Added data!');
        dataHash.value = cid.toBaseEncodedString();
      });
    });
    addFileBtn.addEventListener('click', () => {
      if (fileInput.files) {
        ipfs.addFileInput(fileInput).then((result) => {
          console.log('Added file!');
          fileHash.value = result.hash;
        });
      }
    });
    getDataBtn.addEventListener('click', () => {
      ipfs.getDAGNode(dataHash.value, 'dag-cbor').then((dagNode) => {
        console.log(dagNode);
        return objectToForm(dagNode);
      }).then((divs) => {
        data.innerHTML = null;
        divs.forEach((div) => data.appendChild(div));
      });
    });
    getFileBtn.addEventListener('click', () => {
      if (fileHash.value) {
        ipfs.getFile(fileHash.value).then((a) => {
          files.appendChild(a);
        });
      }
    });
  });
});

function nameToHash() {
  document.querySelectorAll('input[type="text"]').forEach((textInput) => {
    textInput.onkeyup = () => {
      if (textInput.value[0] === '#') {
        setTimeout(() => {
          const name = textInput.value.slice(1);
          if (hashes[name]) textInput.value = hashes[name];
        }, 1000);
      }
    }
  });
}

function listModifiers() {
  const lis = Array.from(document.getElementsByTagName('li')).reduce((result, li) => {
    if (li.parentElement.hidden) return result;
    return result.concat(li.cloneNode(true));
  }, []);
  Array.from(ols).forEach((ol, idx) => {
    if (!ol.hidden && isDescendant(form, ol)) {
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
          nameToHash();
      });
      form.insertBefore(adder, remover);
    }
  });
}

schemaSelect.addEventListener('change', () => {
    form.innerHTML = null;
    const schema = getSchema(schemaSelect.value);
    schemaToForm(schema).forEach((div) => form.appendChild(div));
    form.appendChild(submit);
    listModifiers();
    nameToHash();
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
    const obj = formToObject(divs);
    validate(obj, 'dag-cbor').then((validated) => {
      textarea.textContent = JSON.stringify(obj, null, 2);
    });
});
