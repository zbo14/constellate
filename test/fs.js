const fs = require('fs');

function readTestFile(path) {
  return fs.readFileSync(__dirname + path);
}

function writeTestFile(path, data) {
  fs.writeFileSync(__dirname + path, data);
}

exports.readTestFile = readTestFile;
exports.writeTestFile = writeTestFile;
