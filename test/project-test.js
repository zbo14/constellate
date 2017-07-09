'use strict';

const Constellate = require('../lib/constellate.js');

const constellate = new Constellate();

const proj = constellate.newProject('test');

proj.newSheet('Person');
proj.newSheet('MusicGroup');

let sheet = proj.getSheet('Person');

sheet.addColumn('name');
sheet.addColumn('homepage');

sheet.addRow('alice', 'http://alices-homepage.com');
sheet.addRow('bob', 'http://bobs-homepage.com');

sheet = proj.getSheet('MusicGroup');

sheet.addColumn('name');
sheet.addColumn('member');

sheet.addRow('band', '@alice,@bob');

const html = proj.toHTML();

proj.fromHTML(html);

const objs = [
  {
    type: "Person",
    name: "alice",
    homepage: "http://alices-homepage.com"
  },
  {
    type: "Person",
    name: "bob",
    homepage: "http://bobs-homepage.com"
  },
  {
    type: "MusicGroup",
    name: "band",
    member: "@alice,@bob"
  }
]

let str1 = JSON.stringify(proj.toObjects(), null, 2);
let str2 = JSON.stringify(objs, null, 2);

if (str1 !== str2) {
  throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
}

str1 = proj.toHTML();
str2 = html;

if (str1 !== str2) {
  throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
}

console.log('Done');
