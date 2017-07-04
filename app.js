'use strict';

const bodyParser = require('body-parser');
const express = require('express');
const Fingerprint = require('./lib/fingerprint.js');

const app = express();

app.use(bodyParser.json());
app.use(express.static(__dirname + '/public'));

app.post('/fingerprint', (req, res) => {
  res.set('Content-Type', 'application/json');
  const filepath = req.body.filepath;
  const fp = new Fingerprint();
  fp.calculate(filepath).then(obj => {
    res.end(JSON.stringify(obj));
  });
});

app.listen(8888);
