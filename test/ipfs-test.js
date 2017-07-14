'use strict';

const Ipfs = require('../lib/ipfs.js');

const ipfs = new Ipfs();

const composer1 = {
  '@context': 'http://schema.org/',
  '@type': 'Person',
  name: 'composer1'
}

const composer2 = {
  '@context': 'http://schema.org/',
  '@type': 'Person',
  name: 'composer2'
}

const publisher = {
  '@context': 'http://schema.org/',
  '@type': 'Organization',
  name: 'publisher'
}

const composition = {
  '@context': 'http://schema.org/',
  '@type': 'MusicComposition',
  name: 'song'
}

const recording = {
  '@context': 'http://schema.org/',
  '@type': 'MusicRecording',
  name: 'version title'
}

const expanded = {
  '@context': 'http://schema.org/',
  '@type': 'MusicComposition',
  composer: [
    composer1,
    composer2
  ],
  name: 'song',
  publisher
}

let flattened, str1, str2;

const started = ipfs.start();

started.then(() => {

  return ipfs.addObject(composer1);

}).then(hash => {

  composition.composer = [{ '/': hash }];

  return ipfs.addObject(composer2);

}).then(hash => {

  composition.composer.push({ '/': hash });

  return ipfs.addObject(publisher);

}).then(hash => {

  composition.publisher = { '/': hash };

  return ipfs.addObject(composition);

}).then(hash => {

  recording.recordingOf = { '/': hash };

  return ipfs.get(hash);

}).then(obj => {

  flattened = obj;

  return ipfs.expand(obj);

}).then(_expanded => {

  str1 = JSON.stringify(expanded, null, 2);
  str2 = JSON.stringify(_expanded, null, 2);

  if (str1 !== str2) {
    throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
  }

  return ipfs.flatten(expanded);

}).then(obj => {

  str1 = JSON.stringify(flattened, null, 2);
  str2 = JSON.stringify(obj.flattened, null, 2);

  if (str1 !== str2) {
    throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
  }

  return ipfs.addObject(recording);

}).then(hash => {

  str1 = hash;

  return ipfs.hashObject(recording);

}).then(hash => {

  str2 = hash;

  if (str1 !== str2) {
    throw new Error('EXPECTED ' + str1 + '\nGOT ' + str2);
  }

}).then(() => {

  console.log('Done');
  process.exit();

}).catch(err => {

  console.error(err);
  process.exit();

});
