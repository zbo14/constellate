const CID = require('cids');
const { Context } = require('./lib/context.js');
const { isDescendant } = require('./lib/util.js');
require('setimmediate');

const {
  formToObject,
  getInputs,
  objectToForm,
  schemaToForm
} = require('./lib/form.js');

const {
  addFileInput,
  blobToAnchor,
  getDAGNode,
  getFile,
  putDAGNode,
  startPeer
} = require('./lib/ipfs.js');

const {
  convertObject,
  getTypeSchema,
  hashToId,
  validate
} = require('./lib/linked-data.js');

const data = document.getElementById('data');
const dataHash = document.getElementById('data-hash');
const exportHashes = document.getElementById('export-hashes');
const fileHash = document.getElementById('file-hash');
const fileInput = document.getElementById('file-input');
const files = document.getElementById('files');
const formContainer = document.getElementById('form-container');
const importHashes = document.getElementById('import-hashes');
const ols = document.getElementsByTagName('ol');
const textarea = document.querySelector('textarea');

const formatSelect = document.getElementById('format-select');
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
  if (importHashes.files.length) {
    const reader = new FileReader();
    reader.onload = () => {
      hashes = JSON.parse(reader.result);
      console.log('hashes:', JSON.stringify(hashes, null, 2));
    }
    reader.readAsText(importHashes.files[0]);
  }
});

saveDataHashBtn.addEventListener('click', () => {
  if (dataHash.value) {
    const name = prompt('Enter a name for the hash', '');
    if (name && name.length) {
      hashes[name] = dataHash.value;
      console.log(`Saved data hash as "${name}"`);
    }
  }
});

saveFileHashBtn.addEventListener('click', () => {
  if (fileHash.value) {
    const name = prompt('Enter a name for the hash', '');
    if (name && name.length) {
      hashes[name] = fileHash.value;
      console.log(`Saved file hash as "${name}"`);
    }
  }
});

startPeerBtn.addEventListener('click', () => {
  startPeer().then((info) => {
    console.log('Peer info:', info);
    putDAGNode(Context, 'dag-cbor').then((cid) => {
      hashes.context = cid.toBaseEncodedString();
      console.log('Context hash:', hashes.context);
    });
    addDataBtn.addEventListener('click', () => {
      let obj = JSON.parse(textarea.textContent);
      if (formatSelect.value === 'json-ld') {
        obj = convertObject(obj, 'json-ld', 'ipld');
      }
      putDAGNode(obj, 'dag-cbor').then((cid) => {
        console.log('Added data!');
        dataHash.value = cid.toBaseEncodedString();
      });
    });
    addFileBtn.addEventListener('click', () => {
      if (fileInput.files.length) {
        addFileInput(fileInput).then((result) => {
          console.log('Added file!');
          fileHash.value = result.hash;
        });
      }
    });
    getDataBtn.addEventListener('click', () => {
      getDAGNode(dataHash.value, 'dag-cbor').then((dagNode) => {
        return validate(dagNode, 'ipld');
      }).then((validated) => {
        if (formatSelect.value === 'json-ld') {
          validated = convertObject(validated, 'ipld', 'json-ld');
        }
        const form = objectToForm(validated);
        data.innerHTML = null;
        Array.from(form.children).forEach((div) => {
          if (div.nodeName === 'DIV') data.appendChild(div);
        });
      });
    });
    getFileBtn.addEventListener('click', () => {
      if (fileHash.value) {
        getFile(fileHash.value).then((blob) => {
          const a = blobToAnchor(blob);
          files.appendChild(a);
        });
      }
    });
  });
});

function addButtons(form) {
  Array.from(ols).forEach((ol, idx) => {
    if (!ol.hidden && isDescendant(form, ol)) {
      const remover = document.createElement('button');
      remover.className = 'remover';
      remover.id = 'remover-' + idx;
      remover.textContent = '-';
      form.insertBefore(remover, ol.parentElement);
      const adder = document.createElement('button');
      adder.className = 'adder';
      adder.id = 'adder-' + idx;
      adder.textContent = '+';
      form.insertBefore(adder, remover);
    }
  });
}

