import { getPartyId } from '../lib/party.js';

import {
  Album, AlbumContext,
  Audio, AudioContext,
  Composition, CompositionContext,
  Recording, RecordingContext,
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

function getMetaIds(...metas) {
  return metas.map(getMetaId);
}

function getPartyIds(...parties) {
  return parties.map(getPartyId);
}

const composition = setMetaId({
  '@context': CompositionContext,
  '@type': 'Composition',
  composer: getPartyIds(composer),
  iswcCode: 'T-034.524.680-1',
  lyricist: getPartyIds(lyricist),
  publisher: getPartyIds(publisher),
  title: 'fire-song'
});

const audio = setMetaId({
  '@context': AudioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com',
  encodingFormat: 'mp3'
});

const recording = setMetaId({
  '@context': RecordingContext,
  '@type': 'Recording',
  audio: getMetaIds(audio),
  performer: getPartyIds(performer),
  producer: getPartyIds(producer),
  recordingOf: getMetaId(composition),
  recordLabel: getPartyIds(recordLabel)
});

const album = setMetaId({
  '@context': AlbumContext,
  '@type': 'Album',
  artist: getPartyIds(performer, producer),
  productionType: 'DemoAlbum',
  recordLabel: getPartyIds(recordLabel),
  releaseType: 'SingleRelease',
  title: 'ding-ding-dooby-doo',
  track: getMetaIds(recording)
});

export {
  audio,
  album,
  composition,
  recording
}
