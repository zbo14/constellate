import { assert } from 'chai';
import { describe, it } from 'mocha';
import { orderStringify } from '../lib/util.js';

const data = {b: 1, a: {d: 2, c: {f: [{ g: 'b'}, { g: 'a'}], e: 4}}};
const ordered = {a: {c: {e: 4, f: [{ g: 'a'}, { g: 'b'}]}, d: 2}, b: 1};

describe('Util', () => {
  it('order-stringifies data', () => {
    assert.equal(
      orderStringify(data),
      JSON.stringify(ordered),
      'should order-stringify data'
    );
  });
});
