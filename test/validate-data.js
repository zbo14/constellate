const { validate } = require('../lib/linked-data.js');
const { promiseSeq } = require('../lib/util.js');

const {
  createReadStream,
  readTestFile
} = require('./fs.js');

const {
  addFile,
  getDAGNode,
  putDAGNode,
  startPeer,
  stopPeer
} = require('../lib/ipfs.js');

const cids = {};
const multihashes = {};
const objs = {};

objs.composer = JSON.parse(readTestFile('/party/composer.json'));
objs.lyricist = JSON.parse(readTestFile('/party/lyricist.json'));
objs.performer = JSON.parse(readTestFile('/party/performer.json'));
objs.producer = JSON.parse(readTestFile('/party/producer.json'));
objs.publisher = JSON.parse(readTestFile('/party/publisher.json'));
objs.recordLabel = JSON.parse(readTestFile('/party/recordLabel.json'));

objs.album = JSON.parse(readTestFile('/meta/album.json'));
objs.audio = JSON.parse(readTestFile('/meta/audio.json'));
objs.composition = JSON.parse(readTestFile('/meta/composition.json'));
objs.image = JSON.parse(readTestFile('/meta/image.json'));
objs.recording = JSON.parse(readTestFile('/meta/recording.json'));
objs.release = JSON.parse(readTestFile('/meta/release.json'));

objs.compositionCopyright = JSON.parse(readTestFile('/coala/composition-copyright.json'));
objs.compositionCopyrightAssertion = JSON.parse(readTestFile('/coala/composition-copyright-assertion.json'));
objs.compositionLicense = JSON.parse(readTestFile('/coala/composition-license.json'));
objs.compositionRight = JSON.parse(readTestFile('/coala/composition-right.json'));
objs.compositionRightAssignment = JSON.parse(readTestFile('/coala/composition-right-assignment.json'));
objs.compositionRightContract = JSON.parse(readTestFile('/coala/composition-right-contract.json'));

objs.recordingCopyright = JSON.parse(readTestFile('/coala/recording-copyright.json'));
objs.recordingCopyrightAssertion = JSON.parse(readTestFile('/coala/recording-copyright-assertion.json'));
objs.recordingLicense = JSON.parse(readTestFile('/coala/recording-license.json'));
objs.recordingRight = JSON.parse(readTestFile('/coala/recording-right.json'));
objs.recordingRightAssignment = JSON.parse(readTestFile('/coala/recording-right-assignment.json'));
objs.recordingRightContract = JSON.parse(readTestFile('/coala/recording-right-contract.json'));

function putFile(path) {
  const readStream = createReadStream(path);
  return addFile(readStream, '').then((result) => {
    const name = path.split('/').pop()
    console.log(name + ' multihash: ' + result.hash);
    multihashes[path] = result.hash;
  });
}

function getCBORAndValidate(name) {
  return getDAGNode(cids[name], 'dag-cbor').then((dagNode) => {
    return validate(dagNode, 'dag-cbor');
  }).then(() => {
    console.log('Validated ' + name);
  });
}

function putCBOR(name) {
  return putDAGNode(objs[name], 'dag-cbor').then((cid) => {
    console.log(name + ' cid: ' + cid.toBaseEncodedString());
    cids[name] = cid;
  });
}

startPeer().then((info) => {

  console.log('Peer info:', info);

  return promiseSeq(
    () => putCBOR('composer'),
    () => putCBOR('lyricist'),
    () => putCBOR('performer'),
    () => putCBOR('producer'),
    () => putCBOR('publisher'),
    () => putCBOR('recordLabel'),
    () => putFile('/test.mp3'),
    () => putFile('/test.png'),
    () => putCBOR('album'),
    () => putCBOR('audio'),
    () => putCBOR('composition'),
    () => putCBOR('image'),
    () => putCBOR('recording'),
    () => putCBOR('release'),
    () => putCBOR('compositionCopyright'),
    () => putCBOR('compositionCopyrightAssertion'),
    () => putCBOR('compositionLicense'),
    () => putCBOR('compositionRight'),
    () => putCBOR('compositionRightAssignment'),
    () => putCBOR('compositionRightContract'),
    () => putCBOR('recordingCopyright'),
    () => putCBOR('recordingCopyrightAssertion'),
    () => putCBOR('recordingLicense'),
    () => putCBOR('recordingRight'),
    () => putCBOR('recordingRightAssignment'),
    () => putCBOR('recordingRightContract')
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
