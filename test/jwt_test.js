import { assert } from 'chai';
import { describe, it } from 'mocha';
import { encodeKeypair, generateKeypairFromPassword, generateRandomKeypair } from '../lib/crypto.js';
import { getHeader, getHeaders, setId } from '../lib/meta.js';
import { encodeBase64, timestamp } from '../lib/util.js';

import {
  Compose,
  License,
  Record,
  sign,
  verify
} from '../lib/jwt.js';

const artistKeypair = generateKeypairFromPassword('muzaq');
const curatorKeypair = generateRandomKeypair();

const artistContext = {
  schema: 'http://schema.org/',
  Artist: 'schema:MusicGroup',
  email: 'schema:email',
  homepage: 'schema:url',
  name: 'schema:name',
  profile: 'schema:sameAs'
}

const audioContext = {
  schema: 'http://schema.org/',
  Audio: 'schema:AudioObject',
  contentUrl: 'schema:contentUrl',
  encodingFormat: 'schema:encodingFormat'
}

const compositionContext = {
  schema: 'http://schema.org/',
  composer: 'schema:composer',
  Composition: 'schema:MusicComposition',
  iswc: 'schema:iswcCode',
  lyricist: 'schema:lyricist',
  publisher: 'schema:publisher',
  title: 'schema:name'
}

const recordingContext = {
  schema: 'http://schema.org/',
  audio: 'schema:AudioObject',
  isrc: 'schema:isrcCode',
  performer: 'schema:performer',
  producer: 'schema:producer',
  Recording: 'schema:MusicRecording',
  recordingOf: 'schema:recordingOf',
  recordLabel: 'schema:recordLabel'
}

const curatorContext = artistContext;

const artist = setId({
  '@context': artistContext,
  '@type': 'Artist',
  email: 'artist@example.com',
  homepage: 'http://artist.com',
  name: 'artist',
  profile: ['http://facebook-profile.com'],
}, artistKeypair.publicKey);

const curator = setId({
  '@context': curatorContext,
  '@type': 'Organization',
  email: 'curator@example.com',
  homepage: 'http://curator.com',
  name: 'curator'
}, curatorKeypair.publicKey);

const audio = setId({
  '@context': audioContext,
  '@type': 'Audio',
  contentUrl: 'http://audio-file.com'
});

const composition = setId({
  '@context': compositionContext,
  '@type': 'Composition',
  composer: getHeaders(artist),
  lyricist: getHeaders(artist),
  title: 'beep-bop-boop'
});

const recording = setId({
  '@context': recordingContext,
  '@types': 'MusicRecording',
  audio: getHeaders(audio),
  performer: getHeaders(artist),
  producer: getHeaders(artist),
  recordingOf: getHeader(composition)
});

const composeClaims = {
  iat: timestamp(),
  iss: artist['@id'],
  sub: composition['@id'],
  typ: 'Compose'
}

const licenseClaims  = {
  aud: [curator['@id']],
  exp: timestamp() + 1000,
  iat: timestamp(),
  iss: artist['@id'],
  sub: composition['@id'],
  typ: 'License'
}

const recordClaims = {
  iat: timestamp(),
  iss: artist['@id'],
  sub: recording['@id'],
  typ: 'Record'
}

const composeSignature = sign(composeClaims, Compose, artistKeypair.secretKey);
const licenseSignature = sign(licenseClaims, License, artistKeypair.secretKey);
const recordSignature = sign(recordClaims, Record, artistKeypair.secretKey);

describe('JWT', () => {
  it('verifies signature on compose claims', () => {
    assert.isOk(
      verify(composeClaims, Compose, composeSignature),
      'should verify signature on compose claims'
    );
  });
  it('verifies signature on license claims', () => {
    assert.isOk(
      verify(licenseClaims, License, licenseSignature),
      'should verify signature on license claims'
    );
  });
  it('verifies signature on record claims', () => {
    assert.isOk(
      verify(recordClaims, Record, recordSignature),
      'should verify signature on record claims'
    );
  });
});
