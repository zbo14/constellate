'use strict';

const Ipfs = require('../lib/ipfs.js');
const { Tasks } = require('../lib/util.js');

const ipfs = new Ipfs('/tmp/test');

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

let count = 0, str1, str2;

const t = new Tasks();

t.append(() => {
  console.log(1);
  t.next();
  ipfs.addObject(composer1, t, 'composer1');
  ipfs.addObject(composer2, t, 'composer2');
  ipfs.addObject(publisher, t, 'publisher');
});

t.append((hash, id) => {
  console.log(2);
  if (id === 'composer1' || id === 'composer2') {
    if (!composition.composer) {
      composition.composer = [];
    }
    composition.composer.push({ '/': hash });
  }
  if (id === 'publisher') {
    composition.publisher = { '/': hash };
  }
  if (++count === 3) {
    count = 0;
    t.next();
    ipfs.addObject(composition, t);
  }
});

t.append(hash => {
  recording.recordingOf = { '/': hash };
  t.next();
  ipfs.get(hash, t);
});

t.append(obj => {
  t.next();
  ipfs.expand(obj, t);
});

t.append(obj => {
  str1 = JSON.stringify(expanded);
  str2 = JSON.stringify(obj);
  console.log(str2);
  if (str1 !== str2) {
    t.error(new Error('EXPECTED ' + str1 + '\nGOT ' + str2));
  }
  process.exit();
});

ipfs.start(true, t);

setTimeout(() => {}, 10000);
