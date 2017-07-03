'use strict';

const Constellate = require('./lib/constellate.js');
require('setimmediate');

const content = document.getElementById('content');
const get = document.getElementById('get');
const metadata = document.getElementById('metadata');
const ipld = document.getElementById('ipld');
const object = document.getElementById('object');
const projectName = document.getElementById('project-name');

const generateBtn = document.getElementById('generate-btn');
const getBtn = document.getElementById('get-btn');
const uploadBtn = document.getElementById('upload-btn');

const downloadLink = document.getElementById('download-link');

const constellate = new Constellate();

constellate.start();

generateBtn.addEventListener('click', () => {
  if (content.files.length &&
      metadata.files.length &&
      projectName.value) {
    constellate.generate(content.files, metadata.files, projectName.value).then(file => {
      downloadLink.href = URL.createObjectURL(file);
      downloadLink.download = file.name;
      downloadLink.innerText = file.name;
    });
  }
});

getBtn.addEventListener('click', () => {
  if (get.value) {
    constellate.get(get.value).then(result => {
      console.log(result);
    });
  }
});

uploadBtn.addEventListener('click', () => {
  if (content.files.length && ipld.files.length) {
    constellate.upload(content.files, ipld.files).then(file => {
      downloadLink.href = URL.createObjectURL(file);
      downloadLink.download = file.name;
      downloadLink.innerText = file.name;
    });
  }
});
