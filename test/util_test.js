import { assert } from 'chai';
import { describe, it } from 'mocha';
import { orderStringify, writeObject } from '../lib/util.js';

const data = {'b': 1, 'a': {'d': 2, 'c': {'f': 3, 'e': 4}}};
const ordered = {'a': {'c': {'e': 4, 'f': 3}, 'd': 2}, 'b': 1};

describe('Util', () => {
  it('order-stringifies data', () => {
    assert.equal(
      orderStringify(data),
      JSON.stringify(ordered),
      'should order-stringify data'
    );
  });
  it('writes object to stdout', () => {
    writeObject(data, process.stdout);
  });
});
