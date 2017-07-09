'use strict';

const fs = require('fs');
const Constellate = require('../lib/constellate.js');

const constellate = new Constellate();

const csv1 = fs.readFileSync(__dirname + '/MusicGroup.csv', 'utf8');
const csv2 = fs.readFileSync(__dirname + '/Person.csv', 'utf8');

const json1 = fs.readFileSync(__dirname + '/MusicGroup.json', 'utf8');
const json2 = fs.readFileSync(__dirname + '/Person.json', 'utf8');

const started = constellate.start();

let str1, str2;

started.then(() => {

  return constellate.ipldFromJSONs([json1, json2], ['MusicGroup', 'Person']);

}).then(ipld => {

  str1 = JSON.stringify(ipld);

  return constellate.ipldFromCSVs([csv1, csv2], ['MusicGroup', 'Person']);

}).then(ipld => {

  str2 = JSON.stringify(ipld);

  if (str1 !== str2) {
    throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
  }

  console.log('Done');
  process.exit();

}).catch(err => {

  console.error(err);
  process.exit();

});
