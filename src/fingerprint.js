'use strict';

const fpcalc = require('fpcalc');

// @flow

/**
 * @module constellate/src/fingerprint.js
 */

module.exports = function() {
  this.calculate = (filepath: string, length: number): Promise<Object> => {
    const options : Object = {};
    if (length) Object.assign(options, { length });
    return new Promise((resolve, reject) => {
      fpcalc(filepath, options, (err, result) => {
        if (err) return reject(err);
        const encoded = result.fingerprint;
        this.decode(encoded);
        resolve({
          '@context': 'http://coalaip.org/',
          '@type': 'DigitalFingerprint',
          fingerprint: encoded
        });
      });
    });
  }
  this.decode = (encoded: string) => {
    if (this.raw && this.raw().length) {
      console.warn('overwriting raw fingerprint');
    }
    const ui8 = base64Decode(Buffer.from(encoded));
    const raw = decompress(ui8);
    this.raw = (): Uint32Array => raw;
  }
  this.encode = (): string => {
    if (!this.raw || !this.raw().length) {
      throw new Error('could not get raw fingerprint');
    }
    const compressed = compress(1, this.raw());
    return base64Encode(compressed).toString();
  }
  this.match = (other: Object): Object => {
    if (!this.raw || !this.raw().length) {
      throw new Error('could not get this raw fingerprint');
    }
    if (!other.raw || !other.raw().length) {
      throw new Error('could not get other raw fingerprint');
    }
    return match(10.0, this.raw(), other.raw());
  }
}

function popcnt(x: number): number {
  return ((x >>> 0).toString(2).match(/1/g) || []).length;
}

function add(arr: any[], i: number, x: number) {
  if (i < arr.length) arr[i] = x;
  arr.push(x);
}

function hammingDistance(x1: number, x2: number): number {
  let bits1 = (x1 >>> 0).toString(2);
  let bits2 = (x2 >>> 0).toString(2);
  if (bits1.length > bits2.length) {
    bits2 = '0'.repeat(bits1.length - bits2.length) + bits2;
  } else if (bits1.length < bits2.length) {
    bits1 = '0'.repeat(bits2.length - bits1.length) + bits1;
  }
  return Array.from(bits1).reduce((result, bit, i) => {
    if (bit !== bits2[i]) result++;
    return result;
  }, 0);
}

