'use strict';

const Ipfs = require('../lib/ipfs.js');
const { Task } = require('../lib/util.js');

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

const t1 = new Task();
const t2 = new Task();
const t3 = new Task();

t1.onRun(() => {

})

ipfs.start(t1);
