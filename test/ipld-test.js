const IpfsNode = require('../lib/ipfs-node.js');
const Ipld = require('../lib/ipld.js');

const ipfs = new IpfsNode();
const ipld = new Ipld(ipfs);

const zach = {
  '@context': 'http://schema.org',
  '@type': 'Person',
  'name': 'zach'
}

const org = {
  '@context': 'http://schema.org',
  '@type': 'Organization',
  'name': 'org'
}

const composition = {
  '@context': 'http://schema.org',
  '@type': 'MusicComposition',
  'name': 'song title'
}

const started = ipfs.start();

started.then(() => {
  return ipfs.addObject(zach);
}).then(cid => {
  org.member = {
    '/': cid.toBaseEncodedString()
  }
  return ipfs.addObject(org);
}).then(cid => {
  composition.composer = org.member;
  composition.publisher = {
    '/': cid.toBaseEncodedString()
  }
  return ipfs.addObject(composition);
}).then(cid => {
  return ipfs.getObject(cid);
}).then(obj => {
  console.log(JSON.stringify(obj, null, 2));
  return ipld.expand(obj);
}).then(expanded => {
  console.log(JSON.stringify(expanded, null, 2));
  return ipld.flatten(expanded);
}).then(obj => {
  console.log(JSON.stringify(obj.flattened, null, 2));
});
