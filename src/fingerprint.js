const btoa = require('btoa');
const fpcalc = require('fpcalc');

// @flow

/**
 * @module constellate/src/fingerprint.js
 */

module.exports = function(filepath: string, length?: number) {
  this.calculate = (filepath: string, length: number): Promise<Object> => {
    const options = { raw: true };
    if (length) Object.assign(options, { length });
    return new Promise((resolve, reject) => {
      fpcalc(filepath, options, (err, result) => {
        if (err) return reject(err);
        const raw = result.fingerprint;
        const enc = btoa(raw.join(','));
        this.raw = () => raw;
        this.encode = () => enc;
        resolve({
          '@context': [
            'http://coalaip.org/',
            'http://schema.org/'
          ],
          '@type': 'DigitalFingerprint',
          fingerprint: this.encode()
        });
      });
    });
  }
  this.compare = (other: Object): number => {
    if (!this.raw ||!this.raw().length) {
      throw new Error('could not get this raw fingerprint');
    }
    if (!other.raw || !other.raw().length) {
      throw new Error('could not get other raw fingerprint');
    }
    return compare(this.raw, other.raw);
  }
  this.decode = (enc: string) => {
    const raw = atob(enc).split(',');
    this.raw = () => raw;
    this.encode = () => enc;
  }
  this.match = (other: Object): boolean => {
    if (!this.raw ||!this.raw().length) {
      throw new Error('could not get this raw fingerprint');
    }
    if (!other.raw || !other.raw().length) {
      throw new Error('could not get other raw fingerprint');
    }
    return match(/* matchThreshold */, this.raw, other.raw);
  }
}

function popcnt(x: number): number {
  return ((x >>> 0).toString(2).match(/1/g) || []).length;
}

function resize(arr: number[], size: number): number[] {
  if (arr.length >= size) return arr.slice(0, size);
  return arr.concat(Array.apply(null, { length: size-arr.length }).map(() => 0));
}

function hammingDistance(x1: number, x2: number): number {
  const bitseg = (x1 >>> 0).toString(2);
  const bits2 = (x2 >>> 0).toString(2);
  if (bitseg.length !== bits2.length) {
    throw new Error('different number of bits');
  }
  return Array.from(bitseg).reduce((result, bit, i) => {
    if (bit ^ bits2[i]) result++;
    return result;
  }, 0);
}

// from https://gist.github.com/lalinsky/1132166

