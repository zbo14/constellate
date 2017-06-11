'use strict';

// @flow

/**
* @module constellate/src/context
*/

const Context = {
  schema: 'http://schema.org/',
  coala: 'http://coalaip.org/',

  MusicGroup: 'schema:MusicGroup',
  Organization: 'schema:Organization',
  Person: 'schema:Person',

  AudioObject: 'schema:AudioObject',
  ImageObject: 'schema:ImageObject',
  MusicAlbum: 'schema:MusicAlbum',
  MusicComposition: 'schema:MusicComposition',
  MusicPlaylist: 'schema:MusicPlaylist',
  MusicRecording: 'schema:MusicRecording',
  MusicRelease: 'schema:MusicRelease',

  Copyright: 'coala:Copyright',
  CreativeWork: 'schema:CreativeWork',
  ReviewAction: 'schema:ReviewAction',
  Right: 'coala:Right',
  RightsTransferAction: 'coala:RightsTransferAction',

  email: 'schema:email',
  name: 'schema:name',
  sameAs: 'schema:sameAs',
  url: 'schema:url',

  byArtist: {
    '@id': 'schema:byArtist',
    '@type': '@id'
  },
  composer: {
    '@id': 'schema:composer',
    '@type': '@id'
  },
  lyricist: {
    '@id': 'schema:lyricist',
    '@type': '@id'
  },
  member: {
    '@id': 'schema:member',
    '@type': '@id'
  },
  producer: {
    '@id': 'schema:producer',
    '@type': '@id'
  },
  publisher: {
    '@id': 'schema:publisher',
    '@type': '@id'
  },
  recordLabel: {
    '@id': 'schema:recordLabel',
    '@type': '@id'
  },

  albumProductionType: 'schema:albumProductionType',
  albumReleaseType: 'schema:albumReleasetype',
  catalogNumber: 'schema:catalogNumber',
  encodingFormat: 'schema:encodingFormat',
  isrcCode: 'schema:isrcCode',
  iswcCode: 'schema:iswcCode',
  musicReleaseFormat: 'schema:musicReleaseFormat',

  audio: {
    '@id': 'schema:audio',
    '@type': '@id'
  },
  contentUrl: {
    '@id': 'schema:contentUrl',
    '@type': '@id'
  },
  image: {
    '@id': 'schema:image',
    '@type': '@id'
  },
  recordingOf: {
    '@id': 'schema:recordingOf',
    '@type': '@id'
  },
  releaseOf: {
    '@id': 'schema:releaseOf',
    '@type': '@id'
  },
  track: {
    '@id': 'schema:track',
    '@type': '@id'
  },

  assertionTruth: 'coala:assertionTruth',
  error: 'schema:error',
  exclusive: 'coala:exclusive',
  numberOfUses: 'coala:numberOfUses',
  percentageShares: 'coala:percentageShares',
  rightContext: 'coala:rightContext',
  territory: 'coala:territory',
  text: 'schema:text',
  usageType: 'coala:usageType',
  validFrom: 'coala:validFrom',
  validThrough: 'coala:validThrough',

  asserter: {
    '@id': 'coala:asserter',
    '@type': '@id'
  },
  assertionSubject: {
    '@id': 'coala:assertionSubject',
    '@type': '@id'
  },
  license: {
    '@id': 'schema:license',
    '@type': '@id'
  },
  rightsOf: {
    '@id': 'coala:rightsOf',
    '@type': '@id'
  },
  source: {
    '@id': 'coala:source',
    '@type': '@id'
  },
  transferContract: {
    '@id': 'coala:transferContract',
    '@type': '@id'
  }
}

exports.Context = Context;
