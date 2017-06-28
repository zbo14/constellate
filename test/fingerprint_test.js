const Fingerprint = require('../lib/fingerprint.js');

const fp1 = new Fingerprint();
const fp2 = new Fingerprint();

const promise = fp1.calculate(/* path to an audio file */);

promise.then(obj => {

  // console.log('Fingerprint 1:', JSON.stringify(obj, null, 2));

  const encoded = fp1.encode();
  if (!encoded) throw new Error('could not get encoded fingerprint');

  const raw = fp1.raw();
  if (!raw) throw new Error('could not get raw fingerprint');

  fp1.decode(encoded);

  if (encoded !== fp1.encode()) throw new Error('different encoded fingerprint after decoding');

  const _raw = fp1.raw();

  if (raw.length !== _raw.length) throw new Error('different raw fingerprint length after decoding');

  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== _raw[i]) throw new Error('different raw fingerprint after decoding');
  }

  return fp2.calculate(/* path to another audio file */);

}).then(obj => {

  // console.log('Fingerprint 2:', JSON.stringify(obj, null, 2));

  const match = fp1.match(fp2);

  console.log('Match:', JSON.stringify(match, null, 2));
  console.log('Done');

}).catch(console.error);
