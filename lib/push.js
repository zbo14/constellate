const fs = require('fs');
const { exec } = require('child_process');

const ipld = JSON.parse(fs.readFileSync('/Users/zach/Documents/ego_metadata/metadata.json', 'utf8'));

let data;

ipld.forEach(obj => {
  data = JSON.stringify(obj, null, 2);
  fs.writeFileSync(`/Users/zach/Documents/ego_metadata/objects/${obj.name}.json`, data);
});

const files = fs.readdirSync('/Users/zach/Documents/ego_metadata/objects');

console.log(files);

files.forEach(file => {
  exec(`curl -F file="@/Users/zach/Documents/ego_metadata/objects/${file}" "https://ipfs.infura.io:5001/api/v0/dag/put?format=cbor&input-enc=json"`, err => {
    if (err) throw err;
  });
})
