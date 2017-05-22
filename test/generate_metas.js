const { getAddr } = require('../lib/party.js');
const { readFileSync, writeFile } = require('fs');

const {
  AlbumContext,
  AudioContext,
  CompositionContext,
  ImageContext,
  RecordingContext,
  getMetaId, setMetaId
} = require('../lib/meta.js');

const composer = JSON.parse(readFileSync(__dirname +'/parties/composer.json'));
const lyricist = JSON.parse(readFileSync(__dirname +'/parties/lyricist.json'));
const performer = JSON.parse(readFileSync(__dirname +'/parties/performer.json'));
const producer = JSON.parse(readFileSync(__dirname +'/parties/producer.json'));
const publisher = JSON.parse(readFileSync(__dirname +'/parties/publisher.json'));
const recordLabel = JSON.parse(readFileSync(__dirname +'/parties/recordLabel.json'));

setMetaId({
  '@context': CompositionContext,
  '@type': 'Composition',
  composer: [getMetaId(composer)],
  iswcCode: 'T-034.524.680-1',
  lyricist: [getMetaId(lyricist)],
  publisher: [getMetaId(publisher)],
  title: 'fire-song'
}, (composition) => {
  writeFile(__dirname + '/metas/composition.json', JSON.stringify(composition))
  setMetaId({
    '@context': AudioContext,
    '@type': 'Audio',
    contentUrl: 'QmYKAhVW2d4e28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
    encodingFormat: 'mp3'
  }, (audio) => {
    writeFile(__dirname + '/metas/audio.json', JSON.stringify(audio));
    setMetaId({
      '@context': ImageContext,
      '@type': 'Image',
      contentUrl: 'QmYKAhvW2d4f28a7HezzFtsCZ9qsqwv6mrqELrAkrAAwfE',
      encodingFormat: 'png'
    }, (image) => {
      writeFile(__dirname + '/metas/image.json', JSON.stringify(image));
      setMetaId({
        '@context': RecordingContext,
        '@type': 'Recording',
        audio: [getMetaId(audio)],
        performer: [getMetaId(performer)],
        producer: [getMetaId(producer)],
        recordingOf: getMetaId(composition),
        recordLabel: [getMetaId(recordLabel)]
      }, (recording) => {
        writeFile(__dirname + '/metas/recording.json', JSON.stringify(recording));
        setMetaId({
          '@context': AlbumContext,
          '@type': 'Album',
          art: getMetaId(image),
          artist: [performer, producer].map(getAddr),
          productionType: 'DemoAlbum',
          recordLabel: [getAddr(recordLabel)],
          releaseType: 'SingleRelease',
          title: 'ding-ding-dooby-doo',
          track: [getMetaId(recording)]
        }, (album) => {
          writeFile(__dirname + '/metas/album.json', JSON.stringify(album));
        });
      });
    });
  });
});
