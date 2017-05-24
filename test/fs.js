const fs = require('fs');

function readTestFile(path) {
  return fs.readFileSync(__dirname + path, 'utf8');
}

function writeTestFile(path, data) {
  fs.writeFileSync(__dirname + path, data, 'utf8');
}

exports.readTestFile = readTestFile;
exports.writeTestFile = writeTestFile;
