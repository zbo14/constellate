const { promiseSequence } = require('../lib/gen-util.js');
const IpfsNode = require('../lib/ipfs-node');

const {
  createReadStream,
  readFileSync,
  writeFileSync
} = require('fs');

const data = {};
const hashes = {};

const node = new IpfsNode();

function setDataHash(name) {
  return node.addObject(data[name]).then((cid) => {
    hashes[name] = cid.toBaseEncodedString();
  });
}

function setFileHash(path) {
  const readStream = createReadStream(__dirname + path);
  return node.addFile(readStream, '').then((hash) => {
    hashes[path] = hash;
  });
}

node.start().then(() => {

  data.externalAccount = {
    '@context': 'http://ethon.consensys.net/',
    '@type': 'ExternalAccount',
    accountPublicKey: '0x9679ef1d1b14e180244409421d55875e9c705012e89846546dbb7ceb00e4213797e2e2235b55e51521ad0a468fa05cd2df70dc6d937883cde3bff7bb01b0f43b',
    address: '0xc7b0395675becc4e2947b2a287e9dc1ed3133e61'
  }

  writeFileSync(__dirname + '/ethon/external-account.json', JSON.stringify(data.externalAccount));

  return setDataHash('externalAccount');

}).then(() => {

  data.composer = {
      '@context': 'http://schema.org/',
      '@type': 'Person',
      birthDate: '1995-01-01',
      email: 'composer@example.com',
      familyName: 'lastName',
      givenName: 'firstName',
      url: 'http://composer-homepage.com'
  }

  data.lyricist = {
      '@context': 'http://schema.org/',
      '@type': 'Person',
      birthDate: '1995-01-02',
      email: 'lyricist@example.com',
      familyName: 'smith',
      givenName: 'word',
      url: 'http://lyricist-homepage.com'
  }

  data.performer = {
      '@context': 'http://schema.org/',
      '@type': 'MusicGroup',
      email: 'performer@example.com',
      name: 'performer',
      sameAs: ['http://bandcamp-page.com'],
      url: 'http://performer-homepage.com'
  }

  data.producer = {
      '@context': 'http://schema.org/',
      '@type': 'Person',
      birthDate: '1995-01-03',
      familyName: 'lastName',
      givenName: 'firstName',
      sameAs: ['http://soundcloud-page.com'],
      url: 'http://producer-homepage.com'
  }

  data.publisher = {
      '@context': 'http://schema.org/',
      '@type': 'Organization',
      email: 'publisher@example.com',
      name: 'publisher',
      url: 'http://publisher-homepage.com'
  }

  data.recordLabel = {
      '@context': 'http://schema.org/',
      '@type': 'Organization',
      email: 'recordLabel@example.com',
      name: 'recordLabel'
  }

  writeFileSync(__dirname + '/party/composer.json', JSON.stringify(data.composer));
  writeFileSync(__dirname + '/party/lyricist.json', JSON.stringify(data.lyricist));
  writeFileSync(__dirname + '/party/performer.json', JSON.stringify(data.performer));
  writeFileSync(__dirname + '/party/producer.json', JSON.stringify(data.producer));
  writeFileSync(__dirname + '/party/publisher.json', JSON.stringify(data.publisher));
  writeFileSync(__dirname + '/party/recordLabel.json', JSON.stringify(data.recordLabel));

  return promiseSequence(
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

    data.audio = {
        '@context': 'http://schema.org/',
        '@type': 'AudioObject',
        contentUrl:  { '/': hashes['/test.mp3'] },
        encodingFormat: 'mp3'
    }

    data.composition = {
        '@context': 'http://schema.org/',
        '@type': 'MusicComposition',
        composer: [{ '/': hashes.composer }],
        iswcCode: 'T-034.524.680-1',
        lyricist: [{ '/': hashes.lyricist }],
        name: 'song-title',
        publisher: [{ '/': hashes.publisher }]
    }

    data.image = {
        '@context': 'http://schema.org/',
        '@type': 'ImageObject',
        contentUrl: { '/': hashes['/test.png'] },
        encodingFormat: 'png'
    }

    writeFileSync(__dirname + '/meta/composition.json', JSON.stringify(data.composition));
    writeFileSync(__dirname + '/meta/audio.json', JSON.stringify(data.audio));
    writeFileSync(__dirname + '/meta/image.json', JSON.stringify(data.image));

    return promiseSequence(
        () => setDataHash('audio'),
        () => setDataHash('composition'),
        () => setDataHash('image')
    );

}).then(() => {

    data.recording = {
        '@context': 'http://schema.org/',
        '@type': 'MusicRecording',
        audio: [{ '/': hashes.audio }],
        byArtist: [{ '/': hashes.performer }],
        producer: [{ '/': hashes.producer }],
        recordingOf: { '/': hashes.composition },
        recordLabel: [{ '/': hashes.recordLabel }]
    }

    writeFileSync(__dirname + '/meta/recording.json', JSON.stringify(data.recording));

    return setDataHash('recording');

}).then(() => {

    data.album = {
        '@context': 'http://schema.org/',
        '@type': 'MusicAlbum',
        albumProductionType: 'DemoAlbum',
        albumReleaseType: 'SingleRelease',
        byArtist: [{ '/': hashes.performer }],
        image: { '/': hashes.image },
        name: 'ding ding dooby doo',
        producer: [{ '/': hashes.producer }],
        track: [{ '/': hashes.recording }]
    }

    data.playlist = {
      '@context': 'http://schema.org/',
      '@type': 'MusicPlaylist',
      image: { '/': hashes.image },
      name: 'just 1 song',
      track: [{ '/': hashes.recording }]
    }

    writeFileSync(__dirname + '/meta/album.json', JSON.stringify(data.album));
    writeFileSync(__dirname + '/meta/playlist.json', JSON.stringify(data.playlist));

    return setDataHash('album');

}).then(() => {

  data.release = {
    '@context': 'http://schema.org/',
    '@type': 'MusicRelease',
    musicReleaseFormat: 'DigitalFormat',
    recordLabel: [{ '/': hashes.recordLabel }],
    releaseOf: { '/': hashes.album }
  }

  writeFileSync(__dirname + '/meta/release.json', JSON.stringify(data.release));

  return setDataHash('release');

}).then(() => {
  data.compositionCopyright = {
    '@context': 'http://coalaip.org/',
    '@type': 'Copyright',
    rightsOf: { '/': hashes.composition },
    territory: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        addressCountry: 'US'
      }
    },
    validFrom: '2018-01-01T00:00:00Z',
    validThrough: '2088-01-01T00:00:00Z'
  }

  data.contractAccount = {
    '@context': 'http://ethon.consensys.net/',
    '@type': 'ContractAccount',
    accountCodeHash: 'YZXy2LY8zNi5RffMoaGJBnwNz9QnapUx118dMfeWA+M=',
    address: '0xff2409ea254d83d2fcb6b62b85553d5fb87008fc'
  }

  data.recordingCopyright = {
    '@context': 'http://coalaip.org/',
    '@type': 'Copyright',
    rightsOf: { '/': hashes.recording },
    territory: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        addressCountry: 'US'
      }
    },
    validFrom: '2017-10-01T00:00:00Z',
    validTo: '2076-10-01T00:00:00Z'
  }

  writeFileSync(__dirname + '/coala/composition-copyright.json', JSON.stringify(data.compositionCopyright));
  writeFileSync(__dirname + '/ethon/contract-account.json', JSON.stringify(data.contractAccount));
  writeFileSync(__dirname + '/coala/recording-copyright.json', JSON.stringify(data.recordingCopyright));

  return promiseSequence(
    () => setDataHash('compositionCopyright'),
    () => setDataHash('contractAccount'),
    () => setDataHash('recordingCopyright')
  );

}).then(() => {

  data.compositionCopyrightAssertion = {
    '@context': [
      'http://coalaip.org/',
      'http://schema.org/'
    ],
    '@type': 'ReviewAction',
    asserter: { '/': hashes.composer },
    assertionSubject: { '/': hashes.compositionCopyright },
    assertionTruth: true
  }

  data.compositionRight = {
    '@context': [
      'http://coalaip.org/',
      'http://schema.org/'
    ],
    '@type': 'Right',
    exclusive: true,
    license: { '/': hashes.contractAccount },
    percentageShares: 70,
    rightContext: ['commercial'],
    territory: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        addressCountry: 'US'
      }
    },
    usageType: ['publish'],
    source: { '/': hashes.compositionCopyright },
    validFrom: '2018-01-01T00:00:00Z',
    validThrough: '2068-01-01T00:00:00Z'
  }

  data.compositionRightAssignment = {
    '@context': 'http://coalaip.org/',
    '@type': 'RightsTransferAction',
    transferContract: { '/': hashes.contractAccount }
  }

  data.recordingCopyrightAssertion = {
    '@context': [
      'http://coalaip.org/',
      'http://schema.org/'
    ],
    '@type': 'ReviewAction',
    asserter: { '/': hashes.performer },
    assertionSubject: { '/': hashes.recordingCopyright },
    assertionTruth: false,
    error: 'validThrough'
  }

  data.recordingRight = {
    '@context': [
      'http://coalaip.org/',
      'http://schema.org/'
    ],
    '@type': 'Right',
    exclusive: true,
    license: { '/': hashes.contractAccount },
    percentageShares: 60,
    rightContext: ['commercial'],
    territory: {
      '@type': 'Place',
      geo: {
        '@type': 'GeoCoordinates',
        addressCountry: 'US'
      }
    },
    usageType: ['play', 'sell'],
    source: { '/': hashes.recordingCopyright },
    validFrom: '2017-10-01T00:00:00Z',
    validThrough: '2057-10-01T00:00:00Z'
  }

  data.recordingRightAssignment = {
    '@context': 'http://coalaip.org/',
    '@type': 'RightsTransferAction',
    transferContract: { '/': hashes.contractAccount }
  }

  writeFileSync(__dirname + '/coala/composition-copyright-assertion.json', JSON.stringify(data.compositionCopyrightAssertion));
  writeFileSync(__dirname + '/coala/composition-right.json', JSON.stringify(data.compositionRight));
  writeFileSync(__dirname + '/coala/composition-right-assignment.json', JSON.stringify(data.compositionRightAssignment));
  writeFileSync(__dirname + '/coala/recording-copyright-assertion.json', JSON.stringify(data.recordingCopyrightAssertion));
  writeFileSync(__dirname + '/coala/recording-right.json', JSON.stringify(data.recordingRight));
  writeFileSync(__dirname + '/coala/recording-right-assignment.json', JSON.stringify(data.recordingRightAssignment));

  return promiseSequence(
    () => setDataHash('compositionCopyrightAssertion'),
    () => setDataHash('compositionRight'),
    () => setDataHash('compositionRightAssignment'),
    () => setDataHash('recordingCopyrightAssertion'),
    () => setDataHash('recordingRight'),
    () => setDataHash('recordingRightAssignment')
  );

}).then(() => {

  console.log('Generated data');
  process.exit();

});
