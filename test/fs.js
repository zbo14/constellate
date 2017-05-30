const fs = require('fs');

function createReadStream(path) {
  return fs.createReadStream(__dirname + path);
}

function readTestFile(path) {
  return fs.readFileSync(__dirname + path);
}

function writeTestFile(path, data) {
  fs.writeFileSync(__dirname + path, data);
}

exports.createReadStream = createReadStream;
exports.readTestFile = readTestFile;
exports.writeTestFile = writeTestFile;
