'use strict';

const fs = require('fs');
const Constellate = require('../lib/constellate.js');

const constellate = new Constellate();

const csv1 = fs.readFileSync(__dirname + '/MusicGroup.csv', 'utf8');
const csv2 = fs.readFileSync(__dirname + '/Person.csv', 'utf8');

const json1 = fs.readFileSync(__dirname + '/MusicGroup.json', 'utf8');
const json2 = fs.readFileSync(__dirname + '/Person.json', 'utf8');

const started = constellate.start();

started.then(() => {

  return constellate.ipldFromJSONs([json1, json2], ['MusicGroup', 'Person']);

}).then(ipld => {

  console.log(JSON.stringify(ipld, null, 2));

  return constellate.ipldFromCSVs([csv1, csv2], ['MusicGroup', 'Person']);

}).then(ipld => {

  console.log(JSON.stringify(ipld, null, 2));

});
