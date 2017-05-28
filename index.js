const CID = require('cids');
const ipfs = require('./lib/ipfs.js');
const { getSchema, validate } = require('./lib/linked-data.js');
const { isDescendant } = require('./lib/util.js');
require('setimmediate');

const {
  formToObject,
  objectToForm,
  schemaToForm
} = require('./lib/form.js');


const data = document.getElementById('data');
const dataHash = document.getElementById('data-hash');
const fileHash = document.getElementById('file-hash');
const fileInput = document.getElementById('file-input');
const files = document.getElementById('files');
const form = document.querySelector('form');
const ols = document.getElementsByTagName('ol');
const submit = document.createElement('input');
submit.type = 'submit';
const textarea = document.querySelector('textarea');

const keySelect = document.getElementById('key-select');
const schemaSelect = document.getElementById('schema-select');

const addDataBtn = document.getElementById('add-data-btn');
const addFileBtn = document.getElementById('add-file-btn');
const getDataBtn = document.getElementById('get-data-btn');
const getFileBtn = document.getElementById('get-file-btn');
const startPeerBtn = document.getElementById('start-peer-btn');

startPeerBtn.addEventListener('click', () => {
  ipfs.startPeer().then((info) => {
    console.log('Peer info:', info);
    addDataBtn.addEventListener('click', () => {
      const obj = JSON.parse(textarea.textContent);
      ipfs.putDAGNode(obj, 'dag-cbor').then((cid) => {
        const hash = cid.toBaseEncodedString();
        dataHash.setAttribute('value', hash);
        // if (dataHash.value !== hash) {
        //   console.log(`expected data-hash: ${dataHash.value}; got ` + hash);
        //   dataHash.setAttribute('value', hash);
        //   console.log(typeof dataHash.value, typeof hash);
        // }
      });
    });
    addFileBtn.addEventListener('click', () => {
      if (fileInput.files) {
        ipfs.addFileInput(fileInput).then((result) => {
          console.log('Added file:', result);
          fileHash.value = result.hash;
        });
      }
    });
    getDataBtn.addEventListener('click', () => {
      ipfs.getDAGNode(dataHash.value, 'dag-cbor').then((dagNode) => {
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
    //   console.log('validated:', JSON.stringify(validated));
    //   return ipfs.calcHash(obj, 'dag-cbor');
    // }).then((hash) => {
    //   dataHash.setAttribute('value', hash);
    });
});
