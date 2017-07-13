'use strict';

const Constellate = require('./lib/constellate.js');
const { fileToAnchor } = require('./lib/util.js');

const content = document.getElementById('content');
const decrypt = document.getElementById('decrypt');
const downloads = document.getElementById('downloads');
const encrypt = document.getElementById('encrypt');
const get = document.getElementById('get');
const json = document.getElementById('json');
const meta = document.getElementById('meta');
const selectModule = document.getElementById('select-module');

const exportBtn = document.getElementById('export-btn');
const generateBtn = document.getElementById('generate-btn');
const getBtn = document.getElementById('get-btn');
const importBtn = document.getElementById('import-btn');
const uploadBtn = document.getElementById('upload-btn');

let constellate;

selectModule.addEventListener('change', evt => {
  if (constellate) constellate.stop();
  constellate = new Constellate(evt.target.value, 'http://127.0.0.1:8888');
  constellate.start();
});

exportBtn.addEventListener('click', () => {
  const type = 'application/json';
  downloads.innerHTML = null;
  downloads.appendChild(fileToAnchor(
    new File(
      [JSON.stringify(constellate.exportHashes(), null, 2)], 'hash.json', { type }
    )
  ));
  downloads.innerHTML += '<br>';
  downloads.appendChild(fileToAnchor(
    new File(
      [JSON.stringify(constellate.exportIPLD(), null, 2)], 'ipld.json', { type }
    )
  ));
  downloads.innerHTML += '<br>';
  downloads.appendChild(fileToAnchor(
    new File(
      [JSON.stringify(constellate.exportMeta(), null, 2)], 'meta.json', { type }
    )
  ));
  /*
  const keys = constellate.exportKeys();
  if (keys) {
    const file = new File(
      [JSON.stringify(keys, null, 2)],
      'keys.json', { type: 'application/json' }
    );
    downloads.innerHTML = null;
    downloads.appendChild(fileToAnchor(file));
    downloads.innerHTML += '<br>';
  }
  */

});

generateBtn.addEventListener('click', () => {
  let files, password;
  if (content.files.length) {
    files = Array.from(content.files);
    if (encrypt.checked) {
      password = prompt('Please enter password to encrypt files', '');
      if (!password) return;
    }
  }
  constellate.generate(files, password);
});

getBtn.addEventListener('click', () => {
  if (!get.value) return;
  let key;
  if (decrypt.checked) {
    key = prompt('Please enter key to decrypt file', '');
    if (!key) return;
  }
  constellate.get(get.value, key).then(result => {
    if (result instanceof File) {
      downloads.innerHTML = null;
      downloads.appendChild(fileToAnchor(result));
      downloads.innerHTML += '<br>';
    } else {
      json.value = JSON.stringify(result, null, 2);
    }
  });
});

importBtn.addEventListener('click', () => {
  if (!meta.files.length) return;
  const files = Array.from(meta.files);
  constellate.import(files);
});

uploadBtn.addEventListener('click', () => {
  constellate.upload();
});
