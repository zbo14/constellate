const { Context } = require('../lib/context.js');
const { promiseSeq } = require('../lib/util.js');

const {
  createReadStream,
  readFileSync,
  writeFileSync
} = require('fs');

const {
  addFile,
  putCBOR,
  startPeer
} = require('../lib/ipfs.js');

const hashes = {};
const objs = {};

function setDataHash(name) {
  return putCBOR(objs[name]).then((cid) => {
    hashes[name] = cid.toBaseEncodedString();
  });
}

function setFileHash(path) {
  const readStream = createReadStream(__dirname + path);
  return addFile(readStream, '').then((result) => {
    hashes[path] = result.hash;
  });
}

objs.context = Context;

promiseSeq(
  startPeer,
  () => setDataHash('context')

).then(() => {

  objs.composer = {
      '@context': { '/': hashes.context },
      '@type': 'Person',
      email: 'composer@example.com',
      name: 'composer',
      url: 'http://composer.com'
  }

  objs.lyricist = {
      '@context': { '/': hashes.context },
      '@type': 'Person',
      email: 'lyricist@example.com',
      name: 'lyricist',
      url: 'http://lyricist.com'
  }

  objs.performer = {
      '@context': { '/': hashes.context },
      '@type': 'MusicGroup',
      email: 'performer@example.com',
      name: 'performer',
      sameAs: ['http://bandcamp-page.com'],
      url: 'http://performer.com'
  }

  objs.producer = {
      '@context': { '/': hashes.context },
      '@type': 'Person',
      name: 'producer',
      sameAs: ['http://soundcloud-page.com'],
      url: 'http://producer.com'
  }

  objs.publisher = {
      '@context': { '/': hashes.context },
      '@type': 'Organization',
      email: 'publisher@example.com',
      name: 'publisher',
      url: 'http://publisher.com'
  }

  objs.recordLabel = {
      '@context': { '/': hashes.context },
      '@type': 'Organization',
      email: 'recordLabel@example.com',
      name: 'recordLabel',
      url: 'http://recordLabel.com'
  }

  writeFileSync(__dirname + '/party/composer.json', JSON.stringify(objs.composer));
  writeFileSync(__dirname + '/party/lyricist.json', JSON.stringify(objs.lyricist));
  writeFileSync(__dirname + '/party/performer.json', JSON.stringify(objs.performer));
  writeFileSync(__dirname + '/party/producer.json', JSON.stringify(objs.producer));
  writeFileSync(__dirname + '/party/publisher.json', JSON.stringify(objs.publisher));
  writeFileSync(__dirname + '/party/recordLabel.json', JSON.stringify(objs.recordLabel));

  return promiseSeq(
    () => setDataHash('composer'),
    () => setDataHash('lyricist'),
    () => setDataHash('performer'),
    () => setDataHash('producer'),
    () => setDataHash('publisher'),
    () => setDataHash('recordLabel'),
    () => setFileHash('/test.mp3'),
    () => setFileHash('/test.png')
  );

}).then(() => {

    objs.audio = {
        '@context': { '/': hashes.context },
        '@type': 'AudioObject',
        contentUrl:  { '/': hashes['/test.mp3'] },
        encodingFormat: 'mp3'
    }

    objs.composition = {
        '@context': { '/': hashes.context },
        '@type': 'MusicComposition',
        composer: [{ '/': hashes.composer }],
        iswcCode: 'T-034.524.680-1',
        lyricist: [{ '/': hashes.lyricist }],
        name: 'song-title',
        publisher: [{ '/': hashes.publisher }]
    }

    objs.image = {
        '@context': { '/': hashes.context },
        '@type': 'ImageObject',
        contentUrl: { '/': hashes['/test.png'] },
        encodingFormat: 'png'
    }

    writeFileSync(__dirname + '/meta/composition.json', JSON.stringify(objs.composition));
    writeFileSync(__dirname + '/meta/audio.json', JSON.stringify(objs.audio));
    writeFileSync(__dirname + '/meta/image.json', JSON.stringify(objs.image));

    return promiseSeq(
        () => setDataHash('audio'),
        () => setDataHash('composition'),
        () => setDataHash('image')
    );

}).then(() => {

    objs.recording = {
        '@context': { '/': hashes.context },
        '@type': 'MusicRecording',
        audio: [{ '/': hashes.audio }],
        byArtist: [{ '/': hashes.performer }],
        producer: [{ '/': hashes.producer }],
        recordingOf: { '/': hashes.composition },
        recordLabel: [{ '/': hashes.recordLabel }]
    }

    writeFileSync(__dirname + '/meta/recording.json', JSON.stringify(objs.recording));

    return setDataHash('recording');

}).then(() => {

    objs.album = {
        '@context': { '/': hashes.context },
        '@type': 'MusicAlbum',
        albumProductionType: 'DemoAlbum',
        albumReleaseType: 'SingleRelease',
        byArtist: [{ '/': hashes.performer }],
        image: { '/': hashes.image },
        name: 'ding ding dooby doo',
        producer: [{ '/': hashes.producer }],
        track: [{ '/': hashes.recording }]
    }

    objs.playlist = {
      '@context': { '/': hashes.context },
      '@type': 'MusicPlaylist',
      image: { '/': hashes.image },
      name: 'just 1 song',
      track: [{ '/': hashes.recording }]
    }

    writeFileSync(__dirname + '/meta/album.json', JSON.stringify(objs.album));
    writeFileSync(__dirname + '/meta/playlist.json', JSON.stringify(objs.playlist));

    return setDataHash('album');

}).then(() => {

  objs.release = {
    '@context': { '/': hashes.context },
    '@type': 'MusicRelease',
    musicReleaseFormat: 'DigitalFormat',
    recordLabel: [{ '/': hashes.recordLabel }],
    releaseOf: { '/': hashes.album }
  }

  writeFileSync(__dirname + '/meta/release.json', JSON.stringify(objs.release));

  return setDataHash('release');

}).then(() => {

  objs.compositionCopyright = {
    '@context': { '/': hashes.context },
    '@type': 'Copyright',
    rightsOf: { '/': hashes.composition },
    territory: {
      '@type': 'Place',
      name: 'US'
    },
    validFrom: '2018-01-01T00:00:00Z',
    validThrough: '2088-01-01T00:00:00Z'
  }

  objs.compositionLicense = {
    '@context': { '/': hashes.context },
    '@type': 'CreativeWork',
    text: 'some text for composition license...'
  }

  objs.compositionRightContract = {
    '@context': { '/': hashes.context },
    '@type': 'CreativeWork',
    text: 'some text saying composition right is assigned to publisher...'
  }

  objs.recordingCopyright = {
    '@context': { '/': hashes.context },
    '@type': 'Copyright',
    rightsOf: { '/': hashes.recording },
    territory: {
      '@type': 'Place',
      name: 'US'
    },
    validFrom: '2017-10-01T00:00:00Z',
    validTo: '2076-10-01T00:00:00Z'
  }

  objs.recordingLicense = {
    '@context': { '/': hashes.context },
    '@type': 'CreativeWork',
    text: 'some text for recording license...'
  }

  objs.recordingRightContract =  {
    '@context': { '/': hashes.context },
    '@type': 'CreativeWork',
    text: 'some text saying recording right is assigned to record label...'
  }

  writeFileSync(__dirname + '/coala/composition-copyright.json', JSON.stringify(objs.compositionCopyright));
  writeFileSync(__dirname + '/coala/composition-license.json', JSON.stringify(objs.compositionLicense));
  writeFileSync(__dirname + '/coala/composition-right-contract.json', JSON.stringify(objs.compositionRightContract));

  writeFileSync(__dirname + '/coala/recording-copyright.json', JSON.stringify(objs.recordingCopyright));
  writeFileSync(__dirname + '/coala/recording-license.json', JSON.stringify(objs.recordingLicense));
  writeFileSync(__dirname + '/coala/recording-right-contract.json', JSON.stringify(objs.recordingRightContract));

  return promiseSeq(
    () => setDataHash('compositionCopyright'),
    () => setDataHash('compositionLicense'),
    () => setDataHash('compositionRightContract'),
    () => setDataHash('recordingCopyright'),
    () => setDataHash('recordingLicense'),
    () => setDataHash('recordingRightContract')
  );

}).then(() => {

  objs.compositionCopyrightAssertion = {
    '@context': { '/': hashes.context },
    '@type': 'ReviewAction',
    asserter: { '/': hashes.composer },
    assertionSubject: { '/': hashes.compositionCopyright },
    assertionTruth: true
  }

  objs.compositionRight = {
    '@context': { '/': hashes.context },
    '@type': 'Right',
    exclusive: true,
    license: { '/': hashes.compositionLicense },
    percentageShares: 70,
    rightContext: ['commercial'],
    territory: {
      '@type': 'Place',
      name: 'US'
    },
    usageType: ['publish'],
    source: { '/': hashes.compositionCopyright },
    validFrom: '2018-01-01T00:00:00Z',
    validThrough: '2068-01-01T00:00:00Z'
  }

  objs.compositionRightAssignment = {
    '@context': { '/': hashes.context },
    '@type': 'RightsTransferAction',
    transferContract: { '/': hashes.compositionRightContract }
  }

  objs.recordingCopyrightAssertion = {
    '@context': { '/': hashes.context },
    '@type': 'ReviewAction',
    asserter: { '/': hashes.performer },
    assertionSubject: { '/': hashes.recordingCopyright },
    assertionTruth: false,
    error: 'validThrough'
  }

  objs.recordingRight = {
    '@context': { '/': hashes.context },
    '@type': 'Right',
    exclusive: true,
    license: { '/': hashes.recordingLicense },
    percentageShares: 60,
    rightContext: ['commercial'],
    territory: {
      '@type': 'Place',
      name: 'US'
    },
    usageType: ['play', 'sell'],
    source: { '/': hashes.recordingCopyright },
    validFrom: '2017-10-01T00:00:00Z',
    validThrough: '2057-10-01T00:00:00Z'
  }

  objs.recordingRightAssignment = {
    '@context': { '/': hashes.context },
    '@type': 'RightsTransferAction',
    transferContract: { '/': hashes.recordingRightContract }
  }

  writeFileSync(__dirname + '/coala/composition-copyright-assertion.json', JSON.stringify(objs.compositionCopyrightAssertion));
  writeFileSync(__dirname + '/coala/composition-right.json', JSON.stringify(objs.compositionRight));
  writeFileSync(__dirname + '/coala/composition-right-assignment.json', JSON.stringify(objs.compositionRightAssignment));
  writeFileSync(__dirname + '/coala/recording-copyright-assertion.json', JSON.stringify(objs.recordingCopyrightAssertion));
  writeFileSync(__dirname + '/coala/recording-right.json', JSON.stringify(objs.recordingRight));
  writeFileSync(__dirname + '/coala/recording-right-assignment.json', JSON.stringify(objs.recordingRightAssignment));

  console.log(hashes.context);

  return promiseSeq(
    () => setDataHash('compositionCopyrightAssertion'),
    () => setDataHash('compositionRight'),
    () => setDataHash('compositionRightAssignment'),
    () => setDataHash('recordingCopyrightAssertion'),
    () => setDataHash('recordingRight'),
    () => setDataHash('recordingRightAssignment')
  );

}).then(() => console.log('done'));
