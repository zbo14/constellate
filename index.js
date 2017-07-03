'use strict';

const Constellate = require('./lib/constellate.js');
require('setimmediate');

const content = document.getElementById('content');
const metadata = document.getElementById('metadata');
const ipld = document.getElementById('ipld');
const projectName = document.getElementById('project-name');

const generateBtn = document.getElementById('generate-btn');
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

uploadBtn.addEventListener('click', () => {
  if (content.files.length && ipld.files.length) {
    constellate.upload(content.files, ipld.files).then(file => {
      downloadLink.href = URL.createObjectURL(file));
      downloadLink.download = file.name;
      downloadLink.innerText = file.name;
    });
  }
});
