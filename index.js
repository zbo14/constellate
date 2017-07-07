'use strict';

const Constellate = require('./lib/constellate.js');
const { fileToAnchor } = require('./lib/util.js');

const content = document.getElementById('content');
const decrypt = document.getElementById('decrypt');
const downloads = document.getElementById('downloads');
const encrypt = document.getElementById('encrypt');
const get = document.getElementById('get');
const ipld = document.getElementById('ipld');
const metadata = document.getElementById('metadata');
const object = document.getElementById('object');
const projectName = document.getElementById('project-name');
const selectModule = document.getElementById('select-module');

const generateBtn = document.getElementById('generate-btn');
const getBtn = document.getElementById('get-btn');
const uploadBtn = document.getElementById('upload-btn');

let constellate;

selectModule.addEventListener('change', evt => {
  if (constellate) constellate.stop();
  constellate = new Constellate(evt.target.value);
  constellate.start();
});

generateBtn.addEventListener('click', () => {
  if (!content.files.length || !metadata.files.length || !projectName.value) return;
  downloads.innerHTML = null;
  let password;
  if (encrypt.checked) {
    password = prompt('Please enter password to encrypt files', '');
    if (!password) return;
  }
  constellate.generate(
    Array.from(content.files),
    Array.from(metadata.files),
    projectName.value, password
  ).then(result => {
    if (result instanceof File) {
      downloads.appendChild(fileToAnchor(result));
    } else {
      for (let i = 0; i < result.encrypted.length; i++) {
        downloads.appendChild(fileToAnchor(result.encrypted[i]));
        downloads.innerHTML += '<br>';
      }
      downloads.appendChild(fileToAnchor(result.ipld));
      downloads.innerHTML += '<br>';
      downloads.appendChild(fileToAnchor(result.keys));
    }
    downloads.innerHTML += '<br>';
  });
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
      object.value = JSON.stringify(result, null, 2);
    }
  });
});

uploadBtn.addEventListener('click', () => {
  if (!content.files.length || !ipld.files.length) return;
  constellate.upload(
    Array.from(content.files),
    Array.from(ipld.files)
  ).then(file => {
    downloads.innerHTML = null;
    downloads.appendChild(fileToAnchor(file));
    downloads.innerHTML += '<br>';
  });
});