const formHandler = () => {
  if (!schemaSelect.value || !formatSelect.value) return;
  formContainer.innerHTML = null;
  const schema = getTypeSchema(schemaSelect.value, formatSelect.value);
  const form = schemaToForm(schema);
  if (!hashes.context) return alert('Cannot find context; please start peer');
  let child, elem, input, label;
  for (let i = 0; i < form.children.length; i++) {
    child = form.children[i];
    if (child.nodeName === 'DIV' &&
        (elem = child.lastChild) &&
        (label = child.firstChild) &&
        label.textContent === '@context') {
      input = getInputs(elem)[0];
      if (formatSelect.value === 'ipld') {
        input.value = hashes.context;
      }
      if (formatSelect.value === 'json-ld') {
        input.value = hashToId(hashes.context);
      }
      break;
    }
  }
  formContainer.appendChild(form);
  addButtons(form);
}

formatSelect.addEventListener('change', formHandler);
schemaSelect.addEventListener('change', formHandler);

document.body.addEventListener('keyup', (evt) => {
  const input = evt.target;
  if (input.nodeName !== 'INPUT' || input.type !== 'text') return;
  if (input.value[0] === '#') {
    let name = input.value.slice(1);
    if (hashes[name]) {
      setTimeout(() => {
        name = input.value.slice(1);
        if (hashes[name]) {
          if (formatSelect.value === 'ipld') {
            input.value = hashes[name];
          }
          if (formatSelect.value === 'json-ld') {
            const cid = new CID(hashes[name]);
            if (cid.version === 0) {
              input.value = 'ipfs:/ipfs/' + hashes[name];
            }
            if (cid.version === 1) {
              input.value = 'ipfs:/ipld/' + hashes[name];
            }
          }
        }
      }, 1000);
    }
  }
});

formContainer.addEventListener('click', (evt) => {
    const btn = evt.target;
    if (btn.nodeName !== 'BUTTON') return;
    evt.preventDefault();
    let div = btn.nextElementSibling;
    if (div.nodeName !== 'DIV') {
      div = div.nextElementSibling;
      if (div.nodeName !== 'DIV') {
        throw new Error('expected div; got ' + div.nodeName);
      }
    }
    const ol = div.lastChild;
    if (ol.nodeName !== 'OL') {
      throw new Error('expected ol; got ' + ol.nodeName);
    }
    if (btn.className === 'remover') {
      if (!ol.children.length) {
        throw new Error('ol has no children');
      }
      if (ol.hasAttribute('required') &&
          ol.hasAttribute('minitems') &&
          parseInt(ol.attributes.minitems.value) === ol.children.length) {
          const label = div.firstChild;
          if (label.nodeName !== 'LABEL') {
            throw new Error('expected label; got ' + label.nodeName);
          }
          alert(label.textContent + ' is required');
      } else if (ol.children.length === 1) {
        const li = ol.firstChild;
        getInputs(li).forEach((input) => input.disabled = true);
        li.hidden = true;
      } else {
        ol.removeChild(ol.lastChild);
      }
    } else if (btn.className === 'adder') {
      const li = ol.firstChild;
      if (ol.children.length === 1 && li.hidden) {
        getInputs(li).forEach((input) => input.disabled = false);
        li.hidden = false;
      } else {
        const clone = li.cloneNode(true);
        getInputs(clone).forEach((input) => {
          if (input.type === 'checkbox') input.checked = false;
          else if (input.type === 'text') input.value = null;
          else throw new Error('unexpected input type: ' + input.type);
        });
        ol.appendChild(clone);
      }
    } else {
      throw new Error('expected adder or remover btn; got ' + btn.className);
    }
});

formContainer.addEventListener('submit', (evt) => {
    evt.preventDefault();
    const form = formContainer.firstChild;
    const obj = formToObject(Array.from(form.children));
    validate(obj, formatSelect.value).then(() => {
      textarea.textContent = JSON.stringify(obj, null, 2);
    });
});
