'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const fileType = require('file-type');

const Fingerprint = require('./lib/fingerprint.js');

const app = express();
const fp = new Fingerprint();

app.use(bodyParser.text());

app.use(express.static(__dirname + '/public'));

app.post('/fingerprint', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  const data = Buffer.from(req.body, 'binary');
  const { ext, _ } = fileType(data);
  const filepath = '/tmp/' + Date.now() / 1000 + '.' + ext;
  fs.writeFile(filepath, data, err => {
    if (err) {
      res.writeHead(500);
      return res.end(JSON.stringify(err));
    }
    fp.calc(filepath).then(encoded => {
      res.writeHead(200);
      res.end(encoded);
    }).catch(err => {
      res.writeHead(500);
      res.end(JSON.stringify(err));
    });
  });
});

app.listen(8888);