/*

The following code is adapted from https://github.com/acoustid/chromaprint/

---------------------------------- LICENSE ----------------------------------

MIT License

Copyright (C) 2010-2016  Lukas Lalinsky

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/base64.h

function getBase64EncodedSize(size: number): number {
  return (size * 4 + 2) / 3;
}

function getBase64DecodedSize(size: number): number {
  return size * 3 / 4;
}

function base64Encode(input: Uint8Array, terminate?: bool): Buffer {
  const kBase64Chars = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_');
  let size = input.length;
  const output = Buffer.alloc(getBase64EncodedSize(size));
  let i = 0, j = 0;
  while (size >= 3) {
    output[i++] = kBase64Chars[(input[j] >> 2) & 63];
    output[i++] = kBase64Chars[((input[j] << 4 ) | (input[j+1] >> 4)) & 63];
    output[i++] = kBase64Chars[((input[j+1] << 2) | (input[j+2] >> 6)) & 63];
    output[i++] = kBase64Chars[input[j+2] & 63];
    j += 3;
    size -= 3;
  }
  if (size) {
    output[i++] = kBase64Chars[(input[j] >> 2) & 63];
    if (size === 1) {
      output[i++] = kBase64Chars[(input[j] << 4) & 63];
    }
    if (size === 2) {
      output[i++] = kBase64Chars[((input[j] << 4) | (input[j+1] >> 4)) & 63];
      output[i++] = kBase64Chars[(input[j+1] << 2) & 63];
    }
  }
  if (terminate) output[i] = '\0'.charCodeAt(0);
  return output;
}

function base64Decode(input: Buffer): Uint8Array {
  const kBase64CharsReversed = [
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 62, 0, 0,
  	52,	53, 54, 55, 56, 57, 58, 59,
  	60, 61, 0, 0, 0, 0, 0, 0,

  	0, 0, 1, 2, 3, 4, 5, 6,
  	7, 8, 9, 10, 11, 12, 13, 14,
  	15, 16, 17, 18, 19,	20, 21, 22,
  	23, 24, 25, 0, 0, 0, 0, 63,
  	0, 26, 27, 28, 29, 30, 31, 32,
  	33,	34, 35, 36, 37,	38, 39, 40,
  	41,	42, 43, 44, 45, 46, 47, 48,
  	49,	50, 51, 0, 0, 0, 0, 0,

  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,

  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0,
  	0, 0, 0, 0, 0, 0, 0, 0
  ];
  let size = input.length;
  const output = new Uint8Array(getBase64DecodedSize(size));
  let i = 0, j = 0;
  while (size >= 4) {
    output[i++] = (kBase64CharsReversed[input[j] & 255] << 2) | (kBase64CharsReversed[input[j+1] & 255] >> 4);
    output[i++] = ((kBase64CharsReversed[input[j+1] & 255] << 4) & 255) | (kBase64CharsReversed[input[j+2] & 255] >> 2);
    output[i++] = ((kBase64CharsReversed[input[j+2] & 255] << 6) & 255) | kBase64CharsReversed[input[j+3] & 255];
    j += 4;
    size -=4;
  }
  if (size >= 2) {
    output[i++] = (kBase64CharsReversed[input[j] & 255] << 2) | (kBase64CharsReversed[input[j+1] & 255] >> 4);
    if (size === 3) {
      output[i] = ((kBase64CharsReversed[input[j+1] & 255] << 4) & 255) | (kBase64CharsReversed[input[j+2] & 255] >> 2);
    }
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_compressor.cpp

const kNormalBits = 3;
const kMaxNormalValue = (1 << kNormalBits) - 1;

function compress(algorithm: number, input: Uint32Array): Uint8Array {
  const size = input.length;
  let normalBits = [], exceptionalBits = [];
  if (size) {
    normalBits = new Array(size);
    exceptionalBits = new Array(Math.round(size / 10));
    let bit, lastBit, x, value;
    let i, j = 0, k = 0;
    for (i = 0; i < size; i++) {
      bit = 1;
      lastBit = 0;
      x = input[i];
      if (i) x ^= input[i-1];
      while (!!x) {
        if (x & 1) {
          if ((value = bit - lastBit) >= kMaxNormalValue) {
            add(normalBits, j++, kMaxNormalValue);
            add(exceptionalBits, k++, value - kMaxNormalValue);
          } else {
            add(normalBits, j++, value);
          }
          lastBit = bit;
        }
        x >>>= 1;
        bit++;
      }
      add(normalBits, j++ , 0);
    }
    normalBits = normalBits.slice(0, j);
    exceptionalBits = exceptionalBits.slice(0, k);
  }
  const packedInt3ArraySize = getPackedInt3ArraySize(normalBits.length);
  const output = new Uint8Array(4 + packedInt3ArraySize + getPackedInt5ArraySize(exceptionalBits.length));
  output[0] = algorithm & 255;
  output[1] = (size >> 16) & 255;
  output[2] = (size >> 8) & 255;
  output[3] = size & 255;
  output.set(packInt3Array(Uint8Array.from(normalBits)), 4);
  output.set(packInt5Array(Uint8Array.from(exceptionalBits)), 4 + packedInt3ArraySize);
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_decompressor.cpp

const kExceptionBits = 5;

function decompress(input: Uint8Array): Uint32Array {
  const size = input.length;
  if (size < 4) {
    throw new Error('fingerprint cannot be shorter than 4 bytes');
  }
  const algorithm = input[0];
  const numValues = (input[1] << 16) | (input[2] << 8) | input[3];
  let offset = 4;
  let bits = unpackInt3Array(input.slice(offset));
  let foundValues = 0, i, numExceptionalBits = 0;
  for (i = 0; i < bits.length; i++) {
    if (!bits[i]) {
      if (++foundValues === numValues) {
        bits = bits.slice(0, i+1);
        break;
      }
    } else if (bits[i] === kMaxNormalValue) {
      numExceptionalBits++;
    }
  }
  if (foundValues !== numValues) {
    throw new Error('fingerprint is too short, not enough data for normal bits');
  }
  offset += getPackedInt3ArraySize(bits.length);
  if (size + 1 < Math.floor(offset + getPackedInt5ArraySize(numExceptionalBits))) {
    throw new Error('fingerprint is too short, not enough data for exceptional bits');
  }
  if (numExceptionalBits) {
    const exceptionalBits = unpackInt5Array(input.slice(offset));
    let j = 0;
    for (i = 0; i < bits.length; i++) {
      if (bits[i] === kMaxNormalValue) {
        bits[i] += exceptionalBits[j++];
      }
    }
  }
  return unpackBits(bits, numValues);
}

function unpackBits(bits: Uint8Array, size: number): Uint32Array {
  const output = new Uint32Array(size).map(() => -1);
  let bit = 0, value = 0;
  let i = 0, j;
  for (j = 0; j < bits.length; j++) {
    if (!bits[j]) {
      output[i] = (!i ? value : output[i-1] ^ value);
      bit = 0;
      value = 0;
      i++;
      continue;
    }
    bit += bits[j];
    value |= 1 << (bit - 1);
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/pack_int3_array.h

function getPackedInt3ArraySize(size: number): number {
  return (size * 3 + 7) / 8;
}

function packInt3Array(input: Uint8Array): Uint8Array {
  let size = input.length;
  const output = new Uint8Array(getPackedInt3ArraySize(size));
  let i = 0, j = 0;
  while (size >= 8) {
    output[i++] = (input[j] & 0x07) | ((input[j+1] & 0x07) << 3) | ((input[j+2] & 0x03) << 6);
    output[i++] = ((input[j+2] & 0x04) >> 2) | ((input[j+3] & 0x07) << 1) | ((input[j+4] & 0x07) << 4) | ((input[j+5] & 0x01) << 7);
    output[i++] = ((input[j+5] & 0x06) >> 1) | ((input[j+6] & 0x07) << 2) | ((input[j+7] & 0x07) << 5);
    j += 8;
    size -= 8;
  }
  if (size >= 1) {
    output[i] = input[j] & 0x07;
  }
  if (size >= 2) {
    output[i] |= (input[j+1] & 0x07) << 3;
  }
  if (size >= 3) {
    output[i++] |= (input[j+2] & 0x03) << 6;
    output[i] = (input[j+2] & 0x04) >> 2;
  }
  if (size >= 4) {
    output[i] |= (input[j+3] & 0x07) << 1;
  }
  if (size >= 5) {
    output[i] |= (input[j+4] & 0x07) << 4;
  }
  if (size >= 6) {
    output[i++] |= (input[j+5] & 0x01) << 7;
    output[i] = (input[j+5] & 0x06) >> 1;
  }
  if (size === 7) {
    output[i] |= (input[j+6] & 0x07) << 2;
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/pack_int5_array.h

function getPackedInt5ArraySize(size: number): number {
  return (size * 5 + 7) / 8;
}

function packInt5Array(input: Uint8Array): Uint8Array {
  let size = input.length;
  const output = new Uint8Array(getPackedInt5ArraySize(size));
  let i = 0, j = 0;
  while (size >= 8) {
    output[i++] = (input[j] & 0x1f) | ((input[j+1] & 0x07) << 5);
    output[i++] = ((input[j+1] & 0x18) >> 3) | ((input[j+2] & 0x1f) << 2) | ((input[j+3] & 0x01) << 7);
    output[i++] = ((input[j+3] & 0x1e) >> 1) | ((input[j+4] & 0x0f) << 4);
    output[i++] = ((input[j+4] & 0x10) >> 4) | ((input[j+5] & 0x1f) << 1) | ((input[j+6] & 0x03) << 6);
    output[i++] = ((input[j+6] & 0x1c) >> 2) | ((input[j+7] & 0x1f) << 3);
    j += 8;
    size -= 8;
  }
  if (size >= 1) {
    output[i] = input[j] & 0x1f;
  }
  if (size >= 2) {
    output[i++] |= (input[j+1] & 0x07) << 5;
    output[i] = (input[j+1] & 0x18) >> 3;
  }
  if (size >= 3) {
    output[i] |= (input[j+2] & 0x1f) << 2;
  }
  if (size >= 4) {
    output[i++] |= (input[j+3] & 0x01) << 7;
    output[i] = (input[j+3] & 0x1e) >> 1;
  }
  if (size >= 5) {
    output[i++] |= (input[j+4] & 0x0f) << 4;
    output[i] = (input[j+4] & 0x10) >> 4;
  }
  if (size >= 6) {
    output[i] |= (input[j+5] & 0x1f) << 1;
  }
  if (size === 7) {
    output[i++] |= (input[j+6] & 0x03) << 6;
    output[i] = (input[j+6] & 0x1c) >> 2;
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/unpack_int3_array.h

function getUnpackedInt3ArraySize(size: number): number {
  return size * 8 / 3;
}

function unpackInt3Array(input: Uint8Array): Uint8Array {
  let size = input.length;
  const output = new Uint8Array(getUnpackedInt3ArraySize(size));
  let i = 0, j = 0;
  while (size >= 3) {
    output[i++] = input[j] & 0x07;
    output[i++] = (input[j] & 0x38) >> 3;
    output[i++] = ((input[j] & 0xc0) >> 6) | ((input[j+1] & 0x01) << 2);
    output[i++] = (input[j+1] & 0x0e) >> 1;
    output[i++] = (input[j+1] & 0x70) >> 4;
    output[i++] = ((input[j+1] & 0x80) >> 7) | ((input[j+2] & 0x03) << 1);
    output[i++] = (input[j+2] & 0x1c) >> 2;
    output[i++] = (input[j+2] & 0xe0) >> 5;
    j += 3;
    size -= 3;
  }
  if (size >= 1) {
    output[i++] = input[j] & 0x07;
    output[i++] = (input[j] & 0x38) >> 3;
  }
  if (size === 2) {
    output[i++] = ((input[j] & 0xc0) >> 6) | ((input[j+1] & 0x01) << 2);
    output[i++] = (input[j+1] & 0x0e) >> 1;
    output[i++] = (input[j+1] & 0x70) >> 4;
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/unpack_int5_array.h

function getUnpackedInt5ArraySize(size: number): number {
  return size * 8 / 5;
}

function unpackInt5Array(input: Uint8Array): Uint8Array {
  let size = input.length;
  const output = new Uint8Array(getUnpackedInt5ArraySize(size));
  let i = 0, j = 0;
  while (size >= 5) {
    output[i++] = input[j] & 0x1f;
    output[i++] = ((input[j] & 0xe0) >> 5) | ((input[j+1] & 0x03) << 3);
    output[i++] = (input[j+1] & 0x7c) >> 2;
    output[i++] = ((input[j+1] & 0x80) >> 7) | ((input[j+2] & 0x0f) << 1);
    output[i++] = ((input[j+2] & 0xf0) >> 4) | ((input[j+3] & 0x01) << 4);
    output[i++] = (input[j+3] & 0x3e) >> 1;
    output[i++] = ((input[j+3] & 0xc0) >> 6) | ((input[j+4] & 0x07) << 2);
    output[i++] = (input[j+4] & 0xf8) >> 3;
    j += 5;
    size -= 5;
  }
  if (size >= 1) {
    output[i++] = input[j] & 0x1f;
  }
  if (size >= 2) {
    output[i++] = ((input[j] & 0xe0) >> 5) | ((input[j+1] & 0x03) << 3);
    output[i++] = (input[j+1] & 0x7c) >> 2;
  }
  if (size >= 3) {
    output[i++] = ((input[j+1] & 0x80) >> 7) | ((input[j+2] & 0x0f) << 1);
  }
  if (size === 4) {
    output[i++] = ((input[j+2] & 0xf0) >> 4) | ((input[j+3] & 0x01) << 4);
    output[i++] = (input[j+3] & 0x3e) >> 1;
  }
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/gaussian_filter.h

function ReflectIterator(size: number) {
  this.forward = true;
  this.pos = 0;
  this.size = size;
  this.moveForward = () => {
    if (this.forward) {
      if (this.pos + 1 === this.size) {
        this.forward = false;
      } else {
        this.pos++;
      }
    } else {
      if (!this.pos) {
        this.forward = true;
      } else {
        this.pos--;
      }
    }
  }
  this.moveBack = () => {
    if (this.forward) {
      if (!this.pos) {
        this.forward = false;
      } else {
        this.pos--;
      }
    } else {
      if (this.pos + 1 === this.size) {
        this.forward = true;
      } else {
        this.pos++;
      }
    }
  }
}

function boxFilter(input: Uint32Array, output: Uint32Array, w: number): Uint32Array {
  const size = input.length;
  if (output.length > size) {
    output = output.slice(0, size);
  }
  if (output.length < size) {
    const tmp = output;
    output = new Uint32Array(size);
    output.set(tmp);
  }
  if (!w || !size) return output;
  const wl = w / 2;
  const wr = w - wl;
  const iter1 = new ReflectIterator(size);
  const iter2 = new ReflectIterator(size);
  let i;
  for (i = 0; i < wl; i++) {
    iter1.moveBack();
    iter2.moveBack();
  }
  let sum = 0;
  for (i = 0; i < w; i++) {
    sum += input[iter2.pos];
    iter2.moveForward();
  }
  if (size > w) {
    for (i = 0; i < wl; i++) {
      output[i] = sum / w;
      sum += input[iter2.pos] - input[iter1.pos];
      iter1.moveForward();
      iter2.moveForward();
    }
    for (i = 0; i < size - w - 1; i++) {
      output[wl+i] = sum / w;
      sum += input[iter2.pos++] - input[iter1.pos++];
    }
    for (i = 0; i < wr + 1; i++) {
      output[size - wr - 1 + i] = sum / w;
      sum += input[iter2.pos] - input[iter1.pos];
      iter1.moveForward();
      iter2.moveForward();
    }
  } else {
    for (i = 0; i < size; i++) {
      output[i] = sum / w;
      sum += input[iter2.pos] - input[iter1.pos];
      iter1.moveForward();
      iter2.moveForward();
    }
  }
  return output;
}

function gaussianFilter(input: Uint32Array, n: number, sigma: number): Uint32Array {
  const w = Math.floor(Math.sqrt(12 * sigma * sigma / n + 1));
  const wl = w - (w % 2 ? 0 : 1);
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let i, output = new Uint32Array([]);
  for (i = 0; i < m; i++) {
    [input, output] = [boxFilter(input, output, wl), input];
  }
  for (; i < n; i++) {
    [input, output] = [boxFilter(input, output, wu), input];
  }
  if (!((m + n) % 2)) output = input;
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/gradient.h

function gradient(input: Uint32Array, size: number): Uint32Array {
  const output = new Uint32Array(size);
  if (input.length <= 1) return output;
  let i = 0, j = 0;
  let f0 = input[i++];
  let f1 = input[i++];
  output[j++] = f1 - f0;
  if (i === input.length) {
    output[j] = f1 - f0;
    return output;
  }
  let f2 = input[i++];
  for ( ; i < input.length; i++) {
    output[j++] = (f2 - f0) / 2;
    [f0, f1, f2] = [f1, f2, input[i]];
  }
  output[j] = f2 - f1;
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_matcher.h

function Segment(pos1: number, pos2: number, duration: number, score: number, leftScore?: number, rightScore?: number) {
  this.pos1 = pos1;
  this.pos2 = pos2;
  this.duration = duration;
  this.score = score;
  if (leftScore) this.leftScore = leftScore;
  else this.leftScore = score;
  if (rightScore) this.rightScore = rightScore;
  else this.rightScore = score;
  this.merge = (other: Object) => {
    if (this.pos1 + this.duration !== other.pos1 ||
        this.pos2 + this.duration !== other.pos2) return;
    const newDuration = this.duration + other.duration;
    const newScore = (this.score * this.duration + other.score * other.duration) / newDuration;
    Object.assign(this, new Segment(this.pos1, this.pos2, newDuration, newScore, score, other.score));
  }
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_matcher.cpp

const ALIGN_BITS = 12;

const alignStrip = x => x >>> (32 - ALIGN_BITS);

function match(matchThreshold: number, raw1: Uint32Array, raw2: Uint32Array): Object {
  const hashShift = 32 - ALIGN_BITS;
  const hashMask = ((1 << ALIGN_BITS) - 1) << hashShift;
  const offsetMask = (1 << (32 - ALIGN_BITS - 1)) - 1;
  const sourceMask = 1 << (32 - ALIGN_BITS - 1);
  if (raw1.length + 1 >= offsetMask) {
    throw new Error('fingerprint 1 is too long');
  }
  if (raw2.length + 1 >= offsetMask) {
    throw new Error('fingerprint 2 is too long');
  }
  const offsets = new Uint32Array(raw1.length + raw2.length);
  let i, j;
  for (i = 0; i < raw1.length; i++) {
    offsets[i] = (alignStrip(raw1[i]) << hashShift) | (i & offsetMask);
  }
  for (i = 0; i < raw2.length; i++) {
    offsets[raw1.length + i] = (alignStrip(raw2[i]) << hashShift) | (i & offsetMask) | sourceMask;
  }
  offsets.sort();
  const histogram = new Uint32Array(raw1.length + raw2.length);
  let hash1, offset1, source1,
      hash2, offset2, source2,
      offsetDiff;
  for (i = 0; i < offsets.length ; i++) {
    source1 = offsets[i] & sourceMask;
    if (source1) continue;
    hash1 = offsets[i] & hashMask;
    offset1 = offsets[i] & offsetMask;
    for (j = i; j < offsets.length; j++) {
      hash2 = offsets[j] & hashMask;
      if (hash1 !== hash2) break;
      offset2 = offsets[j] & offsetMask;
      source2 = offsets[j] & sourceMask;
      if (source2) {
        offsetDiff = offset1 + raw2.length - offset2;
        histogram[offsetDiff]++;
      }
    }
  }
  const bestAlignments = [];
  let count, isPeakLeft, isPeakRight;
  for (i = 0; i < histogram.length; i++) {
    if ((count = histogram[i]) > 1) {
      isPeakLeft = !i || histogram[i-1] <= count;
      isPeakRight = i >= histogram.length - 1 || histogram[i+1] <= count;
      if (isPeakLeft && isPeakRight) {
        bestAlignments.push({ count, i });
      }
    }
  }
  bestAlignments.sort((a, b) => {
    if (a.count > b.count) return -1;
    if (a.count < b.count) return 1;
    return 0;
  });
  const segments = [];
  let bitCounts, duration, size = 0, score;
  for (i = 0; i < bestAlignments.length; i++) {
    offsetDiff = bestAlignments[i].i - raw2.length;
    offset1 = (offsetDiff > 0 ? offsetDiff : 0);
    offset2 = (offsetDiff < 0 ? -offsetDiff : 0);
    size = Math.min(raw1.length - offset1, raw2.length - offset2);
    bitCounts = new Uint32Array(size);
    for (j = 0; j < size; j++) {
      bitCounts[j] = hammingDistance(raw1[offset1+j], raw2[offset2+j]) + Math.random() / 1000;
    }
    const smoothedBitCounts = gaussianFilter(bitCounts, 3, 8.0);
    const g = gradient(smoothedBitCounts, size).map(Math.abs);
    const peaks = [];
    for (i = 0; i < size; i++) {
      if (i && i < size - 1 && g[i] > 0.15 && g[i] >= g[i-1] && g[i] >= g[i+1]) {
        if (!peaks.length || peaks.slice(-1)[0] + 1 < i) {
          peaks.push(i);
        }
      }
    }
    peaks.push(size);
    let added, begin = 0, end, seg;
    for (i = 0; i < peaks.length; i++) {
      end = peaks[i];
      duration = end - begin;
      score = bitCounts.slice(begin, end).reduce((result, x) => {
        return result + x;
      }, 0.0) / duration;
      if (score < matchThreshold) {
        added = false;
        if (segments.length) {
          seg = segments.slice(-1)[0];
          if (Math.abs(seg.score - score) < 0.7) {
            seg.merge(new Segment(offset1 + begin, offset2 + begin, duration, score));
            segments[segments.length - 1] = seg;
            added = true;
          }
        }
        if (!added) {
          segments.push(new Segment(offset1 + begin, offset2 + begin, duration, score));
        }
      }
      begin = end;
    }
    break;
  }
  duration = 0, score = 0;
  for (i = 0; i < segments.length; i++) {
    duration += segments[i].duration;
    score += segments[i].score;
  }
  duration = Math.round(duration / size * 1000) / 10;
  score = Math.round((1 - score / i / matchThreshold) * 1000) / 10;
  return { duration, score };
}
