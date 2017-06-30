'use strict';

const fs = require('fs');
const Translate = require('../lib/translate.js');

const translate = new Translate();

const json = fs.readFileSync(__dirname + '/test.json', 'utf8');

const csv = fs.readFileSync(__dirname + '/test.csv', 'utf8');

const started = translate.start();

started.then(() => {

  return translate.fromJSON(json);

}).then(ipld => {

  console.log(JSON.stringify(ipld, null, 2));

  return translate.fromCSV(csv);

}).then(ipld => {

  console.log(JSON.stringify(ipld, null, 2));

});
