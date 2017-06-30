const fs = require('fs');
const Translate = require('../lib/translate.js');

if (process.argv.length !== 3) {
  throw new Error('expected 3 arguments; got ' + process.argv.length);
}

const filepath = process.argv[2];

const ext = filepath.split('.').pop();

if (ext !== 'csv' && ext !== 'json') {
  throw new Error('unexpected file extension:', ext);
}

const contents = fs.readFileSync(filepath, 'utf8');

const translate = new Translate();

translate.start().then(() => {

  if (ext === 'csv') {
    return translate.fromCSV(contents);
  }

  if (ext === 'json') {
    return translate.fromJSON(contents);
  }

}).then(ipld => {

  console.log(JSON.stringify(ipld, null, 2));

  return translate.stop();

}).then(process.exit);
