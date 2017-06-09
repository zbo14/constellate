const { Context } = require('../lib/context.js');
const { validate } = require('../lib/linked-data.js');
const { promiseSeq } = require('../lib/util.js');

const {
  createReadStream,
  readFileSync
} = require('fs');

const {
  addFile,
  getCBOR,
  putCBOR,
  startPeer
} = require('../lib/ipfs.js');

const cids = {};
const multihashes = {};
const objs = {};

objs.context = Context;
objs.composer = JSON.parse(readFileSync(__dirname + '/party/composer.json'));
objs.lyricist = JSON.parse(readFileSync(__dirname + '/party/lyricist.json'));
objs.performer = JSON.parse(readFileSync(__dirname + '/party/performer.json'));
objs.producer = JSON.parse(readFileSync(__dirname + '/party/producer.json'));
objs.publisher = JSON.parse(readFileSync(__dirname + '/party/publisher.json'));
objs.recordLabel = JSON.parse(readFileSync(__dirname + '/party/recordLabel.json'));

objs.album = JSON.parse(readFileSync(__dirname + '/meta/album.json'));
objs.audio = JSON.parse(readFileSync(__dirname + '/meta/audio.json'));
objs.composition = JSON.parse(readFileSync(__dirname + '/meta/composition.json'));
objs.image = JSON.parse(readFileSync(__dirname + '/meta/image.json'));
objs.playlist = JSON.parse(readFileSync(__dirname + '/meta/playlist.json'));
objs.recording = JSON.parse(readFileSync(__dirname + '/meta/recording.json'));
objs.release = JSON.parse(readFileSync(__dirname + '/meta/release.json'));

objs.compositionCopyright = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright.json'));
objs.compositionCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/composition-copyright-assertion.json'));
objs.compositionLicense = JSON.parse(readFileSync(__dirname + '/coala/composition-license.json'));
objs.compositionRight = JSON.parse(readFileSync(__dirname + '/coala/composition-right.json'));
objs.compositionRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/composition-right-assignment.json'));
objs.compositionRightContract = JSON.parse(readFileSync(__dirname + '/coala/composition-right-contract.json'));

objs.recordingCopyright = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright.json'));
objs.recordingCopyrightAssertion = JSON.parse(readFileSync(__dirname + '/coala/recording-copyright-assertion.json'));
objs.recordingLicense = JSON.parse(readFileSync(__dirname + '/coala/recording-license.json'));
objs.recordingRight = JSON.parse(readFileSync(__dirname + '/coala/recording-right.json'));
objs.recordingRightAssignment = JSON.parse(readFileSync(__dirname + '/coala/recording-right-assignment.json'));
objs.recordingRightContract = JSON.parse(readFileSync(__dirname + '/coala/recording-right-contract.json'));

function setMultihash(path) {
  const readStream = createReadStream(__dirname + path);
  return addFile(readStream, '').then((result) => {
    const name = path.split('/').pop()
    console.log(name + ' multihash: ' + result.hash);
    multihashes[path] = result.hash;
  });
}

function getCBORAndValidate(name) {
  return getCBOR(cids[name]).then((dagNode) => {
    return validate(dagNode, 'ipld');
  }).then(() => {
    console.log('Validated ' + name);
  });
}

function setCID(name) {
  return putCBOR(objs[name]).then((cid) => {
    console.log(name + ' cid: ' + cid.toBaseEncodedString());
    cids[name] = cid;
  });
}

startPeer().then((info) => {

  console.log('Peer info:', info);

  return promiseSeq(
    () => setCID('context'),
    () => setCID('composer'),
    () => setCID('lyricist'),
    () => setCID('performer'),
    () => setCID('producer'),
    () => setCID('publisher'),
    () => setCID('recordLabel'),
    () => setMultihash('/test.mp3'),
    () => setMultihash('/test.png'),
    () => setCID('album'),
    () => setCID('audio'),
    () => setCID('composition'),
    () => setCID('image'),
    () => setCID('playlist'),
    () => setCID('recording'),
    () => setCID('release'),
    () => setCID('compositionCopyright'),
    () => setCID('compositionCopyrightAssertion'),
    () => setCID('compositionLicense'),
    () => setCID('compositionRight'),
    () => setCID('compositionRightAssignment'),
    () => setCID('compositionRightContract'),
    () => setCID('recordingCopyright'),
    () => setCID('recordingCopyrightAssertion'),
    () => setCID('recordingLicense'),
    () => setCID('recordingRight'),
    () => setCID('recordingRightAssignment'),
    () => setCID('recordingRightContract')
  );

}).then(() => {

  return promiseSeq(
    () => getCBORAndValidate('composition'),
    () => getCBORAndValidate('compositionCopyright'),
    () => getCBORAndValidate('compositionCopyrightAssertion'),
    () => getCBORAndValidate('compositionRight'),
    () => getCBORAndValidate('compositionRightAssignment'),
    () => getCBORAndValidate('recording'),
    () => getCBORAndValidate('recordingCopyright'),
    () => getCBORAndValidate('recordingCopyrightAssertion'),
    () => getCBORAndValidate('recordingRight'),
    () => getCBORAndValidate('recordingRightAssignment'),
    () => getCBORAndValidate('release')
  );

}).then(() => console.log('done'));
