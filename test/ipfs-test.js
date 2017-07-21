'use strict';

const Ipfs = require('../lib/ipfs.js');
const { Tasks } = require('../lib/util.js');

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

const ipfs = new Ipfs();

const t = new Tasks();

let count = 0, str1, str2;

t.task(objs => {
  str1 = JSON.stringify(expanded);
  str2 = JSON.stringify(objs[0]);
  if (str1 !== str2) {
    t.error(new Error('EXPECTED ' + str1 + '\nGOT ' + str2));
  }
  console.timeEnd('test')
  process.exit();
});

t.task(hashes => {
  recording.recordingOf = { '/': hashes[0] };
  t.next();
  ipfs.get(hashes, true, t);
});

t.task(hashes => {
  composition.composer = [{ '/': hashes[0] }, { '/': hashes[1] }];
  composition.publisher = { '/': hashes[2] };
  t.next();
  ipfs.addObjects([composition], t);
});

t.task(() => {
  t.next();
  ipfs.addObjects([composer1, composer2, publisher], t)
});

console.time('test')
ipfs.start('/tmp/test', t);

setTimeout(() => {}, 10000);
