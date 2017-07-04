const IpfsNode = require('../lib/ipfs-node.js');

const ipfs = new IpfsNode();

const composer = {
  '@context': 'http://schema.org',
  '@type': 'Person',
  name: 'composer name'
}

const publisher = {
  '@context': 'http://schema.org',
  '@type': 'Organization',
  name: 'publisher name'
}

const composition = {
  '@context': 'http://schema.org',
  '@type': 'MusicComposition',
  name: 'composition title'
}

const expanded = {
  '@context': 'http://schema.org',
  '@type': 'MusicComposition',
  composer,
  name: 'composition title',
  publisher: {
    '@context': 'http://schema.org',
    '@type': 'Organization',
    member: composer,
    name: 'publisher name'
  }
}

let flattened, str1, str2;

const started = ipfs.start();

started.then(() => {

  return ipfs.addObject(composer);

}).then(cid => {

  publisher.member = {
    '/': cid.toBaseEncodedString()
  }

  return ipfs.addObject(publisher);

}).then(cid => {

  composition.composer = publisher.member;

  composition.publisher = {
    '/': cid.toBaseEncodedString()
  }

  return ipfs.addObject(composition);

}).then(cid => {

  return ipfs.getObject(cid);

}).then(obj => {

  flattened = obj;

  return ipfs.expand(obj);

}).then(_expanded => {

  str1 = JSON.stringify(expanded);
  str2 = JSON.stringify(_expanded);

  if (str1 !== str2) {
    throw new Error('expected ' + str1 + ', got ' + str2);
  }

  return ipfs.flatten(expanded);

}).then(obj => {

  str1 = JSON.stringify(flattened);
  str2 = JSON.stringify(obj.flattened);

  if (str1 !== str2) {
    throw new Error('expected ' + str1 + ', got ' + str2);
  }

  console.log('Done');
  process.exit();

}).catch(console.error);