function compare(raw1: number[], raw2: number[]): number {
  if (!raw1.length || !raw2.length) {
    throw new Error('cannot compare empty fingerprint');
  }
  const diff = raw1.length - raw2.length;
  const errs = [];
  let i, j;
  if (diff) {
    for (i = 0; i <= diff; i++) {
      errs.push(0)
      for (j = 0; j < raw2.length; j++) {
        errs[i] += popcnt(fp1[i+j] ^ fp2[j]);
      }
    }
    return 1 - Math.min(...errs) / 32 / raw2.length;
  }
  for (i = 0; i <= diff; i++) {
    errs.push(0)
    for (j = 0; j < raw1.length; j++) {
      errs[i] += popcnt(fp1[j] ^ fp2[i+j]);
    }
  }
  return 1 - Math.min(...errs) / 32 / raw1.length;
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

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/gaussian_filter.h

function ReflectIterator(size: number) {
  this.forward = true;
  this.pos = 0;
  this.size = size;
  this.moveForward = () => {
    if (this.forward) {
      if (this.pos + 1 < this.size) this.pos++;
      else this.forward = false;
    } else {
      if (this.pos) this.pos--;
      else this.forward = true;
    }
  }
  this.moveBack = () => {
    if (this.forward) {
      if (this.pos) this.pos--;
      else this.forward = false;
    } else {
      if (this.pos + 1 < this.size) this.pos++;
      else this.forward = true;
    }
  }
}

function boxFilter(input: number[], output: number[], w: number): number[] {
  const size = input.length;
  const output = resize(output, size);
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
  let sum;
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

function gaussianFilter(input: number[], n: number, sigma: number): number[] {
  const w = Math.floor(Math.sqrt(12 * sigma * sigma / n + 1));
  const wl = w - (w % 2 ? 0 : 1);
  const wu = wl + 2;
  const m = Math.round((12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4));
  let i = 0, output = [];
  for (; i < m; i++) {
    [input, output] = [boxFilter(input, output, wl), input];
  }
  for (; i < n; i++) {
    [input, output] = [boxFilter(input, output, wu), input];
  }
  if (!((m + n) % 2)) output = input;
  return output;
}

// from https://github.com/acoustid/chromaprint/blob/master/src/utils/gradient.h

function gradient(input: number[]): number[] {
  const output = [];
  if (!input.length) return output;
  let i = 0;
  let f0 = input[i++];
  if (i === input.length) {
    output.push(0)
    return output;
  }
  let f1 = input[i++];
  output.push(f1 - f0);
  if (i === input.length) {
    output.push(f1 - f0);
    return output;
  }
  let f2 = input[i++];
  while(true) {
    output.push((f2 - f0) / 2);
    if (i === input.length) {
      output.push(f2 - f1);
      return output;
    }
    [f0, f1, f2] = [f1, f2, input[i++]];
  }
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_matcher.h

function Segment(pos1: number, pos2: number, duration: number, score: number, leftScore: number, rightScore: number) {
  this.pos1 = pos1;
  this.pos2 = pos2;
  this.duration = duration;
  this.score = score;
  this.leftScore = leftScore;
  this.rightScore = rightScore;
  this.publicScore = (): number => {
    return Math.round(this.score * 100 + 0.5);
  }
  this.merged = (other: Object): Object => {
    if (this.pos1 + this.duration !== other.pos1) {
      throw new Error('this.pos1 + this.duration !== other.pos1');
    }
    if (this.pos2 + this.duration !== other.pos2) {
      throw new Error('this.pos2 + this.duration !== other.pos2');
    }
    const newDuration = this.duration + other.duration;
    const newScore = (this.score * this.duration + other.score * other.duration) / newDuration;
    return new Segment(this.pos1, this.pos2, newDuration, newScore, score, other.score);
  }
}

// from https://github.com/acoustid/chromaprint/blob/master/src/fingerprint_matcher.cpp

const ALIGN_BITS = 12;

const alignStrip = x => x >>> (32 - ALIGN_BITS);

function match(matchThreshold: number, raw1: number[], raw2: number[]): Error {
  const hashShift = 32 - ALIGN_BITS;
  const hashMask = ((1 << ALIGN_BITS) - 1) << hashShift;
  const offsetMask = (1 << (32 - ALIGN_BITS - 1)) - 1;
  const sourceMask = 1 << (32 - ALIGN_BITS - 1);
  if (raw1.length + 1 >= offsetMask) {
    return new Error('fingerprint 1 is too long');
  }
  if (raw2.length + 1 >= offsetMask) {
    return new Error('fingerprint 2 is too long');
  }
  const offsets = [];
  let i, j;
  for (i = 0; i < raw1.length; i++) {
    offsets.push((alignStrip(raw1[i]) << hashShift) | (i & offsetMask));
  }
  for (i = 0; i < raw2.length; i++) {
    offsets.push((alignStrip(raw2[i]) << hashShift) | (i & offsetMask) | sourceMask);
  }
  offsets.sort();
  const histogram = Array.apply(null, { length: raw1.length + raw2.length }).map(() => 0);
  let hash1, offset1, source1,
      hash2, offset2, source2,
      offsetDiff;
  for (i = 0; i < offsets.length ; i++) {
    source1 = offset[i] & sourceMask;
    if (source1) continue;
    hash1 = offsets[i] & hashMask;
    offset1 = offset[i] & offsetMask;
    for (j = i; j < offsets.length; j++) {
      hash2 = offsets[j] & hashMask;
      if (hash1 !== hash2) break;
      offset2 = offsets[j] & offsetMask;
      source2 = offsets[j] & sourceMask;
      if (source2) {
        offsetDiff = offset1 + raw2.length - offset2;
        histogram[offsetDiff]++
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
  let bitCounts, size;
  for (i = 0; i < bestAlignments.length; i++) {
    offsetDiff = bestAlignments[i].i - raw2.length;
    offset1 = offsetDiff > 0 ? offsetDiff : 0;
    offset2 = offsetDiff < 0 ? -offsetDiff : 0;
    size = Math.min(raw1.length - offset1, raw2.length - offset2);
    bitCounts = Array.apply(null, { length: size }).map(() => 0);
    for (j = 0; j < size; j++) {
      bitCounts[j] = hammingDistance(raw1[offset1+j], raw2[offset2+j]) + Math.random() / 1000;
    }
    const smoothedBitCounts = gaussianFilter(bitCounts, 8.0, 3);
    const g = gradient(smoothedBitCounts);
    for (i = 0; i < size; i++) {
      if (gradient[i] < 0) gradient[i] *= -1;
    }
    const peaks = [];
    for (i = 0; i < size; i++) {
      if (i && i < size - 1 && g[i] > 0.15 && g[i] >= g[i-1] && g[i] >= g[i+1]) {
        if (!peaks.length || peaks.slice(-1)[0] + 1 < i) {
          peaks.push(i);
        }
      }
    }
    peaks.push(size);
    let added, begin = 0, duration, end, score, seg;
    for (i = 0; i < peaks.length; i++) {
      end = peaks[i];
      duration = end - begin;
      score = bitCounts.slice(begin, end).reduce((result, x) => {
        return result + x;
      }, 0.0) / duration;
      if (score < matchThreshold) {
        merged = false;
        if (segments.length) {
          seg = segments.slice(-1)[0];
          if (Math.abs(seg.score - score) < 0.7) {
            segments[segments.length-1] = seg.merged(new Segment(offset1 + begin, offset2 + begin, duration, score));
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
  return null;
}
