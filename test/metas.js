import { getAddr } from '../lib/party.js';

import {
  AlbumContext,
  AudioContext,
  CompositionContext,
  ImageContext,
  RecordingContext,
  getMetaId, setMetaId
} from '../lib/meta.js';

import {
  composer,
  lyricist,
  performer,
  producer,
  publisher,
  recordLabel
} from './parties.js';

const composition = setMetaId({
  '@context': CompositionContext,
  '@type': 'Composition',
  composer: [getMetaId(composer)],
  iswcCode: 'T-034.524.680-1',
  lyricist: [getMetaId(lyricist)],
  publisher: [getMetaId(publisher)],
  title: 'fire-song'
});

const audio = setMetaId({
  '@context': AudioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com',
  encodingFormat: 'mp3'
});

const image = setMetaId({
  '@context': ImageContext,
  '@type': 'Image',
  contentUrl: 'http://image-file.com',
  encodingFormat: 'png'
})

const recording = setMetaId({
  '@context': RecordingContext,
  '@type': 'Recording',
  audio: [getMetaId(audio)],
  performer: [getMetaId(performer)],
  producer: [getMetaId(producer)],
  recordingOf: getMetaId(composition),
  recordLabel: [getMetaId(recordLabel)]
});

const album = setMetaId({
  '@context': AlbumContext,
  '@type': 'Album',
  art: getMetaId(image),
  artist: [performer, producer].map(getAddr),
  productionType: 'DemoAlbum',
  recordLabel: [getAddr(recordLabel)],
  releaseType: 'SingleRelease',
  title: 'ding-ding-dooby-doo',
  track: [getMetaId(recording)]
});

export {
  audio,
  album,
  composition,
  image,
  recording
}
